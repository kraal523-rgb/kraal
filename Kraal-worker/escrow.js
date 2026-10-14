// escrow.js — Kraal escrow orders, reservation, Paynow payment, 5% platform fee.
//
// Wire-up (see notes): in worker.js
//   import { createEscrow } from "./escrow.js";
//   const escrow = createEscrow({ requireAuth, jsonResponse, getAdminToken,
//                                 toFirestoreFields, fromFirestoreFields });
// then add routes + a `scheduled` export that calls escrow.sweep(env).
//
// ASSUMPTIONS (change if your data differs):
//   listings/{id}: { sellerId, price (USD, whole listing), status: "active" }
//   sellers/{uid}: optional payout fields: payoutMethod, payoutNumber
//
// Firestore collections written here (server only — deny all client writes):
//   orders/{orderId}          public order state (buyer + seller may read)
//   order_secrets/{orderId}   pickup code + attempts (NO client rule, never readable)
//   payouts/{orderId}         queue for you to pay out sellers

const FEE_RATE = 0.05;
const PAYMENT_WINDOW_MS = 30 * 60 * 1000; // buyer has 30 min to pay
const PICKUP_WINDOW_MS = 72 * 60 * 60 * 1000; // buyer has 72h to arrive after paying
const MAX_CODE_ATTEMPTS = 5;
const PAYOUT_HOLD_MS = 24 * 60 * 60 * 1000; // cooling-off before you can approve a payout

export const STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAID_HELD: "PAID_HELD",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  DISPUTED: "DISPUTED",
  NEEDS_REVIEW: "NEEDS_REVIEW", // paid but pickup window passed — you decide refund/release
};

