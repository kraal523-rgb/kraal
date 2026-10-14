import { handleWebhookVerification, handleWebhookEvent } from "./Webhook.js";
import { createEscrow } from "./escrow.js";
// Keys under these prefixes are private: never served publicly, never deletable via the API.
const PRIVATE_PREFIXES = ["verifications/"];
const isPrivateKey = (key) =>
  PRIVATE_PREFIXES.some((p) => key.toLowerCase().startsWith(p));

// Face++ confidence thresholds
const FACE_APPROVE_AT = 74; // >= 74  -> auto-approve (~1 in 10,000 false positive)
const FACE_REJECT_BELOW = 65; // <  65  -> reject; 65-74 -> manual review
const escrow = createEscrow({
  requireAuth, jsonResponse, getAdminToken,
  toFirestoreFields, fromFirestoreFields,
});

export default {
  // eslint-disable-next-line no-unused-vars
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((o) => o.trim());

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
        ? origin
        : allowedOrigins.includes("*")
          ? "*"
          : "",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
const escrowRes = await escrow.route(request, env, url, corsHeaders);
if (escrowRes) return escrowRes;
    const url = new URL(request.url);

    try {
      // ── POST /upload ─────────────────────────────────────────────────────────
      if (url.pathname === "/upload" && request.method === "POST") {
        return await handleUpload(request, env, url, corsHeaders);
      }

      // ── DELETE /media/:key ───────────────────────────────────────────────────
      if (url.pathname.startsWith("/media/") && request.method === "DELETE") {
        return await handleDelete(request, env, url, corsHeaders);
      }

      // ── POST /api/verify/submit ──────────────────────────────────────────────
      if (url.pathname === "/api/verify/submit" && request.method === "POST") {
        return await handleVerifySubmit(request, env, corsHeaders);
      }

      // ── GET /api/verify/status ───────────────────────────────────────────────
      if (url.pathname === "/api/verify/status" && request.method === "GET") {
        return await handleVerifyStatus(request, env, corsHeaders);
      }
      if (url.pathname === "/api/ai/listing" && request.method === "POST") {
        return await handleAIListing(request, env, corsHeaders);
      }
      if (request.method === "GET" && url.pathname === "/whatsapp/webhook") {
        return handleWebhookVerification(request, env);
      }

      // ── Incoming messages (POST)
      if (request.method === "POST" && url.pathname === "/whatsapp/webhook") {
        ctx.waitUntil(handleWebhookEvent(request, env));
        // Always respond 200 immediately — Meta will retry if you don't
        return new Response("OK", { status: 200 });
      }

      // ── Health check
      if (url.pathname === "/health") {
        return new Response(
          JSON.stringify({ status: "ok", service: "kraal-whatsapp" }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      // ── POST /api/ai/insights  (overview analytics insight card) ─────────────────
      if (url.pathname === "/api/ai/insights" && request.method === "POST") {
        return await handleAIInsights(request, env, corsHeaders);
      }

      // ── POST /api/ai/orders  (smart summary of pending/recent orders) ─────────────
      if (url.pathname === "/api/ai/orders" && request.method === "POST") {
        return await handleAIOrders(request, env, corsHeaders);
      }
      if (
        url.pathname === "/api/ai/buyer/price-check" &&
        request.method === "POST"
      ) {
        return await handleBuyerPriceCheck(request, env, corsHeaders);
      }

      if (
        url.pathname === "/api/ai/buyer/insights" &&
        request.method === "POST"
      ) {
        return await handleBuyerInsights(request, env, corsHeaders);
      }

      if (
        url.pathname === "/api/ai/buyer/transport-estimate" &&
        request.method === "POST"
      ) {
        return await handleTransportEstimate(request, env, corsHeaders);
      }

      if (
        url.pathname === "/api/ai/buyer/reply-suggestions" &&
        request.method === "POST"
      ) {
        return await handleReplySuggestions(request, env, corsHeaders);
      }
      if (url.pathname === "/ussd" && request.method === "POST") {
        return await handleUSSD(request, env);
      }
      // ── GET /:key  (R2 file serving) ─────────────────────────────────────────
      if (request.method === "GET") {
        let key;
        try {
          key = decodeURIComponent(url.pathname.slice(1));
        } catch {
          return new Response("Not found", {
            status: 404,
            headers: corsHeaders,
          });
        }
        if (!key || isPrivateKey(key))
          return new Response("Not found", {
            status: 404,
            headers: corsHeaders,
          });

        const object = await env.BUCKET.get(key);
        if (!object)
          return new Response("Not found", {
            status: 404,
            headers: corsHeaders,
          });

        return new Response(object.body, {
          headers: {
            ...corsHeaders,
            "Content-Type":
              object.httpMetadata?.contentType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000",
          },
        });
      }

      return new Response("Not found", { status: 404, headers: corsHeaders });
    } catch (err) {
      console.error("Worker error:", err);
      return jsonResponse({ error: "Internal server error" }, 500, corsHeaders);
    }
  },
};

// ─── Existing: POST /upload ───────────────────────────────────────────────────

async function handleUpload(request, env, url, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

  let file, folder;
  try {
    const formData = await request.formData();
    file = formData.get("file");
    folder = formData.get("folder") || "uploads";
  } catch {
    return jsonResponse({ error: "Invalid form data" }, 400, corsHeaders);
  }

  if (!file || typeof file === "string") {
    return jsonResponse({ error: "No file provided" }, 400, corsHeaders);
  }

  // Keep folder names simple and stop clients writing into private areas
  folder = String(folder).replace(/[^a-zA-Z0-9_\-/]/g, "_");
  if (isPrivateKey(`${folder}/`)) {
    return jsonResponse({ error: "Invalid folder" }, 400, corsHeaders);
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return jsonResponse(
      { error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." },
      400,
      corsHeaders,
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
    return jsonResponse(
      { error: "File too large. Maximum 5 MB." },
      400,
      corsHeaders,
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const key = `${folder}/${uid}/${Date.now()}-${safeName}`;

  try {
    await env.BUCKET.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
      customMetadata: { uploadedBy: uid, originalName: file.name },
    });
  } catch (err) {
    return jsonResponse(
      { error: "Upload to R2 failed", detail: err.message },
      500,
      corsHeaders,
    );
  }

  const publicBase = env.R2_PUBLIC_URL || url.origin;
  return jsonResponse({ url: `${publicBase}/${key}`, key }, 200, corsHeaders);
}

// ─── Existing: DELETE /media/:key ────────────────────────────────────────────

async function handleDelete(request, env, url, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

  const key = decodeURIComponent(url.pathname.replace("/media/", ""));
  if (!key.includes(`/${uid}/`) || isPrivateKey(key)) {
    return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
  }

  await env.BUCKET.delete(key);
  return jsonResponse({ deleted: true, key }, 200, corsHeaders);
}

async function handleVerifySubmit(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

  let idDoc, selfie;
  try {
    const formData = await request.formData();
    idDoc = formData.get("idDocument");
    selfie = formData.get("selfie");
  } catch {
    return jsonResponse({ error: "Invalid form data" }, 400, corsHeaders);
  }

  if (!idDoc || !selfie) {
    return jsonResponse(
      { error: "Both idDocument and selfie are required" },
      400,
      corsHeaders,
    );
  }

  const ALLOWED_ID_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  const ALLOWED_SELFIE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE = 10 * 1024 * 1024;

  if (!ALLOWED_ID_TYPES.includes(idDoc.type)) {
    return jsonResponse(
      { error: "ID document must be JPG, PNG, WebP, or PDF" },
      400,
      corsHeaders,
    );
  }
  if (!ALLOWED_SELFIE_TYPES.includes(selfie.type)) {
    return jsonResponse(
      { error: "Selfie must be JPG, PNG, or WebP" },
      400,
      corsHeaders,
    );
  }

  const idBuffer = await idDoc.arrayBuffer();
  const selfieBuffer = await selfie.arrayBuffer();

  if (idBuffer.byteLength > MAX_SIZE || selfieBuffer.byteLength > MAX_SIZE) {
    return jsonResponse(
      { error: "File size must be under 10 MB" },
      400,
      corsHeaders,
    );
  }

  // ── Store in R2 (private: not served by GET /:key) ─────────────────────────
  const ts = Date.now();
  const ext = (type) =>
    type === "application/pdf" ? "pdf" : type.split("/")[1];
  const idKey = `verifications/${uid}/id_${ts}.${ext(idDoc.type)}`;
  const selfieKey = `verifications/${uid}/selfie_${ts}.${ext(selfie.type)}`;

  await env.BUCKET.put(idKey, idBuffer, {
    httpMetadata: { contentType: idDoc.type },
    customMetadata: { uid, uploadedAt: new Date().toISOString() },
  });
  await env.BUCKET.put(selfieKey, selfieBuffer, {
    httpMetadata: { contentType: selfie.type },
    customMetadata: { uid, uploadedAt: new Date().toISOString() },
  });

  // ── Face++ comparison ──────────────────────────────────────────────────────
  // PDFs can't be compared — skip face check if ID is a PDF
  let faceResult = null;
  let faceState = "pending"; // default: goes to manual review

  if (idDoc.type !== "application/pdf") {
    try {
      faceResult = await compareFaces(env, idBuffer, selfieBuffer);

      // Face++ threshold guide:
      //   >= 80 very likely same person (1 in 100,000 false positive)
      //   >= 74 likely same person      (1 in 10,000 false positive)
      //   >= 65 possible match          (1 in 1,000 false positive)
      if (faceResult.confidence >= FACE_APPROVE_AT) {
        faceState = "approved";
      } else if (faceResult.confidence < FACE_REJECT_BELOW) {
        faceState = "rejected";
      } else {
        faceState = "pending"; // 65–74 range → manual review
      }
    } catch (err) {
      console.error("Face++ error:", err.message);
      // If Face++ fails (network, quota etc.) fall back to manual review
      faceState = "pending";
      faceResult = { error: err.message };
    }
  }

  // ── Write to Firestore ─────────────────────────────────────────────────────
  await firestoreSet(env, `sellers/${uid}/verification/status`, {
    state: faceState,
    submittedAt: new Date().toISOString(),
    idDocKey: idKey,
    selfieKey: selfieKey,
    uid,
    faceConfidence: faceResult?.confidence ?? null,
    faceError: faceResult?.error ?? null,
    reviewRequired: faceState === "pending",
  });

  return jsonResponse(
    {
      success: true,
      state: faceState,
      // Only expose confidence to client if it passed or needs review
      // Don't expose the exact score on rejection (avoids gaming)
      ...(faceState !== "rejected" && { confidence: faceResult?.confidence }),
    },
    200,
    corsHeaders,
  );
}

// ─── Face++ compare helper ────────────────────────────────────────────────────

async function compareFaces(env, idBuffer, selfieBuffer) {
  // Convert ArrayBuffers to base64
  const toBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const idBase64 = toBase64(idBuffer);
  const selfieBase64 = toBase64(selfieBuffer);

  const form = new FormData();
  form.append("api_key", env.FACEPP_API_KEY);
  form.append("api_secret", env.FACEPP_API_SECRET);
  form.append("image_base64_1", idBase64); // ID document photo
  form.append("image_base64_2", selfieBase64); // Selfie

  const res = await fetch("https://api-us.faceplusplus.com/facepp/v3/compare", {
    method: "POST",
    body: form,
  });

  const data = await res.json();

  // Face++ returns error_message on failure
  if (data.error_message) {
    throw new Error(`Face++ error: ${data.error_message}`);
  }

  // If no faces detected in either image
  if (!data.confidence) {
    throw new Error("No faces detected in one or both images");
  }

  return {
    confidence: data.confidence, // 0–100 score
    thresholds: data.thresholds, // { "1e-3": 65.1, "1e-4": 74.3, "1e-5": 80.5 }
  };
}
// ─── New: GET /api/verify/status ─────────────────────────────────────────────

async function handleVerifyStatus(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

  const doc = await firestoreGet(env, `sellers/${uid}/verification/status`);
  if (!doc) return jsonResponse({ state: "unverified" }, 200, corsHeaders);

  return jsonResponse(
    { state: doc.state, submittedAt: doc.submittedAt },
    200,
    corsHeaders,
  );
}
let cachedToken = { value: null, exp: 0 };
// ─── Shared auth helper ───────────────────────────────────────────────────────

async function requireAuth(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  return verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
}

// ─── Firestore REST helpers ───────────────────────────────────────────────────

async function getAdminToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken.value && cachedToken.exp - 60 > now) return cachedToken.value;

  const payload = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    sub: env.FIREBASE_CLIENT_EMAIL,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope:
      "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit",
  };

  const headerB64 = toB64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payloadB64 = toB64url(JSON.stringify(payload));
  const sigInput = `${headerB64}.${payloadB64}`;

  const pemKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const cryptoKey = await importPrivatePemKey(pemKey);
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    cryptoKey,
    new TextEncoder().encode(sigInput),
  );
  const sigB64 = toB64url(String.fromCharCode(...new Uint8Array(signature)));

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${sigInput}.${sigB64}`,
  });
  const data = await tokenRes.json();
  cachedToken = {
    value: data.access_token,
    exp: now + (data.expires_in || 3600),
  };
  return data.access_token;
}

async function firestoreSet(env, docPath, data) {
  const token = await getAdminToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });

  if (!res.ok) throw new Error(`Firestore write failed: ${await res.text()}`);
  return res.json();
}

async function firestoreGet(env, docPath) {
  const token = await getAdminToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;

  const doc = await res.json();
  return doc.fields ? fromFirestoreFields(doc.fields) : null;
}

// ─── Firestore field converters ───────────────────────────────────────────────
function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v }; // 👈 handles decimals like 55.114
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v))
    return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === "object")
    return { mapValue: { fields: toFirestoreFields(v) } };
  return { nullValue: null };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

function fromFirestoreValue(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v)
    return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in v) return fromFirestoreFields(v.mapValue.fields || {});
  return undefined;
}

function fromFirestoreFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields)) {
    const val = fromFirestoreValue(v);
    if (val !== undefined) obj[k] = val;
  }
  return obj;
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function toB64url(str) {
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64Decode(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(
    base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="),
  );
}

function b64DecodeBytes(str) {
  return Uint8Array.from(b64Decode(str), (c) => c.charCodeAt(0));
}

function pemToBuffer(pem) {
  return b64DecodeBytes(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""));
}

async function importPrivatePemKey(pem) {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToBuffer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

// ─── Firebase token verification (your existing JWK approach — kept as-is) ───

async function verifyFirebaseToken(idToken, projectId) {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(b64Decode(headerB64));
    const payload = JSON.parse(b64Decode(payloadB64));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    if (payload.iat > now + 300) return null;
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`)
      return null;

    // ✅ JWK endpoint — works correctly in Cloudflare Workers
    const keysRes = await fetch(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
      { cf: { cacheTtl: 3600 } },
    );
    const { keys } = await keysRes.json();
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const valid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      publicKey,
      b64DecodeBytes(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );

    return valid ? payload.user_id || payload.sub : null;
  } catch (e) {
    console.error("Token verify error:", e);
    return null;
  }
}
async function handleAIListing(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  const { title, category, quantity, weight, age, price, location } = body;

  if (!title || !category) {
    return jsonResponse(
      { error: "title and category are required" },
      400,
      corsHeaders,
    );
  }

  const systemPrompt =
    "You are a livestock marketplace assistant for Kraal, a platform in Zimbabwe and southern Africa. " +
    "You help sellers write better listings and price their animals correctly. " +
    "Always respond with a single valid JSON object and nothing else — no markdown, no explanation.";

  const userPrompt =
    `Generate listing help for:\n` +
    `- Animal: ${title}\n` +
    `- Category: ${category}\n` +
    `- Quantity: ${quantity || "not specified"}\n` +
    `- Weight: ${weight || "not specified"}\n` +
    `- Age: ${age || "not specified"}\n` +
    `- Asking price: USD ${price || "not set"}\n` +
    `- Location: ${location || "Zimbabwe"}\n\n` +
    `Respond ONLY with this JSON:\n` +
    `{"description":"2-3 sentence listing description","priceAdvice":"one sentence price advice",` +
    `"suggestedPrice":null,"strengths":["point1","point2"],"tips":["one tip"]}`;

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
    });

    const raw = result?.response || "";
    // Extract JSON from the response (model sometimes adds a little preamble)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]);
    return jsonResponse(parsed, 200, corsHeaders);
  } catch (err) {
    console.error("Workers AI listing error:", err.message);
    return jsonResponse(
      {
        description:
          "A quality animal available now. Contact seller for more details.",
        priceAdvice: "Price based on current market conditions.",
        suggestedPrice: null,
        strengths: [],
        tips: ["Add a photo to get more buyer interest."],
      },
      200,
      corsHeaders,
    );
  }
}

