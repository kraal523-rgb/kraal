export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = (env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim());
    const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes("*");

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // POST /upload
    if (url.pathname === "/upload" && request.method === "POST") {

      const authHeader = request.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "").trim();

      if (!token) {
        return jsonResponse({ error: "Missing auth token" }, 401, corsHeaders);
      }

      const uid = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
      if (!uid) {
        return jsonResponse({ error: "Invalid or expired token" }, 403, corsHeaders);
      }

      let file, folder;
      try {
        const formData = await request.formData();
        file = formData.get("file");
        folder = formData.get("folder") || "uploads";
      } catch (err) {
        return jsonResponse({ error: "Invalid form data" }, 400, corsHeaders);
      }

      if (!file || typeof file === "string") {
        return jsonResponse({ error: "No file provided" }, 400, corsHeaders);
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        return jsonResponse({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." }, 400, corsHeaders);
      }

      const arrayBuffer = await file.arrayBuffer();
      if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
        return jsonResponse({ error: "File too large. Maximum 5 MB." }, 400, corsHeaders);
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const key = `${folder}/${uid}/${Date.now()}-${safeName}`;

      try {
        await env.BUCKET.put(key, arrayBuffer, {
          httpMetadata: { contentType: file.type },
          customMetadata: { uploadedBy: uid, originalName: file.name },
        });
      } catch (err) {
        return jsonResponse({ error: "Upload to R2 failed", detail: err.message }, 500, corsHeaders);
      }

      const publicBase = env.R2_PUBLIC_URL || url.origin;
      const publicUrl = `${publicBase}/${key}`;

      return jsonResponse({ url: publicUrl, key }, 200, corsHeaders);
    }

    // DELETE /media/:key
    if (url.pathname.startsWith("/media/") && request.method === "DELETE") {
      const authHeader = request.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "").trim();

      if (!token) return jsonResponse({ error: "Missing auth token" }, 401, corsHeaders);

      const uid = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
      if (!uid) return jsonResponse({ error: "Invalid or expired token" }, 403, corsHeaders);

      const key = decodeURIComponent(url.pathname.replace("/media/", ""));

      if (!key.includes(`/${uid}/`)) {
        return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
      }

      await env.BUCKET.delete(key);
      return jsonResponse({ deleted: true, key }, 200, corsHeaders);
    }

    // GET /:key
    if (request.method === "GET") {
      const key = url.pathname.slice(1);
      if (!key) return new Response("Not found", { status: 404, headers: corsHeaders });

      const object = await env.BUCKET.get(key);
      if (!object) return new Response("Not found", { status: 404, headers: corsHeaders });

      return new Response(object.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function b64Decode(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded  = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
  return atob(padded);
}

function b64DecodeBytes(str) {
  const binary = b64Decode(str);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

// ── Token verification using JWK endpoint (fixes X.509 spki import bug) ───────
async function verifyFirebaseToken(idToken, projectId) {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const header  = JSON.parse(b64Decode(headerB64));
    const payload = JSON.parse(b64Decode(payloadB64));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now)         return null;  // expired
    if (payload.iat > now + 300)   return null;  // issued in the future
    if (payload.aud !== projectId) return null;  // wrong project
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;

    // ✅ Use JWK endpoint — Web Crypto can import these directly.
    // The old x509 endpoint returned PEM certs which require parsing the
    // SubjectPublicKeyInfo out of the full certificate, which Cloudflare
    // Workers' Web Crypto doesn't support via "spki" directly.
    const keysRes = await fetch(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
      { cf: { cacheTtl: 3600 } }
    );
    const { keys } = await keysRes.json();
    const jwk = keys.find(k => k.kid === header.kid);
    if (!jwk) return null;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signed    = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = b64DecodeBytes(sigB64);

    const valid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      publicKey,
      signature,
      signed
    );

    return valid ? (payload.user_id || payload.sub) : null;
  } catch (e) {
    console.error("Token verify error:", e);
    return null;
  }
}