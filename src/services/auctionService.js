// Web: put in src/services/auctionService.js
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export const CATEGORIES = ["bulls", "cows", "calves", "steers", "heifers"];

const auctionsRef = () => collection(db, "auctions");
export const DAY = 24 * 60 * 60 * 1000;
function requireUser() {
  const user = auth.currentUser;
  if (!user)
    throw Object.assign(new Error("Please sign in."), {
      code: "app/signed-out",
    });
  return user;
}

function toAuction(snap) {
  const data = snap.data();
  return { id: snap.id, ...data, startsAt: data.startsAt?.toDate() ?? null };
}

// Only the fields an auctioneer is allowed to edit
function cleanInput(input) {
  const startsAt = new Date(input.startsAt);
  if (!input.title?.trim()) throw new Error("Sale title is required.");
  if (!input.venue?.trim()) throw new Error("Venue is required.");
  if (Number.isNaN(startsAt.getTime()))
    throw new Error("Sale date and time are required.");

  const headCount = {};
  CATEGORIES.forEach((c) => {
    headCount[c] = Math.max(0, parseInt(input.headCount?.[c], 10) || 0);
  });

  return {
    title: input.title.trim(),
    venue: input.venue.trim(),
    province: input.province || "",
    saleType: input.saleType || "commercial", // commercial | stud | slaughter
    startsAt,
    headCount,
    totalHead: CATEGORIES.reduce((sum, c) => sum + headCount[c], 0),
    photos: input.photos || [],
    notes: input.notes || "",
    contactPhone: input.contactPhone || "",
    whatsapp: input.whatsapp || "",
    // The auctioneer's own bidding / registration page
    registrationUrl: input.registrationUrl || "",
     expireAt: new Date(startsAt.getTime() + 7 * DAY),
  };
}

/* ───── Everyone ───── */
export async function fetchUpcomingAuctions(max = 30) {
  // Keeps today's sales visible for 12 hours after they start
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const snap = await getDocs(
    query(
      auctionsRef(),
      where("startsAt", ">=", since),
      orderBy("startsAt", "asc"),
      limit(max),
    ),
  );
  return snap.docs.map(toAuction);
}

export async function fetchSaleResults(max = 50) {
  const snap = await getDocs(
    query(
      auctionsRef(),
      where("startsAt", "<", new Date()),
      orderBy("startsAt", "desc"),
      limit(max),
    ),
  );
  return snap.docs.map(toAuction).filter((a) => a.status === "completed");
}

export async function fetchAuction(id) {
  const snap = await getDoc(doc(db, "auctions", id));
  return snap.data() ? toAuction(snap) : null;
}

/* ───── Verified auctioneers (enforced by Firestore rules) ───── */
export async function createAuction(profile, input) {
  const user = requireUser();
  const ref = await addDoc(auctionsRef(), {
    ...cleanInput(input),
    auctioneerId: user.uid,
    auctioneerName: profile?.displayName || "",
    status: "scheduled", // scheduled | cancelled | completed
    results: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAuction(id, input) {
  requireUser();
  await updateDoc(doc(db, "auctions", id), {
    ...cleanInput(input),
    updatedAt: serverTimestamp(),
  });
}

// e.g. a disease outbreak stops the sale
export async function cancelAuction(id, reason = "") {
  requireUser();
  await updateDoc(doc(db, "auctions", id), {
    status: "cancelled",
    cancelReason: reason,
    updatedAt: serverTimestamp(),
  });
}

// results: [{ category: "steers", sold: 190, avgPriceUsd: 0, topPriceUsd: 0 }]
export async function publishResults(id, results) {
  requireUser();
  await updateDoc(doc(db, "auctions", id), {
    status: "completed",
    results,
    updatedAt: serverTimestamp(),
  });
}

export async function fetchInterestedBuyers(auctionId) {
  requireUser();
  const snap = await getDocs(
    collection(db, "auctions", auctionId, "interests"),
  );
  return snap.docs.map((d) => d.data());
}

/* ───── Buyers ───── */
// Tell the user their name and number will be shared before calling this
export async function registerInterest(auctionId, { name, phone }, expireAt) {
  const user = requireUser();
  await setDoc(doc(db, "auctions", auctionId, "interests", user.uid), {
    uid: user.uid,
    name: name || "",
    phone: phone || "",
    createdAt: serverTimestamp(),
    expireAt: expireAt || new Date(Date.now() + 30 * DAY),
  });
}

export async function hasInterest(auctionId) {
  const user = auth.currentUser;
  if (!user) return false;
  const snap = await getDoc(
    doc(db, "auctions", auctionId, "interests", user.uid),
  );
  return !!snap.data();
}

export async function removeInterest(auctionId) {
  const user = requireUser();
  await deleteDoc(doc(db, "auctions", auctionId, "interests", user.uid));
}