// ── POST /api/ai/insights ─────────────────────────────────────────────────────
async function handleAIInsights(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  const { listings = [], orders = [] } = body;

  const activeCount = listings.filter((l) => l.status === "active").length;
  const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;
  const avgPrice = activeCount
    ? Math.round(
        listings
          .filter((l) => l.status === "active")
          .reduce((s, l) => s + (l.price || 0), 0) / activeCount,
      )
    : 0;

  const prompt =
    `Seller dashboard data:\n` +
    `- Active listings: ${activeCount}, total views: ${totalViews}\n` +
    `- Avg listing price: USD ${avgPrice}\n` +
    `- Pending orders: ${pendingCount}, completed: ${completedCount}, cancelled: ${cancelledCount}\n\n` +
    `Give a performance insight. Respond ONLY with JSON:\n` +
    `{"headline":"short upbeat headline max 8 words","insight":"2 sentences of specific advice",` +
    `"action":"one clear next action","score":7}`;

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content:
            "You are a livestock business advisor for Kraal marketplace in Zimbabwe. Respond only with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
    });

    const raw = result?.response || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");

    return jsonResponse(JSON.parse(jsonMatch[0]), 200, corsHeaders);
  } catch (err) {
    console.error("Workers AI insights error:", err.message);
    // Fallback: compute a basic insight without AI
    const score = Math.min(
      10,
      Math.max(
        1,
        Math.round(
          (activeCount > 0 ? 3 : 0) +
            (totalViews > 50 ? 2 : totalViews > 10 ? 1 : 0) +
            (completedCount > 0 ? 2 : 0) +
            (pendingCount > 0 ? 2 : 0) +
            (cancelledCount === 0 ? 1 : 0),
        ),
      ),
    );

    return jsonResponse(
      {
        headline:
          activeCount > 0
            ? "You have active listings!"
            : "Post your first listing",
        insight:
          `You have ${activeCount} active listing(s) with ${totalViews} total views. ` +
          (pendingCount > 0
            ? `You have ${pendingCount} pending order(s) that need action.`
            : "Keep adding listings to grow your reach."),
        action:
          pendingCount > 0
            ? "Confirm your pending orders via WhatsApp."
            : "Post a new listing to attract more buyers.",
        score,
      },
      200,
      corsHeaders,
    );
  }
}
async function handleBuyerPriceCheck(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  const {
    title,
    category,
    price,
    breed,
    age,
    weight,
    vaccinated,
    quantity,
    location,
  } = body;

  const prompt =
    `You are a livestock price analyst for Zimbabwe's Kraal marketplace.\n\n` +
    `Evaluate this listing:\n` +
    `- Animal: ${title}\n` +
    `- Category: ${category}\n` +
    `- Breed: ${breed || "not specified"}\n` +
    `- Age: ${age || "not specified"}\n` +
    `- Weight: ${weight || "not specified"}\n` +
    `- Vaccinated: ${vaccinated ? "yes" : "no"}\n` +
    `- Quantity available: ${quantity || 1}\n` +
    `- Seller location: ${location || "Zimbabwe"}\n` +
    `- Listed price: USD ${price}\n\n` +
    `Based on typical Zimbabwe livestock market prices, is this fair?\n` +
    `Respond ONLY with JSON:\n` +
    `{"verdict":"fair"|"good_deal"|"overpriced","explanation":"one honest sentence",` +
    `"marketRange":"e.g. USD 80–120 per head","tip":"one negotiation or buying tip"}`;

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content:
            "You are a Zimbabwe livestock market analyst. Respond only with valid JSON and nothing else.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 250,
    });

    const raw = result?.response || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return jsonResponse(JSON.parse(match[0]), 200, corsHeaders);
  } catch (err) {
    console.error("Price check error:", err.message);
    return jsonResponse(
      {
        verdict: "fair",
        explanation:
          "Price appears within typical market range for this animal type in Zimbabwe.",
        marketRange: "Varies by location and condition",
        tip: "Ask the seller about vaccination records and recent vet checks before buying.",
      },
      200,
      corsHeaders,
    );
  }
}

