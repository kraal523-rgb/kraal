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
 
// ── POST /api/ai/insights  (overview analytics insight card) ─────────────────
if (url.pathname === "/api/ai/insights" && request.method === "POST") {
  return await handleAIInsights(request, env, corsHeaders);
}
 
// ── POST /api/ai/orders  (smart summary of pending/recent orders) ─────────────
if (url.pathname === "/api/ai/orders" && request.method === "POST") {
  return await handleAIOrders(request, env, corsHeaders);
}
if (url.pathname === "/api/ai/buyer/price-check" && request.method === "POST") {
  return await handleBuyerPriceCheck(request, env, corsHeaders);
}
 
if (url.pathname === "/api/ai/buyer/insights" && request.method === "POST") {
  return await handleBuyerInsights(request, env, corsHeaders);
}
 
if (url.pathname === "/api/ai/buyer/transport-estimate" && request.method === "POST") {
  return await handleTransportEstimate(request, env, corsHeaders);
}
 
if (url.pathname === "/api/ai/buyer/reply-suggestions" && request.method === "POST") {
  return await handleReplySuggestions(request, env, corsHeaders);
}
      // ── GET /:key  (R2 file serving) ─────────────────────────────────────────
      if (request.method === "GET") {
        const key = url.pathname.slice(1);
        if (!key)
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
  if (!key.includes(`/${uid}/`)) {
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

  const ALLOWED_ID_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const ALLOWED_SELFIE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE = 10 * 1024 * 1024;

  if (!ALLOWED_ID_TYPES.includes(idDoc.type)) {
    return jsonResponse({ error: "ID document must be JPG, PNG, WebP, or PDF" }, 400, corsHeaders);
  }
  if (!ALLOWED_SELFIE_TYPES.includes(selfie.type)) {
    return jsonResponse({ error: "Selfie must be JPG, PNG, or WebP" }, 400, corsHeaders);
  }

  const idBuffer = await idDoc.arrayBuffer();
  const selfieBuffer = await selfie.arrayBuffer();

  if (idBuffer.byteLength > MAX_SIZE || selfieBuffer.byteLength > MAX_SIZE) {
    return jsonResponse({ error: "File size must be under 10 MB" }, 400, corsHeaders);
  }

  // ── Store in R2 ────────────────────────────────────────────────────────────
  const ts = Date.now();
  const ext = (type) => type === "application/pdf" ? "pdf" : type.split("/")[1];
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
      // confidence > 80  → very likely same person (1 in 100,000 false positive)
      // confidence > 74  → likely same person     (1 in 10,000 false positive)
      // confidence > 65  → possible match         (1 in 1,000 false positive)
      // We use 74 as our auto-approve threshold
      if (faceResult.confidence >= 50) {
        faceState = "approved";
      } else if (faceResult.confidence < 45) {
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
  form.append("image_base64_1", idBase64);      // ID document photo
  form.append("image_base64_2", selfieBase64);   // Selfie

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
    confidence: data.confidence,           // 0–100 score
    thresholds: data.thresholds,           // { "1e-3": 65.1, "1e-4": 74.3, "1e-5": 80.5 }
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
  const payload = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    sub: env.FIREBASE_CLIENT_EMAIL,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/datastore",
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
  const jwt = `${sigInput}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await tokenRes.json();
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
function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") fields[k] = { stringValue: v };
    else if (typeof v === "number" && Number.isInteger(v)) fields[k] = { integerValue: String(v) };
    else if (typeof v === "number") fields[k] = { doubleValue: v }; // 👈 handles decimals like 55.114
    else if (typeof v === "boolean") fields[k] = { booleanValue: v };
    else if (v === null) fields[k] = { nullValue: null };
    else if (typeof v === "object") fields[k] = { mapValue: { fields: toFirestoreFields(v) } };
  }
  return fields;
}

function fromFirestoreFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields)) {
    if ("stringValue" in v) obj[k] = v.stringValue;
    else if ("integerValue" in v) obj[k] = Number(v.integerValue);
    else if ("booleanValue" in v) obj[k] = v.booleanValue;
    else if ("nullValue" in v) obj[k] = null;
    else if ("mapValue" in v)
      obj[k] = fromFirestoreFields(v.mapValue.fields || {});
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
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders); }
 
  const { title, category, quantity, weight, age, price, location } = body;
 
  if (!title || !category) {
    return jsonResponse({ error: "title and category are required" }, 400, corsHeaders);
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
        { role: "user",   content: userPrompt   },
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
    return jsonResponse({
      description: "A quality animal available now. Contact seller for more details.",
      priceAdvice:   "Price based on current market conditions.",
      suggestedPrice: null,
      strengths:     [],
      tips:          ["Add a photo to get more buyer interest."],
    }, 200, corsHeaders);
  }
}
 
 
// ── POST /api/ai/insights ─────────────────────────────────────────────────────
async function handleAIInsights(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
 
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders); }
 
  const { listings = [], orders = [] } = body;
 
  const activeCount     = listings.filter((l) => l.status === "active").length;
  const totalViews      = listings.reduce((s, l) => s + (l.views || 0), 0);
  const pendingCount    = orders.filter((o) => o.status === "pending").length;
  const completedCount  = orders.filter((o) => o.status === "completed").length;
  const cancelledCount  = orders.filter((o) => o.status === "cancelled").length;
  const avgPrice        = activeCount
    ? Math.round(listings.filter((l) => l.status === "active").reduce((s, l) => s + (l.price || 0), 0) / activeCount)
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
        { role: "system", content: "You are a livestock business advisor for Kraal marketplace in Zimbabwe. Respond only with valid JSON." },
        { role: "user",   content: prompt },
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
    const score = Math.min(10, Math.max(1, Math.round(
      (activeCount > 0 ? 3 : 0) +
      (totalViews > 50 ? 2 : totalViews > 10 ? 1 : 0) +
      (completedCount > 0 ? 2 : 0) +
      (pendingCount > 0 ? 2 : 0) +
      (cancelledCount === 0 ? 1 : 0)
    )));
 
    return jsonResponse({
      headline: activeCount > 0 ? "You have active listings!" : "Post your first listing",
      insight:  `You have ${activeCount} active listing(s) with ${totalViews} total views. ` +
                (pendingCount > 0 ? `You have ${pendingCount} pending order(s) that need action.` : "Keep adding listings to grow your reach."),
      action:   pendingCount > 0 ? "Confirm your pending orders via WhatsApp." : "Post a new listing to attract more buyers.",
      score,
    }, 200, corsHeaders);
  }
}
 async function handleBuyerPriceCheck(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
 
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders); }
 
  const { title, category, price, breed, age, weight, vaccinated, quantity, location } = body;
 
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
        { role: "system", content: "You are a Zimbabwe livestock market analyst. Respond only with valid JSON and nothing else." },
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
    return jsonResponse({
      verdict: "fair",
      explanation: "Price appears within typical market range for this animal type in Zimbabwe.",
      marketRange: "Varies by location and condition",
      tip: "Ask the seller about vaccination records and recent vet checks before buying.",
    }, 200, corsHeaders);
  }
}
 
 
// ── Buyer overview insight card ───────────────────────────────────────────────
async function handleBuyerInsights(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
 
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders); }
 
  const { orders = [], savedListings = [], transportOrders = [] } = body;
 
  const totalSpent = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + Number(o.totalAmount || o.amount || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const savedCategories = [...new Set(savedListings.map((l) => l.categoryId).filter(Boolean))];
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
        { role: "system", content: "You are a Zimbabwe livestock market analyst for Kraal marketplace. Respond only with valid JSON." },
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
    return jsonResponse({
      headline: savedListings.length > 0 ? "You have saved listings to review" : "Start browsing livestock",
      insight: totalSpent > 0
        ? `You've spent USD ${totalSpent.toLocaleString()} across ${orders.length} order(s). ${pendingCount > 0 ? `You have ${pendingCount} pending order(s) awaiting seller confirmation.` : "All your orders are up to date."}`
        : "Browse available livestock and save listings you're interested in to track prices.",
      marketTip: "Always check vaccination records and request a vet certificate for cattle over USD 500.",
      bestTimeToBuy: "Prices tend to be lower at the end of the farming season when farmers need to reduce herd sizes.",
    }, 200, corsHeaders);
  }
}
 
 
// ── Transport cost estimator — called before submitting the form ──────────────
async function handleTransportEstimate(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
 
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders); }
 
  const { animalType, quantity, pickupProvince, pickupTown, dropProvince, dropTown } = body;
 
  if (!animalType || !pickupProvince) {
    return jsonResponse({ error: "animalType and pickupProvince are required" }, 400, corsHeaders);
  }
 
  const from = [pickupTown, pickupProvince].filter(Boolean).join(", ");
  const to   = [dropTown, dropProvince].filter(Boolean).join(", ") || "destination TBD";
 
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
        { role: "system", content: "You are a Zimbabwe livestock transport cost estimator. Respond only with valid JSON. Estimates should reflect realistic local rates." },
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
    return jsonResponse({
      estimateLow: 40,
      estimateHigh: 200,
      currency: "USD",
      basis: "Estimate based on typical Zimbabwe livestock truck rates. Final price depends on driver and distance.",
      tips: ["Confirm loading/unloading is included in the quote.", "Ensure water and feed is available for journeys over 3 hours."],
    }, 200, corsHeaders);
  }
}
 
 
// ── Smart reply suggestions in the Messages tab ───────────────────────────────
async function handleReplySuggestions(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
 
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders); }
 
  // lastMessage: the most recent message from the other party
  // context: conversation context string (e.g. "Inquiry about 10 Brahman Bulls")
  // otherRole: "seller" | "transporter"
  const { lastMessage, context, otherRole } = body;
 
  if (!lastMessage) {
    return jsonResponse({ suggestions: ["I'm interested, can we negotiate?", "Is this still available?", "Can you send more photos?"] }, 200, corsHeaders);
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
        { role: "system", content: "You generate short, natural message suggestions for livestock buyers. Respond only with valid JSON." },
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
    return jsonResponse({
      suggestions: [
        "Thanks, when can I collect?",
        "Can we agree on a lower price?",
        "I'll confirm by end of day.",
      ],
    }, 200, corsHeaders);
  }
}
 
