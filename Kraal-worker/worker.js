export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = (env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim());
    const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes("*");

    const corsHeaders = {
      "Access-Control-Allow-Origin": isAllowed ? origin : "",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ── POST /upload ──
    if (url.pathname === "/upload" && request.method === "POST") {

      // 1. Check auth token
      const authHeader = request.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "").trim();

      if (!token) {
        return new Response(JSON.stringify({ error: "Missing auth token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Parse FormData (matches what cloudflare.js sends)
      let file, folder;
      try {
        const formData = await request.formData();
        file = formData.get("file");
        folder = formData.get("folder") || "uploads";
      } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid form data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!file || typeof file === "string") {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Build a unique key: e.g. sellers/1746123456789-filename.jpg
      const ext = file.name.split(".").pop();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const key = `${folder}/${Date.now()}-${safeName}`;

      // 4. Upload to R2
      try {
        await env.BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: file.type || "application/octet-stream" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Upload to R2 failed", detail: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 5. Build public URL
      // If your R2 bucket has a public domain set in Cloudflare dashboard use that,
      // otherwise fall back to the worker URL
      const publicBase = env.R2_PUBLIC_URL || url.origin;
      const publicUrl = `${publicBase}/${key}`;

      return new Response(JSON.stringify({ url: publicUrl, key }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET /:key — serve a file ──
    if (request.method === "GET") {
      const key = url.pathname.slice(1);
      if (!key) {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }

      const object = await env.BUCKET.get(key);
      if (!object) {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }

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