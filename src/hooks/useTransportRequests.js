import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
 
/**
 * @param {object} user - authenticated user object (needs uid + province set on their profile)
 * @param {object} opts
 * @param {string} opts.province - driver's serving province (defaults to user profile value)
 * @param {string} [opts.town]   - optional town filter
 */
export function useTransportRequests(user, { province, town } = {}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    if (!user?.uid || !province) {
      setLoading(false);
      return;
    }
 
    // Query open requests in this driver's province
    const q = query(
      collection(db, "transport_requests"),
      where("status", "==", "open"),
      where("pickupProvince", "==", province),
      orderBy("createdAt", "desc"),
    );
 
    const unsub = onSnapshot(
      q,
      (snap) => {
        let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
 
        // Client-side town filter (avoids a composite index)
        if (town?.trim()) {
          const townNorm = town.trim().toLowerCase();
          docs = docs.filter((r) => {
            const reqTown = (r.pickupTown || "").toLowerCase();
            return (
              !reqTown ||
              reqTown.includes(townNorm) ||
              townNorm.includes(reqTown)
            );
          });
        }
 
        setRequests(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Transport requests listener error:", err);
        setLoading(false);
      },
    );
 
    return unsub;
  }, [user?.uid, province, town]);
 
  return { requests, loading };
}