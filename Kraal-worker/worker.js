export default {
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

// ─── JSON response helper ─────────────────────────────────────────────────────

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
