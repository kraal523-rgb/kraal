import { useEffect, useState, useCallback } from "react";
import {
  doc, onSnapshot, setDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export default function useSaveListing(user, listing) {
  const [savedState, setSavedState] = useState({ key: null, value: false });
  const [busy, setBusy] = useState(false);
  const listingId = listing?.id;
  const saveKey = user?.uid && listingId ? `${user.uid}:${listingId}` : null;
  const saved = saveKey === savedState.key && savedState.value;

  // Live "is this saved?" state
  useEffect(() => {
    if (!user?.uid || !listingId) return;
    const ref = doc(db, "users", user.uid, "savedListings", listingId);
    return onSnapshot(
      ref,
      (snap) => setSavedState({ key: saveKey, value: snap.exists() }),
      () => setSavedState({ key: saveKey, value: false })
    );
  }, [user?.uid, listingId, saveKey]);

  // Returns false if the user isn't logged in (caller can redirect)
  const toggle = useCallback(async () => {
    if (!user?.uid) return false;
    if (!listingId || busy) return true;
    setBusy(true);
    const ref = doc(db, "users", user.uid, "savedListings", listingId);
    try {
      if (saved) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          listingId,
          sellerId: listing.sellerId || null,
          title: listing.title || "",
          price: listing.price ?? null,
          currency: listing.currency || "USD",
          categoryId: listing.categoryId || "",
          photo: listing.photos?.[0]?.url || null,
          savedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Save toggle failed:", err);
    } finally {
      setBusy(false);
    }
    return true;
  }, [user, listingId, listing, saved, busy]);

  return { saved, busy, toggle };
}