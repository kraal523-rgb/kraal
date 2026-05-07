
const WORKER_URL = import.meta.env.VITE_UPLOAD_WORKER_URL;

/**
 * Upload a single image to R2 through the Worker proxy.
 *
 * @param {File}   file     - Image File from <input> or drag-and-drop
 * @param {string} folder   - 'sellers' | 'listings'
 * @param {string} idToken  - Firebase ID token from user.getIdToken()
 * @returns {Promise<{ url: string, key: string }>}
 */
export async function uploadImage(file, folder, idToken) {
  if (!WORKER_URL) {
    throw new Error('VITE_UPLOAD_WORKER_URL is not defined in your .env file.');
  }

  const body = new FormData();
  body.append('file', file);
  body.append('folder', folder);

  const res = await fetch(`${WORKER_URL}/upload`, {
    method: 'POST',
    headers: {
      // Do NOT set Content-Type — browser sets it automatically with the
      // multipart boundary when body is FormData
      Authorization: `Bearer ${idToken}`,
    },
    body,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }

  // data.url  — full public URL to store in Firestore
  // data.key  — R2 object key (useful for deletion later)
  return { url: data.url, key: data.key };
}

/**
 * Upload multiple listing photos in parallel.
 * Returns URLs in the same order as the input files array.
 *
 * @param {File[]}  files    - Array of image files (max 10)
 * @param {string}  idToken  - Firebase ID token
 * @returns {Promise<string[]>} - Ordered array of public URLs
 */
export async function uploadListingPhotos(files, idToken) {
  if (files.length > 10) {
    throw new Error('Maximum 10 photos per listing.');
  }

  const results = await Promise.all(
    files.map(file => uploadImage(file, 'listings', idToken))
  );

  return results.map(r => r.url);
}

/**
 * Delete an object from R2 (optional — call from a trusted backend or
 * Cloud Function, not directly from the client, unless your Worker has
 * a DELETE /media/:key route protected by Firebase auth).
 *
 * Placeholder — implement server-side deletion as needed.
 */
export async function deleteImage(_key, _idToken) {
  console.warn('deleteImage: implement a DELETE route in your Worker if needed.');
}