import { getAuth } from "@react-native-firebase/auth";

const API = "https://api.kraalmarket.com"; // your worker's public URL

async function call(path, { method = "POST", body } = {}) {
  const token = await getAuth().currentUser?.getIdToken();
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
    throw err;
  }
  return data;
}

export const buyCoins = (packId) => call("/api/coins/buy", { body: { packId } });
export const purchaseStatus = (reference) =>
  call(`/api/coins/purchase-status?reference=${encodeURIComponent(reference)}`, {
    method: "GET",
  });
export const postListing = (listingId) =>
  call("/api/coins/post-listing", { body: { listingId } });
export const acceptJob = (jobId) =>
  call("/api/coins/accept-job", { body: { jobId } });