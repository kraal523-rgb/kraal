/**
 * coins.js — Kraal coin wallet
 *
 * Routes (all under /api/coins):
 *   GET  /balance                 -> { balance }
 *   GET  /purchase-status?reference=...
 *   POST /buy                     -> start a Paynow payment for a coin pack
 *   POST /paynow/webhook          -> Paynow "resulturl" (server to server, no auth header)
 *   POST /post-listing            -> spend coins to publish a draft listing
 *   POST /accept-job              -> spend coins to claim an open transport job
 *   POST /welcome-bonus           -> one-time free coins
 *
 * Firestore layout (all written ONLY by this Worker via the service account):
 *   wallets/{uid}              { uid, balance, updatedAt }
 *   coinTransactions/{id}      ledger, id is deterministic => idempotent
 *   coinPurchases/{reference}  Paynow payment attempts
 *
 * Atomicity: every money movement is ONE Firestore :commit call. The ledger
 * document is created with an "exists: false" precondition, so a retried
 * webhook or a double tap can never credit/charge twice.
 */

// ─── Config: edit these to match your app ────────────────────────────────────
const PACKS = {
  starter: { coins: 5, price: 2 }, // USD
  standard: { coins: 15, price: 5 },
  pro: { coins: 40, price: 12 },
};
const WELCOME_COINS = 2;
const LISTING_DAYS = 30;

// Your collection / field names (adjust if yours differ)
const LISTINGS = "listings"; // needs: sellerId, status ("draft" -> "active")
const JOBS = "transport_requests"; // the mobile + web apps use this collection; status "open" -> "quoted", driverUid
const JOB_OPEN_STATUS = "open";
const JOB_ASSIGNED_STATUS = "quoted"; // what the apps show as "driver accepted"

function listingCost(listing) {
  const qty = Number(listing.quantity) || 1;
  return qty >= 20 ? 2 : 1; // herds cost more than a single animal
}
function jobCost(job) {
  if (Number.isInteger(job.coinCost) && job.coinCost > 0) return job.coinCost;
  const qty = Number(job.quantity) || 1;
  return qty >= 20 ? 3 : qty >= 5 ? 2 : 1;
}

// ─── Paynow ──────────────────────────────────────────────────────────────────
const PAYNOW_INITIATE =
  "https://www.paynow.co.zw/interface/initiatetransaction";
const PAYNOW_REMOTE = "https://www.paynow.co.zw/interface/remotetransaction";
const PAID_STATUSES = new Set(["paid", "awaiting delivery", "delivered"]);
const FAILED_STATUSES = new Set(["cancelled", "failed"]);
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

