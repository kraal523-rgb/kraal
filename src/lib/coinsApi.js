// src/lib/coinsApi.js  (WEB)
// Same Worker and same routes as the mobile app's services/coinsApi.js.
import { auth } from "./firebase";

const API = (
  import.meta.env.VITE_UPLOAD_WORKER_URL ||
  "https://kraal-upload.kraal523.workers.dev"
).replace(/\/$/, "");

async function call(path, { method = "POST", body } = {}) {
  const user = auth.currentUser;
  if (!user) {
    const err = new Error("Not signed in");
    err.code = "NOT_SIGNED_IN";
    throw err;
  }
  const token = await user.getIdToken();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    err.code = data.code; // "INSUFFICIENT_COINS" when out of coins
    err.balance = data.balance;
    err.required = data.required;
    throw err;
  }
  return data;
}

export const getBalance = () => call("/api/coins/balance", { method: "GET" });
export const buyCoins = (packId, extra = {}) =>
  call("/api/coins/buy", { body: { packId, ...extra } });
export const purchaseStatus = (reference) =>
  call(`/api/coins/purchase-status?reference=${encodeURIComponent(reference)}`, {
    method: "GET",
  });
export const postListing = (listingId) =>
  call("/api/coins/post-listing", { body: { listingId } });
export const acceptJob = (jobId) =>
  call("/api/coins/accept-job", { body: { jobId } });
export const claimWelcomeBonus = () => call("/api/coins/welcome-bonus");