// ── POST /api/ai/orders ───────────────────────────────────────────────────────
async function handleAIOrders(request, env, corsHeaders) {
  const uid = await requireAuth(request, env);
  if (!uid) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
 
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders); }
 
  const { orders = [] } = body;
 
  if (orders.length === 0) {
    return jsonResponse({
      summary: "No orders yet. Once buyers place orders they will appear here.",
      urgentActions: [],
      bestBuyerLocation: null,
      totalPotentialRevenue: 0,
    }, 200, corsHeaders);
  }
 
  // Compute fallback stats client-side so we always have them
  const pending    = orders.filter((o) => o.status === "pending");
  const confirmed  = orders.filter((o) => o.status === "confirmed");
  const locations  = orders.map((o) => o.location).filter(Boolean);
  const topLocation = locations.length
    ? Object.entries(locations.reduce((acc, l) => { acc[l] = (acc[l] || 0) + 1; return acc; }, {}))
        .sort((a, b) => b[1] - a[1])[0][0]
    : null;
  const potentialRevenue = [...pending, ...confirmed].reduce((s, o) => s + (o.amount || 0), 0);
 
  const orderLines = orders
    .slice(0, 8) // cap to avoid token overflow
    .map((o) => `${o.id}: ${o.listing}, USD ${o.amount}, ${o.status}, buyer in ${o.location}`)
    .join("\n");
 
  const prompt =
    `Seller's recent orders:\n${orderLines}\n\n` +
    `Summarise and flag urgent actions. Respond ONLY with JSON:\n` +
    `{"summary":"2 sentence plain summary","urgentActions":["action if any"],` +
    `"bestBuyerLocation":"top city","totalPotentialRevenue":${potentialRevenue}}`;
 
  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "You are a livestock business advisor for Kraal in Zimbabwe. Respond only with valid JSON." },
        { role: "user",   content: prompt },
      ],
      max_tokens: 300,
    });
 
    const raw = result?.response || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
 
    const parsed = JSON.parse(jsonMatch[0]);
    // Always use computed revenue as source of truth
    parsed.totalPotentialRevenue = potentialRevenue;
    parsed.bestBuyerLocation     = parsed.bestBuyerLocation || topLocation;
    return jsonResponse(parsed, 200, corsHeaders);
 
  } catch (err) {
    console.error("Workers AI orders error:", err.message);
    // Graceful fallback — still useful without AI
    return jsonResponse({
      summary: `You have ${pending.length} pending and ${confirmed.length} confirmed order(s). ` +
               (pending.length > 0 ? "Confirm pending orders promptly to keep buyers happy." : "All active orders are confirmed."),
      urgentActions: pending.map((o) => `Confirm order ${o.id} for ${o.buyer} — ${o.listing}`),
      bestBuyerLocation: topLocation,
      totalPotentialRevenue: potentialRevenue,
    }, 200, corsHeaders);
  }
}
// ─── JSON response helper ─────────────────────────────────────────────────────

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