async function sha512Hex(str) {
  const buf = await crypto.subtle.digest(
    "SHA-512",
    new TextEncoder().encode(str),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

// Paynow hash = SHA512(all values in message order, concatenated + integration key)
const paynowHash = (entries, key) =>
  sha512Hex(entries.map(([, v]) => v).join("") + key);

async function verifyParams(env, params) {
  const given = (params.get("hash") || "").toUpperCase();
  const entries = [...params.entries()].filter(
    ([k]) => k.toLowerCase() !== "hash",
  );
  const expected = await paynowHash(entries, env.PAYNOW_INTEGRATION_KEY);
  return !!given && given === expected;
}

async function paynowInitiate(env, fields, express) {
  const hash = await paynowHash(fields, env.PAYNOW_INTEGRATION_KEY);
  const res = await fetch(express ? PAYNOW_REMOTE : PAYNOW_INITIATE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams([...fields, ["hash", hash]]).toString(),
  });
  const params = new URLSearchParams(await res.text());
  if (!(await verifyParams(env, params))) {
    throw new Error("Paynow response failed hash check");
  }
  if ((params.get("status") || "").toLowerCase() !== "ok") {
    throw new Error(params.get("error") || "Paynow rejected the request");
  }
  return Object.fromEntries(
    [...params.entries()].map(([k, v]) => [k.toLowerCase(), v]),
  );
}

// ─── Module factory ──────────────────────────────────────────────────────────
export function createCoins({
  requireAuth,
  jsonResponse,
  getAdminToken,
  toFirestoreFields,
  fromFirestoreFields,
}) {
  const dbBase = (env) =>
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)`;
  const docName = (env, path) =>
    `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

  // Read a doc -> { data, updateTime } | null
  async function fsGet(env, path) {
    const token = await getAdminToken(env);
    const res = await fetch(`${dbBase(env)}/documents/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore read failed: ${await res.text()}`);
    const doc = await res.json();
    return {
      data: doc.fields ? fromFirestoreFields(doc.fields) : {},
      updateTime: doc.updateTime,
    };
  }

  // Atomic multi-write
  async function commit(env, writes) {
    const token = await getAdminToken(env);
    const res = await fetch(`${dbBase(env)}/documents:commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ writes }),
    });
    if (res.ok) return { ok: true };
    const err = await res.json().catch(() => ({}));
    return {
      ok: false,
      status: res.status,
      code: err?.error?.status,
      message: err?.error?.message,
    };
  }

  // Write builders
  const updateWrite = (env, path, data, extra = {}) => ({
    update: { name: docName(env, path), fields: toFirestoreFields(data) },
    updateMask: { fieldPaths: Object.keys(data) },
    ...extra,
  });
  const ledgerWrite = (env, ledgerId, entry) => ({
    update: {
      name: docName(env, `coinTransactions/${ledgerId}`),
      fields: toFirestoreFields({ ...entry, createdAt: new Date() }),
    },
    currentDocument: { exists: false },
  });

  async function fsUpdate(env, path, data) {
    const r = await commit(env, [updateWrite(env, path, data)]);
    if (!r.ok) throw new Error(`Firestore write failed: ${r.message}`);
  }

  // ── Credit coins (purchase, welcome bonus, refund) ─────────────────────────
  async function credit(
    env,
    { uid, amount, type, ref, meta = {}, extraWrites = [] },
  ) {
    const ledgerId = `${type}_${ref}`;
    const writes = [
      ledgerWrite(env, ledgerId, { uid, type, amount, ref, ...meta }),
      {
        transform: {
          document: docName(env, `wallets/${uid}`),
          fieldTransforms: [
            {
              fieldPath: "balance",
              increment: { integerValue: String(amount) },
            },
            { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
          ],
        },
      },
      ...extraWrites,
    ];
    const r = await commit(env, writes);
    if (r.ok) return { ok: true };
    // Ledger entry already exists => this was already processed (retry/duplicate)
    if (await fsGet(env, `coinTransactions/${ledgerId}`)) {
      return { ok: true, duplicate: true };
    }
    throw new Error(`Credit failed: ${r.message}`);
  }

  // ── Spend coins + apply an effect, atomically ──────────────────────────────
  // `prepare()` re-reads whatever it needs and returns either
  //   { error: { status, message } }  or  { cost, meta, writes }
  async function spendAndApply(env, uid, ledgerId, type, prepare) {
    const walletPath = `wallets/${uid}`;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (await fsGet(env, `coinTransactions/${ledgerId}`)) {
        return { status: 200, body: { ok: true, duplicate: true } };
      }
      const prep = await prepare();
      if (prep.error) {
        return {
          status: prep.error.status,
          body: { error: prep.error.message },
        };
      }
      const cost = prep.cost;
      const wallet = await fsGet(env, walletPath);
      const balance = wallet?.data?.balance || 0;
      if (!wallet || balance < cost) {
        return {
          status: 402,
          body: {
            error: "Not enough coins",
            code: "INSUFFICIENT_COINS",
            balance,
            required: cost,
          },
        };
      }
      const writes = [
        updateWrite(
          env,
          walletPath,
          { uid, balance: balance - cost, updatedAt: new Date() },
          { currentDocument: { updateTime: wallet.updateTime } },
        ),
        ledgerWrite(env, ledgerId, {
          uid,
          type,
          amount: -cost,
          ref: ledgerId,
          ...(prep.meta || {}),
        }),
        ...prep.writes,
      ];
      const r = await commit(env, writes);
      if (r.ok) {
        return {
          status: 200,
          body: { ok: true, spent: cost, balance: balance - cost },
        };
      }
      // Wallet or target doc changed under us (or real error): re-read and retry
      console.warn("Coin spend commit failed:", r.code, r.message);
    }
    return { status: 409, body: { error: "Please try again" } };
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function buyCoins(request, env, uid, url) {
    const body = await request.json().catch(() => ({}));
    const pack = PACKS[body.packId];
    if (!pack) return { status: 400, body: { error: "Unknown coin pack" } };

    const profile = await fsGet(env, `users/${uid}`);
    const email =
      profile?.data?.email || body.email || env.PAYNOW_AUTH_EMAIL || "";
    if (!email) return { status: 400, body: { error: "An email is required" } };

    const reference = `KRL-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await fsUpdate(env, `coinPurchases/${reference}`, {
      uid,
      packId: body.packId,
      coins: pack.coins,
      amount: pack.price,
      currency: "USD",
      status: "created",
      createdAt: new Date(),
    });

    const apiOrigin = env.PUBLIC_API_URL || url.origin;
    const express = !!(body.method && body.phone); // e.g. method "ecocash"
    const fields = [
      ["id", env.PAYNOW_INTEGRATION_ID],
      ["reference", reference],
      ["amount", pack.price.toFixed(2)],
      ["additionalinfo", `${pack.coins} Kraal coins`],
      ["returnurl", `${env.COINS_RETURN_URL}?reference=${reference}`],
      ["resulturl", `${apiOrigin}/api/coins/paynow/webhook`],
      ["authemail", email],
    ];
    if (express)
      fields.push(
        ["phone", String(body.phone)],
        ["method", String(body.method)],
      );
    fields.push(["status", "Message"]);

    const r = await paynowInitiate(env, fields, express);
    await fsUpdate(env, `coinPurchases/${reference}`, {
      status: "pending",
      pollUrl: r.pollurl,
    });
    return {
      status: 200,
      body: {
        reference,
        redirectUrl: r.browserurl || null, // open in browser for card/web flow
        instructions: r.instructions || null, // shown for EcoCash express flow
      },
    };
  }

  // Never trust the posted values alone: verify hash, then re-poll Paynow
  async function settlePurchase(env, reference) {
    const p = await fsGet(env, `coinPurchases/${reference}`);
    if (!p || p.data.status === "paid" || !p.data.pollUrl) return;

    const res = await fetch(p.data.pollUrl, { method: "POST" });
    const params = new URLSearchParams(await res.text());
    if (!(await verifyParams(env, params))) {
      console.error("Paynow poll failed hash check for", reference);
      return;
    }
    const status = (params.get("status") || "").toLowerCase();

    if (PAID_STATUSES.has(status)) {
      if (Number(params.get("amount")) !== Number(p.data.amount)) {
        console.error("Paynow amount mismatch for", reference);
        await fsUpdate(env, `coinPurchases/${reference}`, {
          status: "amount_mismatch",
        });
        return;
      }
      await credit(env, {
        uid: p.data.uid,
        amount: p.data.coins,
        type: "purchase",
        ref: reference,
        meta: {
          packId: p.data.packId,
          paynowReference: params.get("paynowreference") || "",
        },
        extraWrites: [
          updateWrite(env, `coinPurchases/${reference}`, {
            status: "paid",
            paidAt: new Date(),
            paynowReference: params.get("paynowreference") || "",
          }),
        ],
      });
    } else if (FAILED_STATUSES.has(status)) {
      await fsUpdate(env, `coinPurchases/${reference}`, { status });
    }
  }

  async function handlePaynowWebhook(request, env) {
    const params = new URLSearchParams(await request.text());
    if (!(await verifyParams(env, params))) {
      return new Response("Bad hash", { status: 400 });
    }
    const reference = params.get("reference");
    if (reference && SAFE_ID.test(reference)) {
      await settlePurchase(env, reference);
    }
    return new Response("OK", { status: 200 });
  }

  async function postListing(env, uid, listingId) {
    const path = `${LISTINGS}/${listingId}`;
    return spendAndApply(
      env,
      uid,
      `listing_${listingId}`,
      "post_listing",
      async () => {
        const l = await fsGet(env, path);
        if (!l || l.data.sellerId !== uid) {
          return { error: { status: 404, message: "Listing not found" } };
        }
        if (l.data.status !== "draft") {
          return { error: { status: 409, message: "Listing is not a draft" } };
        }
        const now = new Date();
        return {
          cost: listingCost(l.data),
          meta: { listingId },
          writes: [
            updateWrite(
              env,
              path,
              {
                status: "active",
                publishedAt: now,
                expiresAt: new Date(now.getTime() + LISTING_DAYS * 86400000),
              },
              { currentDocument: { updateTime: l.updateTime } },
            ),
          ],
        };
      },
    );
  }

  async function acceptJob(env, uid, jobId) {
    const driver = await fsGet(env, `transporters/${uid}`);
    if (!driver) return { status: 403, body: { error: "Drivers only" } };

    const path = `${JOBS}/${jobId}`;
    return spendAndApply(env, uid, `job_${jobId}`, "accept_job", async () => {
      const j = await fsGet(env, path);
      if (!j) return { error: { status: 404, message: "Job not found" } };
      if (j.data.status !== JOB_OPEN_STATUS || j.data.driverUid) {
        return { error: { status: 409, message: "Job already taken" } };
      }
      return {
        cost: jobCost(j.data),
        meta: { jobId },
        writes: [
          updateWrite(
            env,
            path,
            {
              status: JOB_ASSIGNED_STATUS,
              driverUid: uid,
              driverName:
                driver.data?.businessName || driver.data?.email || "Driver",
              quotedAt: new Date(),
              updatedAt: new Date(),
            },
            // two drivers racing: only the first commit wins
            { currentDocument: { updateTime: j.updateTime } },
          ),
        ],
      };
    });
  }

  async function welcomeBonus(env, uid) {
    const profile = await fsGet(env, `users/${uid}`);
    const role = profile?.data?.role;
    if (role !== "seller" && role !== "transporter") {
      return {
        status: 403,
        body: { error: "Only sellers and drivers get bonus coins" },
      };
    }
    const r = await credit(env, {
      uid,
      amount: WELCOME_COINS,
      type: "welcome",
      ref: uid,
    });
    return {
      status: 200,
      body: { ok: true, coins: WELCOME_COINS, duplicate: !!r.duplicate },
    };
  }

  // ── Router ─────────────────────────────────────────────────────────────────
  async function route(request, env, url, corsHeaders) {
    const p = url.pathname;
    if (!p.startsWith("/api/coins/")) return null;
    const send = ({ status, body }) => jsonResponse(body, status, corsHeaders);

    // Paynow calls this itself: authenticated by hash, not by a Firebase token
    if (p === "/api/coins/paynow/webhook" && request.method === "POST") {
      return handlePaynowWebhook(request, env);
    }

    const uid = await requireAuth(request, env);
    if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    if (p === "/api/coins/balance" && request.method === "GET") {
      const w = await fsGet(env, `wallets/${uid}`);
      return jsonResponse({ balance: w?.data?.balance || 0 }, 200, corsHeaders);
    }

    if (p === "/api/coins/purchase-status" && request.method === "GET") {
      const ref = url.searchParams.get("reference") || "";
      if (!SAFE_ID.test(ref))
        return jsonResponse({ error: "Bad reference" }, 400, corsHeaders);
      const pur = await fsGet(env, `coinPurchases/${ref}`);
      if (!pur || pur.data.uid !== uid)
        return jsonResponse({ error: "Not found" }, 404, corsHeaders);
      // Poll Paynow if still pending, in case the webhook hasn't landed yet
      if (pur.data.status === "pending") await settlePurchase(env, ref);
      const fresh = await fsGet(env, `coinPurchases/${ref}`);
      return jsonResponse(
        { status: fresh?.data?.status || "unknown" },
        200,
        corsHeaders,
      );
    }

    if (request.method !== "POST") return null;

    if (p === "/api/coins/buy")
      return send(await buyCoins(request, env, uid, url));
    if (p === "/api/coins/welcome-bonus")
      return send(await welcomeBonus(env, uid));

    if (p === "/api/coins/post-listing" || p === "/api/coins/accept-job") {
      const body = await request.json().catch(() => ({}));
      const id = p.endsWith("listing") ? body.listingId : body.jobId;
      if (!SAFE_ID.test(String(id || ""))) {
        return jsonResponse({ error: "Invalid id" }, 400, corsHeaders);
      }
      return send(
        p.endsWith("listing")
          ? await postListing(env, uid, id)
          : await acceptJob(env, uid, id),
      );
    }

    return null;
  }

  // Call from your cancel / escrow logic to return coins to a driver or seller.
  // Idempotent per `ref`, e.g. refund(env, { uid, amount: 2, ref: `job_${jobId}` })
  const refund = (env, { uid, amount, ref }) =>
    credit(env, { uid, amount, type: "refund", ref });

  return { route, refund, credit };
}
