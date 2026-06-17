export async function uploadToR2(key, buffer, mimeType, env) {
  await env.BUCKET.put(key, buffer, {
    httpMetadata: { contentType: mimeType || "application/octet-stream" },
  });
  return key;
}
 
export function getPublicUrl(key, env) {
  const base = (env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (!base) {
    console.error("R2_PUBLIC_URL is not set — returning a relative path");
    return `/${key}`;
  }
  return `${base}/${key}`;
}
 