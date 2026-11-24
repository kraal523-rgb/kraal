// src/hooks/useCoins.js  (works on web; on mobile change the two imports)
import { useCallback, useEffect, useRef, useState } from "react";
import useAuthStore from "../store/useAuthStore";
import {
  getBalance,
  claimWelcomeBonus,
  postListing as postListingApi,
  acceptJob as acceptJobApi,
} from "../lib/coinsApi";

const COIN_ROLES = ["seller", "transporter"];
// Remember who we've already asked this session, so we don't spam the Worker.
const claimAttempted = new Set();

export default function useCoins() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.userProfile?.role);

  const [balance, setBalance] = useState(null); // null = not loaded yet
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return null;
    }
    try {
      const { balance: b } = await getBalance();
      if (alive.current) {
        setBalance(b);
        setError(null);
      }
      return b;
    } catch (e) {
      if (alive.current) setError(e.message);
      return null;
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [user]);

  // On load: quietly claim the welcome bonus (safe to repeat, the Worker returns
  // duplicate:true), then read the balance. This closes the "network blip at
  // registration" gap.
  useEffect(() => {
    if (!user) return;
    (async () => {
      if (COIN_ROLES.includes(role) && !claimAttempted.has(user.uid)) {
        claimAttempted.add(user.uid);
        try {
          await claimWelcomeBonus();
        } catch (e) {
          claimAttempted.delete(user.uid); // allow a retry on next mount
          console.warn("Welcome bonus check failed:", e.message);
        }
      }
      refresh();
    })();
  }, [user, role, refresh]);

  // Spend helpers: use the balance the Worker returns, else re-read it.
  const run = useCallback(
    async (fn) => {
      const r = await fn(); // throws; e.code === "INSUFFICIENT_COINS" when short
      if (typeof r?.balance === "number") setBalance(r.balance);
      else await refresh();
      return r;
    },
    [refresh],
  );

  return {
    balance,
    loading,
    error,
    refresh,
    postListing: (listingId) => run(() => postListingApi(listingId)),
    acceptJob: (jobId) => run(() => acceptJobApi(jobId)),
  };
}