// ── Buyer overview insight card ───────────────────────────────────────────────
async function handleBuyerInsights(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  const { orders = [], savedListings = [], transportOrders = [] } = body;

  const totalSpent = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + Number(o.totalAmount || o.amount || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const savedCategories = [
    ...new Set(savedListings.map((l) => l.categoryId).filter(Boolean)),
  ];
  const transportCount = transportOrders.length;

  const prompt =
    `Buyer activity on Kraal livestock marketplace (Zimbabwe):\n` +
    `- Total spent: USD ${totalSpent} across ${orders.length} orders\n` +
    `- Pending orders: ${pendingCount}\n` +
    `- Saved listings: ${savedListings.length} (categories: ${savedCategories.join(", ") || "mixed"})\n` +
    `- Transport requests made: ${transportCount}\n\n` +
    `Give them a brief, useful market insight and buying tip for Zimbabwe livestock.\n` +
    `Respond ONLY with JSON:\n` +
    `{"headline":"short headline max 8 words","insight":"2 practical sentences for this buyer",` +
    `"marketTip":"one current Zimbabwe livestock market tip","bestTimeToBuy":"e.g. cattle prices drop in April-May in Zimbabwe"}`;

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content:
            "You are a Zimbabwe livestock market analyst for Kraal marketplace. Respond only with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
    });

    const raw = result?.response || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return jsonResponse(JSON.parse(match[0]), 200, corsHeaders);
  } catch (err) {
    console.error("Buyer insights error:", err.message);
    // Computed fallback
    return jsonResponse(
      {
        headline:
          savedListings.length > 0
            ? "You have saved listings to review"
            : "Start browsing livestock",
        insight:
          totalSpent > 0
            ? `You've spent USD ${totalSpent.toLocaleString()} across ${orders.length} order(s). ${pendingCount > 0 ? `You have ${pendingCount} pending order(s) awaiting seller confirmation.` : "All your orders are up to date."}`
            : "Browse available livestock and save listings you're interested in to track prices.",
        marketTip:
          "Always check vaccination records and request a vet certificate for cattle over USD 500.",
        bestTimeToBuy:
          "Prices tend to be lower at the end of the farming season when farmers need to reduce herd sizes.",
      },
      200,
      corsHeaders,
    );
  }
}

