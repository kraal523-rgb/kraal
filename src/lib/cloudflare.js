// Web version: uploads a browser File to R2 through the Worker.
const WORKER_URL = (import.meta.env.VITE_UPLOAD_WORKER_URL || "").replace(/\/$/, "");

/**
 * @param {File}   file     - File from an <input type="file">
 * @param {string} folder   - e.g. 'sellers' | 'listings' | 'auctions'
 * @param {string} idToken  - Firebase ID token from user.getIdToken()
 * @returns {Promise<{ url: string, key: string }>}
 */
export async function uploadImage(file, folder, idToken) {
  if (!WORKER_URL) {
    throw new Error("VITE_UPLOAD_WORKER_URL is not defined in your .env file.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);

  // Don't set Content-Type: the browser adds the multipart boundary itself
  const res = await fetch(`${WORKER_URL}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON error response */
  }
  if (!res.ok || !data.url) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return { url: data.url, key: data.key };
}

/** Upload several listing photos in parallel (same order as input). */
export async function uploadListingPhotos(files, idToken) {
  if (files.length > 10) throw new Error("Maximum 10 photos per listing.");
  const results = await Promise.all(
    files.map((f) => uploadImage(f, "listings", idToken)),
  );
  return results.map((r) => r.url);
}