export function createEscrow(h) {
  const {
    requireAuth,
    jsonResponse,
    getAdminToken,
    toFirestoreFields,
    fromFirestoreFields,
  } = h;

  // ── Firestore REST helpers (with updateTime preconditions for atomicity) ────
  const base = (env) =>
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)`;
  const docName = (env, path) =>
    `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;

  async function getDoc(env, path) {
    const token = await getAdminToken(env);
    const res = await fetch(`${base(env)}/documents/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore get failed: ${await res.text()}`);
    const d = await res.json();
    return {
      data: fromFirestoreFields(d.fields || {}),
      updateTime: d.updateTime,
    };
  }

  // writes: [{ path, data, mask?: string[], precondition?: {updateTime}|{exists} }]
  async function commit(env, writes) {
    const token = await getAdminToken(env);
    const body = {
      writes: writes.map((w) => {
        const out = {
          update: {
            name: docName(env, w.path),
            fields: toFirestoreFields(w.data),
          },
        };
        if (w.mask) out.updateMask = { fieldPaths: w.mask };
        if (w.precondition) out.currentDocument = w.precondition;
        return out;
      }),
    };
    const res = await fetch(`${base(env)}/documents:commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = new Error(`Firestore commit failed: ${await res.text()}`);
      err.conflict = res.status === 409 || res.status === 400; // precondition failed
      throw err;
    }
    return res.json();
  }

  async function queryByStatus(env, collection, status) {
    const token = await getAdminToken(env);
    const res = await fetch(`${base(env)}/documents:runQuery`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath: "status" },
              op: "EQUAL",
              value: { stringValue: status },
            },
          },
          limit: 200,
        },
      }),
    });
    if (!res.ok) throw new Error(`Firestore query failed: ${await res.text()}`);
    const rows = await res.json();
    return rows
      .filter((r) => r.document?.fields)
      .map((r) => ({
        id: r.document.name.split("/").pop(),
        data: fromFirestoreFields(r.document.fields),
        updateTime: r.document.updateTime,
      }));
  }

  // ── Utilities ───────────────────────────────────────────────────────────────
  const newId = () =>
    [...crypto.getRandomValues(new Uint8Array(12))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  const newCode = () => {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
    return String(n).padStart(6, "0");
  };

  const calcFee = (amountCents) => {
    const feeCents = Math.round(amountCents * FEE_RATE);
    return { feeCents, payoutCents: amountCents - feeCents };
  };

  async function sha512Upper(str) {
    const buf = await crypto.subtle.digest(
      "SHA-512",
      new TextEncoder().encode(str),
    );
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }

  // ── Paynow ──────────────────────────────────────────────────────────────────
  // Hash = SHA512(all values in order, no separators + integration key), uppercase.
  async function paynowSign(fields, key) {
    return sha512Upper(Object.values(fields).join("") + key);
  }

  async function paynowVerify(entries, key) {
    // entries: [[k,v],...] in received order
    const hash = entries.find(([k]) => k.toLowerCase() === "hash")?.[1] || "";
    const concat = entries
      .filter(([k]) => k.toLowerCase() !== "hash")
      .map(([, v]) => v)
      .join("");
    return (await sha512Upper(concat + key)) === hash.toUpperCase();
  }

  async function paynowInitiate(env, order, orderId, buyerEmail, phone) {
    const mobile = !!phone;
    const fields = {
      id: env.PAYNOW_ID,
      reference: orderId,
      amount: (order.amountCents / 100).toFixed(2),
      additionalinfo: `Kraal order ${orderId}`,
      returnurl: `${env.APP_RETURN_URL || "https://kraalmarket.com/orders"}/${orderId}`,
      resulturl: `${env.WORKER_PUBLIC_URL}/api/paynow/result`,
      authemail: buyerEmail || "payments@kraalmarket.com",
    };
    if (mobile) {
      fields.phone = phone;
      fields.method = "ecocash";
    }
    fields.status = "Message";
    const hash = await paynowSign(fields, env.PAYNOW_KEY);

    const endpoint = mobile
      ? "https://www.paynow.co.zw/interface/remotetransaction"
      : "https://www.paynow.co.zw/interface/initiatetransaction";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...fields, hash }).toString(),
    });
    const entries = [...new URLSearchParams(await res.text()).entries()];
    const map = Object.fromEntries(
      entries.map(([k, v]) => [k.toLowerCase(), v]),
    );

    if ((map.status || "").toLowerCase() !== "ok") {
      throw new Error(`Paynow rejected: ${map.error || "unknown error"}`);
    }
    if (!(await paynowVerify(entries, env.PAYNOW_KEY))) {
      throw new Error("Paynow response hash invalid");
    }
    return {
      pollUrl: map.pollurl,
      browserUrl: map.browserurl,
      instructions: map.instructions,
    };
  }

  async function paynowPoll(env, pollUrl) {
    const res = await fetch(pollUrl, { method: "POST" });
    const entries = [...new URLSearchParams(await res.text()).entries()];
    if (!(await paynowVerify(entries, env.PAYNOW_KEY))) return null;
    return Object.fromEntries(entries.map(([k, v]) => [k.toLowerCase(), v]));
  }

  // ── POST /api/orders/create  { listingId, phone? } ──────────────────────────
  // Reserves the listing and creates the order in ONE atomic commit, so two
  // buyers can never both reserve the same listing.
  async function createOrder(request, env, cors) {
    const uid = await requireAuth(request, env);
    if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, cors);

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400, cors);
    }
    const { listingId, phone } = body;
    if (!listingId)
      return jsonResponse({ error: "listingId required" }, 400, cors);

    const listing = await getDoc(env, `listings/${listingId}`);
    if (!listing)
      return jsonResponse({ error: "Listing not found" }, 404, cors);
    const l = listing.data;

    if (l.status !== "active") {
      return jsonResponse({ error: "Listing is not available" }, 409, cors);
    }
    if (l.sellerId === uid) {
      return jsonResponse(
        { error: "You cannot buy your own listing" },
        400,
        cors,
      );
    }

    // Fake-farmer gate: money is only taken for sellers whose ID + selfie check passed
    // (state is written by /api/verify/submit, or set to "approved" by you after manual review).
    const verif = await getDoc(
      env,
      `sellers/${l.sellerId}/verification/status`,
    );
    if (verif?.data.state !== "approved") {
      return jsonResponse(
        {
          error:
            "This seller is not verified yet, so escrow purchases are unavailable.",
        },
        403,
        cors,
      );
    }

    // Price comes from the server copy of the listing — never from the client.
    const amountCents = Math.round(Number(l.price) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return jsonResponse({ error: "Listing has no valid price" }, 400, cors);
    }
    const { feeCents, payoutCents } = calcFee(amountCents);

    const orderId = newId();
    const now = Date.now();
    const order = {
      orderId,
      listingId,
      listingTitle: l.title || "",
      buyerId: uid,
      sellerId: l.sellerId,
      amountCents,
      feeCents,
      payoutCents,
      currency: "USD",
      status: STATUS.PENDING_PAYMENT,
      reservedUntil: now + PAYMENT_WINDOW_MS,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await commit(env, [
        // Fails if anyone changed the listing since we read it
        {
          path: `listings/${listingId}`,
          data: { status: "reserved", reservedBy: orderId, reservedAt: now },
          mask: ["status", "reservedBy", "reservedAt"],
          precondition: { updateTime: listing.updateTime },
        },
        {
          path: `orders/${orderId}`,
          data: order,
          precondition: { exists: false },
        },
        {
          path: `order_secrets/${orderId}`,
          data: {
            pickupCode: newCode(),
            codeAttempts: 0,
            buyerId: uid,
            sellerId: l.sellerId,
          },
          precondition: { exists: false },
        },
      ]);
    } catch (e) {
      if (e.conflict) {
        return jsonResponse(
          { error: "Someone just reserved this listing" },
          409,
          cors,
        );
      }
      throw e;
    }

    // Start the payment. If Paynow fails, undo the reservation right away.
    try {
      const pay = await paynowInitiate(env, order, orderId, body.email, phone);
      await commit(env, [
        {
          path: `orders/${orderId}`,
          data: { pollUrl: pay.pollUrl, updatedAt: Date.now() },
          mask: ["pollUrl", "updatedAt"],
        },
      ]);
      return jsonResponse(
        {
          orderId,
          amountCents,
          status: order.status,
          redirectUrl: pay.browserUrl || null, // card / web checkout
          instructions: pay.instructions || null, // EcoCash prompt text
          expiresAt: order.reservedUntil,
        },
        200,
        cors,
      );
    } catch (err) {
      console.error("Payment init failed:", err.message);
      await releaseListing(env, orderId, listingId, STATUS.EXPIRED);
      return jsonResponse(
        { error: "Could not start payment. Try again." },
        502,
        cors,
      );
    }
  }

  async function releaseListing(env, orderId, listingId, newStatus) {
    const [o, l] = await Promise.all([
      getDoc(env, `orders/${orderId}`),
      getDoc(env, `listings/${listingId}`),
    ]);
    if (!o || o.data.status !== STATUS.PENDING_PAYMENT) return;
    const writes = [
      {
        path: `orders/${orderId}`,
        data: { status: newStatus, updatedAt: Date.now() },
        mask: ["status", "updatedAt"],
        precondition: { updateTime: o.updateTime },
      },
    ];
    // Only relist if the listing is still reserved by THIS order
    if (l && l.data.reservedBy === orderId) {
      writes.push({
        path: `listings/${listingId}`,
        data: { status: "active", reservedBy: null, reservedAt: null },
        mask: ["status", "reservedBy", "reservedAt"],
        precondition: { updateTime: l.updateTime },
      });
    }
    try {
      await commit(env, writes);
    } catch (e) {
      console.error("releaseListing:", e.message);
    }
  }

  // ── POST /api/paynow/result  (Paynow server-to-server callback) ─────────────
  // Never trust the callback body alone: verify hash, then re-poll Paynow and
  // check the amount against OUR order before marking it paid.
  async function paynowResult(request, env) {
    const text = await request.text();
    const entries = [...new URLSearchParams(text).entries()];
    if (!(await paynowVerify(entries, env.PAYNOW_KEY))) {
      return new Response("bad hash", { status: 400 });
    }
    const cb = Object.fromEntries(
      entries.map(([k, v]) => [k.toLowerCase(), v]),
    );
    const orderId = cb.reference;
    if (!orderId) return new Response("no ref", { status: 400 });

    const o = await getDoc(env, `orders/${orderId}`);
    if (!o) return new Response("unknown order", { status: 404 });
    if (o.data.status !== STATUS.PENDING_PAYMENT) return new Response("OK"); // idempotent

    const polled = await paynowPoll(env, o.data.pollUrl || cb.pollurl);
    const st = (polled?.status || "").toLowerCase();
    const paid =
      st === "paid" || st === "awaiting delivery" || st === "delivered";
    const amountOk =
      Math.round(Number(polled?.amount) * 100) === o.data.amountCents;

    if (!paid || !amountOk) {
      if (["cancelled", "failed", "disputed"].includes(st)) {
        await releaseListing(env, orderId, o.data.listingId, STATUS.EXPIRED);
      }
      return new Response("OK");
    }

    const now = Date.now();
    try {
      await commit(env, [
        {
          path: `orders/${orderId}`,
          data: {
            status: STATUS.PAID_HELD,
            paidAt: now,
            paynowReference: polled.paynowreference || cb.paynowreference || "",
            pickupDeadline: now + PICKUP_WINDOW_MS,
            reservedUntil: now + PICKUP_WINDOW_MS,
            updatedAt: now,
          },
          mask: [
            "status",
            "paidAt",
            "paynowReference",
            "pickupDeadline",
            "reservedUntil",
            "updatedAt",
          ],
          precondition: { updateTime: o.updateTime },
        },
      ]);
    } catch (e) {
      console.error(
        "mark paid conflict (probably already processed):",
        e.message,
      );
    }
    return new Response("OK");
  }

  // ── GET /api/orders/:id  — buyer also gets the pickup code ──────────────────
  async function getOrder(request, env, cors, orderId) {
    const uid = await requireAuth(request, env);
    if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, cors);
    const o = await getDoc(env, `orders/${orderId}`);
    if (!o) return jsonResponse({ error: "Not found" }, 404, cors);
    if (o.data.buyerId !== uid && o.data.sellerId !== uid) {
      return jsonResponse({ error: "Forbidden" }, 403, cors);
    }
    const out = { ...o.data };
    delete out.pollUrl;
    if (o.data.buyerId === uid && o.data.status === STATUS.PAID_HELD) {
      const s = await getDoc(env, `order_secrets/${orderId}`);
      out.pickupCode = s?.data.pickupCode;
    }
    if (o.data.sellerId === uid) {
      // seller sees what they will receive, not the buyer's secret
      out.youReceiveCents = o.data.payoutCents;
    }
    return jsonResponse(out, 200, cors);
  }

  // ── POST /api/orders/:id/complete  { code }  — SELLER enters buyer's code ───
  async function completeWithCode(request, env, cors, orderId) {
    const uid = await requireAuth(request, env);
    if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, cors);
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400, cors);
    }

    const [o, s] = await Promise.all([
      getDoc(env, `orders/${orderId}`),
      getDoc(env, `order_secrets/${orderId}`),
    ]);
    if (!o || !s) return jsonResponse({ error: "Not found" }, 404, cors);
    if (o.data.sellerId !== uid)
      return jsonResponse({ error: "Forbidden" }, 403, cors);
    if (o.data.status !== STATUS.PAID_HELD) {
      return jsonResponse({ error: `Order is ${o.data.status}` }, 409, cors);
    }
    if (s.data.codeAttempts >= MAX_CODE_ATTEMPTS) {
      return jsonResponse(
        { error: "Too many wrong codes. Contact support." },
        429,
        cors,
      );
    }
    if (String(body.code || "") !== s.data.pickupCode) {
      await commit(env, [
        {
          path: `order_secrets/${orderId}`,
          data: { codeAttempts: (s.data.codeAttempts || 0) + 1 },
          mask: ["codeAttempts"],
        },
      ]);
      return jsonResponse({ error: "Wrong code" }, 400, cors);
    }
    return finish(env, cors, orderId, o, "seller_code");
  }

  // ── POST /api/orders/:id/confirm — BUYER confirms they received the animal ──
  async function confirmReceived(request, env, cors, orderId) {
    const uid = await requireAuth(request, env);
    if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, cors);
    const o = await getDoc(env, `orders/${orderId}`);
    if (!o) return jsonResponse({ error: "Not found" }, 404, cors);
    if (o.data.buyerId !== uid)
      return jsonResponse({ error: "Forbidden" }, 403, cors);
    if (o.data.status !== STATUS.PAID_HELD) {
      return jsonResponse({ error: `Order is ${o.data.status}` }, 409, cors);
    }
    return finish(env, cors, orderId, o, "buyer_confirmed");
  }

  // Marks COMPLETED and queues the payout in one atomic commit.
  async function finish(env, cors, orderId, o, via) {
    const now = Date.now();
    const [seller, verif] = await Promise.all([
      getDoc(env, `sellers/${o.data.sellerId}`),
      getDoc(env, `sellers/${o.data.sellerId}/verification/status`),
    ]);
    const sellerVerified = verif?.data.state === "approved";
    try {
      await commit(env, [
        {
          path: `orders/${orderId}`,
          data: {
            status: STATUS.COMPLETED,
            completedAt: now,
            completedVia: via,
            updatedAt: now,
          },
          mask: ["status", "completedAt", "completedVia", "updatedAt"],
          precondition: { updateTime: o.updateTime }, // blocks double-release
        },
        {
          path: `payouts/${orderId}`,
          data: {
            orderId,
            sellerId: o.data.sellerId,
            payoutCents: o.data.payoutCents,
            feeCents: o.data.feeCents, // your 5%
            // Nothing is paid automatically. You approve after the hold, then pay by hand.
            status: "pending_approval", // -> approved -> paid
            releaseAfter: now + PAYOUT_HOLD_MS,
            sellerVerified,
            payoutMethod: seller?.data.payoutMethod || null,
            payoutNumber: seller?.data.payoutNumber || null,
            createdAt: now,
          },
          precondition: { exists: false },
        },
      ]);
    } catch (e) {
      if (e.conflict)
        return jsonResponse({ error: "Order already processed" }, 409, cors);
      throw e;
    }
    return jsonResponse({ ok: true, status: STATUS.COMPLETED }, 200, cors);
  }

  // ── POST /api/orders/:id/dispute  { reason } — freezes the funds ────────────
  async function dispute(request, env, cors, orderId) {
    const uid = await requireAuth(request, env);
    if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, cors);
    let body = {};
    try {
      body = await request.json();
    } catch {
      /* reason optional */
    }
    const o = await getDoc(env, `orders/${orderId}`);
    if (!o) return jsonResponse({ error: "Not found" }, 404, cors);
    if (o.data.buyerId !== uid && o.data.sellerId !== uid) {
      return jsonResponse({ error: "Forbidden" }, 403, cors);
    }
    if (o.data.status !== STATUS.PAID_HELD) {
      return jsonResponse({ error: `Order is ${o.data.status}` }, 409, cors);
    }
    try {
      await commit(env, [
        {
          path: `orders/${orderId}`,
          data: {
            status: STATUS.DISPUTED,
            disputedBy: uid,
            disputeReason: String(body.reason || "").slice(0, 500),
            updatedAt: Date.now(),
          },
          mask: ["status", "disputedBy", "disputeReason", "updatedAt"],
          precondition: { updateTime: o.updateTime },
        },
      ]);
    } catch (e) {
      if (e.conflict)
        return jsonResponse({ error: "Order already changed" }, 409, cors);
      throw e;
    }
    return jsonResponse({ ok: true, status: STATUS.DISPUTED }, 200, cors);
  }

  // ── ADMIN: POST /api/admin/payouts/:orderId/:action  (approve | hold | paid) ──
  // Only UIDs listed in env.ADMIN_UIDS (comma-separated Firebase UIDs) may call this.
  async function adminPayout(request, env, cors, orderId, action) {
    const uid = await requireAuth(request, env);
    if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, cors);
    const admins = (env.ADMIN_UIDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!admins.includes(uid))
      return jsonResponse({ error: "Forbidden" }, 403, cors);

    const p = await getDoc(env, `payouts/${orderId}`);
    if (!p) return jsonResponse({ error: "Payout not found" }, 404, cors);
    const now = Date.now();
    let next;

    if (action === "approve") {
      if (p.data.status !== "pending_approval" && p.data.status !== "on_hold") {
        return jsonResponse({ error: `Payout is ${p.data.status}` }, 409, cors);
      }
      if (!p.data.sellerVerified) {
        return jsonResponse({ error: "Seller is not verified" }, 403, cors);
      }
      if (now < p.data.releaseAfter) {
        return jsonResponse(
          {
            error: "Hold period not over yet",
            releaseAfter: p.data.releaseAfter,
          },
          409,
          cors,
        );
      }
      next = "approved";
    } else if (action === "hold") {
      if (p.data.status === "paid")
        return jsonResponse({ error: "Already paid" }, 409, cors);
      next = "on_hold";
    } else if (action === "paid") {
      // Call after you have actually sent the money (EcoCash / bank)
      if (p.data.status !== "approved") {
        return jsonResponse({ error: "Approve it first" }, 409, cors);
      }
      next = "paid";
    } else {
      return jsonResponse({ error: "Unknown action" }, 400, cors);
    }

    try {
      await commit(env, [
        {
          path: `payouts/${orderId}`,
          data: { status: next, updatedAt: now, updatedBy: uid },
          mask: ["status", "updatedAt", "updatedBy"],
          precondition: { updateTime: p.updateTime },
        },
      ]);
    } catch (e) {
      if (e.conflict)
        return jsonResponse({ error: "Payout already changed" }, 409, cors);
      throw e;
    }
    return jsonResponse({ ok: true, status: next }, 200, cors);
  }

  // ── Cron sweep — call from `scheduled` (every 5–10 min) ─────────────────────
  async function sweep(env) {
    const now = Date.now();

    // 1) Unpaid orders past their window: expire and relist
    for (const r of await queryByStatus(
      env,
      "orders",
      STATUS.PENDING_PAYMENT,
    )) {
      if (r.data.reservedUntil < now) {
        // last-chance check: they may have paid and the callback was missed
        const polled = r.data.pollUrl
          ? await paynowPoll(env, r.data.pollUrl)
          : null;
        const st = (polled?.status || "").toLowerCase();
        if (st === "paid" || st === "awaiting delivery") continue; // callback will/should handle
        await releaseListing(env, r.id, r.data.listingId, STATUS.EXPIRED);
      }
    }

    // 2) Paid but buyer never showed: don't auto-pay anyone, flag for you to decide
    for (const r of await queryByStatus(env, "orders", STATUS.PAID_HELD)) {
      if (r.data.pickupDeadline && r.data.pickupDeadline < now) {
        try {
          await commit(env, [
            {
              path: `orders/${r.id}`,
              data: { status: STATUS.NEEDS_REVIEW, updatedAt: now },
              mask: ["status", "updatedAt"],
              precondition: { updateTime: r.updateTime },
            },
          ]);
        } catch {
          /* changed concurrently — fine */
        }
      }
    }
  }

  // ── Router: returns a Response or null if the route isn't ours ──────────────
  async function route(request, env, url, cors) {
    const p = url.pathname;
    const m = request.method;
    if (p === "/api/orders/create" && m === "POST")
      return createOrder(request, env, cors);
    if (p === "/api/paynow/result" && m === "POST")
      return paynowResult(request, env);

    const match = p.match(
      /^\/api\/orders\/([a-f0-9]{24})(?:\/(complete|confirm|dispute))?$/,
    );
    if (match) {
      const [, id, action] = match;
      if (!action && m === "GET") return getOrder(request, env, cors, id);
      if (action === "complete" && m === "POST")
        return completeWithCode(request, env, cors, id);
      if (action === "confirm" && m === "POST")
        return confirmReceived(request, env, cors, id);
      if (action === "dispute" && m === "POST")
        return dispute(request, env, cors, id);
    }
    const adm = p.match(
      /^\/api\/admin\/payouts\/([a-f0-9]{24})\/(approve|hold|paid)$/,
    );
    if (adm && m === "POST")
      return adminPayout(request, env, cors, adm[1], adm[2]);
    return null;
  }

  return { route, sweep };
}