// ── Transport cost estimator — called before submitting the form ──────────────
async function handleTransportEstimate(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  const {
    animalType,
    quantity,
    pickupProvince,
    pickupTown,
    dropProvince,
    dropTown,
  } = body;

  if (!animalType || !pickupProvince) {
    return jsonResponse(
      { error: "animalType and pickupProvince are required" },
      400,
      corsHeaders,
    );
  }

  const from = [pickupTown, pickupProvince].filter(Boolean).join(", ");
  const to =
    [dropTown, dropProvince].filter(Boolean).join(", ") || "destination TBD";

  const prompt =
    `Estimate livestock transport cost in Zimbabwe:\n` +
    `- Animal type: ${animalType}\n` +
    `- Quantity: ${quantity || 1}\n` +
    `- Pickup: ${from}\n` +
    `- Drop-off: ${to}\n\n` +
    `Give a realistic USD cost estimate for a private livestock truck in Zimbabwe 2024.\n` +
    `Respond ONLY with JSON:\n` +
    `{"estimateLow":50,"estimateHigh":150,"currency":"USD",` +
    `"basis":"one sentence explaining the estimate","tips":["loading tip","animal welfare tip"]}`;

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content:
            "You are a Zimbabwe livestock transport cost estimator. Respond only with valid JSON. Estimates should reflect realistic local rates.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 250,
    });

    const raw = result?.response || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return jsonResponse(JSON.parse(match[0]), 200, corsHeaders);
  } catch (err) {
    console.error("Transport estimate error:", err.message);
    return jsonResponse(
      {
        estimateLow: 40,
        estimateHigh: 200,
        currency: "USD",
        basis:
          "Estimate based on typical Zimbabwe livestock truck rates. Final price depends on driver and distance.",
        tips: [
          "Confirm loading/unloading is included in the quote.",
          "Ensure water and feed is available for journeys over 3 hours.",
        ],
      },
      200,
      corsHeaders,
    );
  }
}
const USSD_ROLES = { 1: "seller", 2: "buyer", 3: "transporter", 4: "vet" };

