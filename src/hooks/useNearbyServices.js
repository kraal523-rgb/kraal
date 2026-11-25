import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * collectionName: 'vets' | 'transporters'
 * location: { districtId, provinceId, ward }  (usually from the buyer's profile)
 */
export default function useNearbyServices(collectionName, location) {
  const { districtId, provinceId, ward } = location || {};
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!districtId && !provinceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);

    // Use the district if known, otherwise fall back to the whole province
    const q = districtId
      ? query(collection(db, collectionName), where("districtId", "==", districtId))
      : query(collection(db, collectionName), where("provinceId", "==", provinceId));

    getDocs(q)
      .then((snap) => {
        if (!alive) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Same ward first, everyone else after
        list.sort((a, b) => (b.ward === ward) - (a.ward === ward));
        setResults(list);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [collectionName, districtId, provinceId, ward]);

  return { results, loading, error };
}