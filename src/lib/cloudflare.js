// Expo exposes env vars prefixed with EXPO_PUBLIC_ at build time.
import { postFormData } from "./postForm";

// Expo replaces this public env reference at build time.
// eslint-disable-next-line no-undef
const WORKER_URL = import.meta.env.EXPO_PUBLIC_UPLOAD_WORKER_URL;

/**
 * Upload a single image to R2 through the Worker proxy.
 *
 * @param {string} uri      - Local file URI from expo-image-picker
 * @param {string} folder   - 'sellers' | 'listings'
 * @param {string} idToken  - Firebase ID token from user.getIdToken()
 * @returns {Promise<{ url: string, key: string }>}
 */
export async function uploadImage(uri, folder, idToken) {
  if (!WORKER_URL) {
    throw new Error("EXPO_PUBLIC_UPLOAD_WORKER_URL is not defined in your .env file.");
  }

  // Work out the file name and MIME type from the URI
  const name = uri.split("/").pop() || `photo-${Date.now()}.jpg`;
  const ext = (name.split(".").pop() || "jpg").toLowerCase();
  const type =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const body = new FormData();
  // React Native's FormData accepts { uri, name, type } in place of a File
  body.append("file", { uri, name, type });
  body.append("folder", folder);

  const res = await postFormData(`${WORKER_URL}/upload`, body, {
    Authorization: `Bearer ${idToken}`,
  });
  const data = res.data || {};
  if (!res.ok || !data.url) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return { url: data.url, key: data.key };
}

/**
 * Upload multiple listing photos in parallel (same order as input).
 * @param {string[]} uris
 */
export async function uploadListingPhotos(uris, idToken) {
  if (uris.length > 10) throw new Error("Maximum 10 photos per listing.");
  const results = await Promise.all(
    uris.map((uri) => uploadImage(uri, "listings", idToken)),
  );
  return results.map((r) => r.url);
}