const USSD_PROVINCES = [
  "Harare",
  "Bulawayo",
  "Manicaland",
  "Mash Central",
  "Mash East",
  "Mash West",
  "Masvingo",
  "Mat North",
  "Mat South",
  "Midlands",
];
// Short USSD labels -> the full province names the app and website use
const PROVINCE_FULL_NAMES = {
  "Mash Central": "Mashonaland Central",
  "Mash East": "Mashonaland East",
  "Mash West": "Mashonaland West",
  "Mat North": "Matabeleland North",
  "Mat South": "Matabeleland South",
};

const MAX_PIN_ATTEMPTS = 3;
const PIN_LOCK_MINUTES = 15;
const MARKET_INFO = "Market days: update this text with your schedule.";

const ussdCon = (m) => "CON " + m;
const ussdEnd = (m) => "END " + m;
const textResponse = (body, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain" } });

function normalizePhone(raw) {
  const d = String(raw || "").replace(/[^\d]/g, "");
  if (d.startsWith("263")) return "+" + d;
  if (d.startsWith("0")) return "+263" + d.slice(1);
  return "+263" + d;
}

const ID_RE = /^\d{2}-?\d{6,7}-?[A-Za-z]-?\d{2}$/;

function ussdStepsFor(role) {
  const steps = [
    { key: "name", prompt: "Enter your full name:", ok: (v) => v.length >= 3 },
    {
      key: "nationalId",
      prompt: "Enter your National ID (e.g. 63-123456-A-42):",
      ok: (v) => ID_RE.test(v),
      map: (v) => v.toUpperCase(),
    },
    {
      key: "province",
      prompt:
        "Province:\n" +
        USSD_PROVINCES.map((p, i) => `${i + 1} ${p}`).join("\n"),
      ok: (v) => /^\d+$/.test(v) && +v >= 1 && +v <= USSD_PROVINCES.length,
      map: (v) => {
        const short = USSD_PROVINCES[+v - 1];
        return PROVINCE_FULL_NAMES[short] || short;
      },
    },
  ];

  if (role === "seller") {
    steps.push({
      key: "village",
      prompt: "Village / farm name:",
      ok: (v) => v.length >= 2,
    });
  }
  if (role === "transporter") {
    steps.push(
      {
        key: "vehicleReg",
        prompt: "Vehicle registration number:",
        ok: (v) => v.length >= 4,
        map: (v) => v.toUpperCase(),
      },
      {
        key: "vehicleType",
        prompt: "Vehicle type:\n1 Pickup\n2 Small truck\n3 Large truck",
        ok: (v) => ["1", "2", "3"].includes(v),
        map: (v) => ({ 1: "pickup", 2: "small_truck", 3: "large_truck" })[v],
      },
    );
  }
  if (role === "vet") {
    steps.push({
      key: "vetRegNo",
      prompt: "Veterinary registration number:",
      ok: (v) => v.length >= 3,
    });
  }

  steps.push(
    {
      key: "pin",
      prompt: "Choose a 4-digit PIN:",
      ok: (v) => /^\d{4}$/.test(v),
    },
    {
      key: "pinConfirm",
      prompt: "Confirm your PIN:",
      ok: (v, a) => v === a.pin,
    },
  );
  return steps;
}

// PBKDF2 (scrypt isn't available in Workers). 100k is the Workers max.
async function hashPin(pin, saltHex) {
  const salt = Uint8Array.from(
    saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)),
  );
  const keyMat = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMat,
    256,
  );
  return [...new Uint8Array(bits)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Firebase Auth (Identity Toolkit REST) ────────────────────────────────────
async function getOrCreateAuthUser(env, msisdn, displayName) {
  const token = await getAdminToken(env);
  const base = `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const createRes = await fetch(base, {
    method: "POST",
    headers,
    body: JSON.stringify({ phoneNumber: msisdn, displayName }),
  });
  const created = await createRes.json();
  if (createRes.ok && created.localId) return created.localId;

  if (created?.error?.message?.includes("PHONE_NUMBER_EXISTS")) {
    const lookupRes = await fetch(`${base}:lookup`, {
      method: "POST",
      headers,
      body: JSON.stringify({ phoneNumber: [msisdn] }),
    });
    const found = await lookupRes.json();
    if (found?.users?.[0]?.localId) return found.users[0].localId;
  }
  throw new Error("Auth user create failed: " + JSON.stringify(created));
}

// ── Firestore helpers specific to USSD ───────────────────────────────────────
// The WhatsApp flow (registration.js) stores numbers without the "+", so look
// for both spellings. Prefer a Firebase-Auth-backed profile (has `uid`) if
// the same person somehow has both.
async function findUserByPhone(env, msisdn) {
  const token = await getAdminToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "phone" },
            op: "IN",
            value: {
              arrayValue: {
                values: [
                  { stringValue: msisdn },
                  { stringValue: msisdn.replace(/^\+/, "") },
                ],
              },
            },
          },
        },
        limit: 5,
      },
    }),
  });
  if (!res.ok) throw new Error("Firestore query failed: " + (await res.text()));
  const rows = await res.json();
  const users = rows
    .filter((r) => r.document?.fields)
    .map((r) => fromFirestoreFields(r.document.fields));
  return users.find((u) => u.uid) || users[0] || null;
}

// PATCH with updateMask = merge behaviour (won't wipe fields the app added).
// Fields listed in `deleteKeys` are removed from the document.
async function firestoreMerge(env, docPath, data, deleteKeys = []) {
  const token = await getAdminToken(env);
  const mask = [...Object.keys(data), ...deleteKeys]
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}?${mask}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!res.ok) throw new Error("Firestore write failed: " + (await res.text()));
}

// ── Registration ─────────────────────────────────────────────────────────────
// What gets written (all via the service account, so security rules don't
// apply to these writes — but the documents are shaped to satisfy the rules so
// the same person can later use the app, e.g. by phone-OTP sign-in):
//   ussd_credentials/{uid}  PIN hash + lockout counters. NO client rule exists
//                           for this collection, so the app can never read it.
//   {role collection}/{uid} sellers / transporters / vets / buyers profile
//                           (sellers + transporters are publicly readable, so
//                           no National ID goes in here)
//   users/{uid}             written LAST: its existence is what marks a phone
//                           as registered, so a half-finished registration
//                           can simply be retried.
async function createUssdUser(env, msisdn, role, a) {
  const uid = await getOrCreateAuthUser(env, msisdn, a.name);
  const now = new Date();

  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const pinSalt = [...saltBytes]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const pinHash = await hashPin(a.pin, pinSalt);
  await firestoreMerge(env, `ussd_credentials/${uid}`, {
    pinHash,
    pinSalt,
    failedAttempts: 0,
    lockedUntil: 0,
    updatedAt: now,
  });

  const city = a.village || "";
  const common = {
    uid,
    email: "",
    phone: msisdn,
    role,
    name: a.name,
    displayName: a.name,
    province: a.province,
    city,
    verified: false,
    channel: "ussd",
    createdAt: now,
    updatedAt: now,
  };

  // Matches validSellerProfile / validTransporterProfile in the Firestore rules
  const business = { ...common, businessName: a.name, country: "Zimbabwe" };
  if (role === "seller") {
    await firestoreMerge(env, `sellers/${uid}`, {
      ...business,
      village: a.village,
    });
  } else if (role === "transporter") {
    await firestoreMerge(env, `transporters/${uid}`, {
      ...business,
      vehicleReg: a.vehicleReg,
      vehicleType: a.vehicleType,
      available: true,
      serviceProvinces: [a.province],
    });
  } else if (role === "vet") {
    await firestoreMerge(env, `vets/${uid}`, {
      ...business,
      vetRegNo: a.vetRegNo,
    });
  } else {
    await firestoreMerge(env, `buyers/${uid}`, common);
  }

  // users/{uid} — satisfies validUserDoc (uid, email, role)
  const userDoc = {
    ...common,
    nationalId: a.nationalId,
    verificationStatus: "pending",
  };
  for (const k of ["village", "vehicleReg", "vehicleType", "vetRegNo"]) {
    if (a[k]) userDoc[k] = a[k];
  }
  await firestoreMerge(env, `users/${uid}`, userDoc);
}

// ── Sign-in (PIN) ────────────────────────────────────────────────────────────
// Returns { ok: true } or { ok: false, message }.
async function checkPin(env, user, pin) {
  let creds = await firestoreGet(env, `ussd_credentials/${user.uid}`);
  let legacy = false;

  // Accounts registered before ussd_credentials existed kept the hash on users/{uid}
  if (!creds?.pinHash && user.pinHash && user.pinSalt) {
    creds = {
      pinHash: user.pinHash,
      pinSalt: user.pinSalt,
      failedAttempts: 0,
      lockedUntil: 0,
    };
    legacy = true;
  }

  if (!creds?.pinHash) {
    return {
      ok: false,
      message:
        "This number is registered on the Kraal app. Please sign in there.",
    };
  }

  const now = Date.now();
  if (creds.lockedUntil && creds.lockedUntil > now) {
    const mins = Math.ceil((creds.lockedUntil - now) / 60000);
    return {
      ok: false,
      message: `Too many wrong PINs. Try again in ${mins} min.`,
    };
  }

  if (!/^\d{4}$/.test(pin)) return { ok: false, message: "Invalid PIN." };

  const attempt = await hashPin(pin, creds.pinSalt);
  if (!safeEqual(attempt, creds.pinHash)) {
    const failed = (creds.failedAttempts || 0) + 1;
    const locked = failed >= MAX_PIN_ATTEMPTS;
    const update = {
      failedAttempts: locked ? 0 : failed,
      lockedUntil: locked ? now + PIN_LOCK_MINUTES * 60000 : 0,
      updatedAt: new Date(),
    };
    // A legacy hash is moved to the private collection as soon as we track attempts
    await firestoreMerge(env, `ussd_credentials/${user.uid}`, {
      ...update,
      pinHash: creds.pinHash,
      pinSalt: creds.pinSalt,
    });
    if (legacy) {
      await firestoreMerge(env, `users/${user.uid}`, {}, [
        "pinHash",
        "pinSalt",
      ]);
    }
    return {
      ok: false,
      message: locked
        ? `Too many wrong PINs. Locked for ${PIN_LOCK_MINUTES} min.`
        : `Wrong PIN. ${MAX_PIN_ATTEMPTS - failed} ${MAX_PIN_ATTEMPTS - failed === 1 ? "try" : "tries"} left.`,
    };
  }

  if (legacy) {
    await firestoreMerge(env, `ussd_credentials/${user.uid}`, {
      pinHash: creds.pinHash,
      pinSalt: creds.pinSalt,
      failedAttempts: 0,
      lockedUntil: 0,
      updatedAt: new Date(),
    });
    await firestoreMerge(env, `users/${user.uid}`, {}, ["pinHash", "pinSalt"]);
  } else if (creds.failedAttempts || creds.lockedUntil) {
    await firestoreMerge(env, `ussd_credentials/${user.uid}`, {
      failedAttempts: 0,
      lockedUntil: 0,
      updatedAt: new Date(),
    });
  }
  return { ok: true };
}

async function ussdSignIn(env, user, parts) {
  const first = (user.name || user.displayName || "").split(" ")[0] || "there";

  if (parts.length === 0) {
    return ussdCon(`Welcome back ${first}\nEnter your 4-digit PIN:`);
  }

  const check = await checkPin(env, user, parts[0].trim());
  if (!check.ok) return ussdEnd(check.message);

  if (parts.length === 1)
    return ussdCon(`Hello ${first}\n1 My account\n2 Market info`);

  if (parts[1] === "1") {
    return ussdEnd(
      `${user.name || first}\nRole: ${user.role}\nProvince: ${user.province || "-"}\n` +
        `Verification: ${user.verificationStatus || "pending"}`,
    );
  }
  if (parts[1] === "2") return ussdEnd(MARKET_INFO);
  return ussdEnd("Invalid option.");
}

// ── Menu logic ───────────────────────────────────────────────────────────────
async function ussdFlow(env, msisdn, text) {
  const parts = text === "" ? [] : text.split("*");
  const existing = await findUserByPhone(env, msisdn);

  if (existing) {
    // Profiles made through WhatsApp are keyed by phone number and have no
    // Firebase login or PIN. Don't register a duplicate person on top of one.
    if (!existing.uid) {
      return ussdEnd(
        "This number is already registered on Kraal via WhatsApp. USSD sign-in is not enabled for it yet.",
      );
    }
    return ussdSignIn(env, existing, parts);
  }

  if (parts.length === 0)
    return ussdCon("Kraal Market\n1 Register\n2 Market info");
  if (parts[0] === "2") return ussdEnd(MARKET_INFO);
  if (parts[0] !== "1") return ussdEnd("Invalid option.");

  if (parts.length === 1) {
    return ussdCon(
      "I am a:\n1 Seller\n2 Buyer\n3 Transporter\n4 Veterinary officer",
    );
  }

  const role = USSD_ROLES[parts[1]];
  if (!role) return ussdEnd("Invalid choice. Dial again to retry.");

  const steps = ussdStepsFor(role);
  const inputs = parts.slice(2);
  const answers = {};

  for (let i = 0; i < steps.length; i++) {
    if (i >= inputs.length) return ussdCon(steps[i].prompt);
    const v = inputs[i].trim();
    if (!steps[i].ok(v, answers))
      return ussdEnd("Invalid entry. Dial again to retry.");
    answers[steps[i].key] = steps[i].map ? steps[i].map(v) : v;
  }

  await createUssdUser(env, msisdn, role, answers);
  const extra =
    role === "buyer" ? "" : " An admin will verify your details shortly.";
  return ussdEnd(
    `Welcome ${answers.name}! You are registered as ${role}.${extra} Dial again and enter your PIN to sign in.`,
  );
}

// ── Route handler ────────────────────────────────────────────────────────────
async function handleUSSD(request, env) {
  const url = new URL(request.url);
  if (!env.USSD_SECRET || url.searchParams.get("key") !== env.USSD_SECRET) {
    return textResponse("END Forbidden", 403);
  }

  try {
    // Africa's Talking posts application/x-www-form-urlencoded
    const form = await request.formData();
    const msisdn = normalizePhone(form.get("phoneNumber"));
    const text = (form.get("text") || "").toString();
    return textResponse(await ussdFlow(env, msisdn, text));
  } catch (err) {
    console.error("USSD error:", err);
    return textResponse("END Service error. Please try again later.");
  }
}
// ── Smart reply suggestions in the Messages tab ───────────────────────────────
async function handleReplySuggestions(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  // lastMessage: the most recent message from the other party
  // context: conversation context string (e.g. "Inquiry about 10 Brahman Bulls")
  // otherRole: "seller" | "transporter"
  const { lastMessage, context, otherRole } = body;

  if (!lastMessage) {
    return jsonResponse(
      {
        suggestions: [
          "I'm interested, can we negotiate?",
          "Is this still available?",
          "Can you send more photos?",
        ],
      },
      200,
      corsHeaders,
    );
  }

  const prompt =
    `A buyer on Kraal livestock marketplace (Zimbabwe) received this message from a ${otherRole || "seller"}:\n` +
    `"${lastMessage}"\n` +
    `Context: ${context || "livestock purchase inquiry"}\n\n` +
    `Suggest 3 short, natural reply options the buyer could send. Keep each under 12 words.\n` +
    `Respond ONLY with JSON:\n` +
    `{"suggestions":["reply 1","reply 2","reply 3"]}`;

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content:
            "You generate short, natural message suggestions for livestock buyers. Respond only with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 150,
    });

    const raw = result?.response || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    return jsonResponse(JSON.parse(match[0]), 200, corsHeaders);
  } catch (err) {
    console.error("Reply suggestions error:", err.message);
    return jsonResponse(
      {
        suggestions: [
          "Thanks, when can I collect?",
          "Can we agree on a lower price?",
          "I'll confirm by end of day.",
        ],
      },
      200,
      corsHeaders,
    );
  }
}

// ── POST /api/ai/orders ───────────────────────────────────────────────────────
async function handleAIOrders(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  const { orders = [] } = body;

  if (orders.length === 0) {
    return jsonResponse(
      {
        summary:
          "No orders yet. Once buyers place orders they will appear here.",
        urgentActions: [],
        bestBuyerLocation: null,
        totalPotentialRevenue: 0,
      },
      200,
      corsHeaders,
    );
  }

  // Compute fallback stats client-side so we always have them
  const pending = orders.filter((o) => o.status === "pending");
  const confirmed = orders.filter((o) => o.status === "confirmed");
  const locations = orders.map((o) => o.location).filter(Boolean);
  const topLocation = locations.length
    ? Object.entries(
        locations.reduce((acc, l) => {
          acc[l] = (acc[l] || 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1])[0][0]
    : null;
  const potentialRevenue = [...pending, ...confirmed].reduce(
    (s, o) => s + (o.amount || 0),
    0,
  );

  const orderLines = orders
    .slice(0, 8) // cap to avoid token overflow
    .map(
      (o) =>
        `${o.id}: ${o.listing}, USD ${o.amount}, ${o.status}, buyer in ${o.location}`,
    )
    .join("\n");

  const prompt =
    `Seller's recent orders:\n${orderLines}\n\n` +
    `Summarise and flag urgent actions. Respond ONLY with JSON:\n` +
    `{"summary":"2 sentence plain summary","urgentActions":["action if any"],` +
    `"bestBuyerLocation":"top city","totalPotentialRevenue":${potentialRevenue}}`;

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content:
            "You are a livestock business advisor for Kraal in Zimbabwe. Respond only with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
    });

    const raw = result?.response || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");

    const parsed = JSON.parse(jsonMatch[0]);
    // Always use computed revenue as source of truth
    parsed.totalPotentialRevenue = potentialRevenue;
    parsed.bestBuyerLocation = parsed.bestBuyerLocation || topLocation;
    return jsonResponse(parsed, 200, corsHeaders);
  } catch (err) {
    console.error("Workers AI orders error:", err.message);
    // Graceful fallback — still useful without AI
    return jsonResponse(
      {
        summary:
          `You have ${pending.length} pending and ${confirmed.length} confirmed order(s). ` +
          (pending.length > 0
            ? "Confirm pending orders promptly to keep buyers happy."
            : "All active orders are confirmed."),
        urgentActions: pending.map(
          (o) => `Confirm order ${o.id} for ${o.buyer} — ${o.listing}`,
        ),
        bestBuyerLocation: topLocation,
        totalPotentialRevenue: potentialRevenue,
      },
      200,
      corsHeaders,
    );
  }
}
// ─── JSON response helper ─────────────────────────────────────────────────────

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
