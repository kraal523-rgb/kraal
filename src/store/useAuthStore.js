import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction  } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const googleProvider = new GoogleAuthProvider();
export const STARTER_COINS = 5;
const COIN_ROLES = ['seller', 'transporter'];
const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      userProfile: null,   // unified profile for all roles (replaces sellerProfile)
      sellerProfile: null, // kept for backward compatibility with existing components
      loading: true,
      error: null,

      // ── Auth listener ────────────────────────────────────────────────────────
      init: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const profile = await get().fetchUserProfile(firebaseUser.uid);
            set({
              user: firebaseUser,
              userProfile: profile,
              // Mirror into sellerProfile so existing seller components don't break
              sellerProfile: profile?.role === 'seller' ? profile : null,
              loading: false,
            });
          } else {
            set({ user: null, userProfile: null, sellerProfile: null, loading: false });
          }
        });
        return unsubscribe;
      },

      // ── Registration ─────────────────────────────────────────────────────────
      registerWithEmail: async (email, password) => {
        set({ error: null });
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        return cred.user;
      },

      signInWithGoogle: async () => {
        set({ error: null });
        const cred = await signInWithPopup(auth, googleProvider);
        return cred.user;
      },

createSellerProfile: async (uid, profileData) => {
  const now = serverTimestamp();
  const role = profileData.role || 'buyer';

  const roleCollection = role === 'seller'      ? 'sellers'
    : role === 'transporter' ? 'transporters'
    : role === 'vet'         ? 'vets'
    : 'buyers';

  // Coins never go into the role doc. users/{uid} is the single source of truth.
  // eslint-disable-next-line no-unused-vars
  const { coins: _ignored, ...roleData } = profileData;

  // Keep an existing balance (USSD migration / retry / re-run registration)
  // so nobody can collect the 5 starter coins twice.
  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);
  const existingCoins =
    existing.exists() && typeof existing.data().coins === 'number'
      ? existing.data().coins
      : null;
  const coins = existingCoins ?? (COIN_ROLES.includes(role) ? STARTER_COINS : 0);

  const userDoc = {
    uid,
    email:       profileData.email,
    displayName: profileData.businessName || profileData.email,
    role,
    province:    profileData.province || "",
    city:        profileData.city || "",
    verified:    false,
    createdAt:   now,
    updatedAt:   now,
    ...(role === 'transporter' && { available: true }),
    ...(role === 'transporter' && {
      serviceProvinces: profileData.province ? [profileData.province] : [],
    }),
  };

  // STEP 1: write users/{uid} first so rules can resolve isRole().
  // merge:true keeps any fields copied over by the USSD migration.
  await setDoc(
    userRef,
    {
      uid,
      email:    profileData.email,
      role,
      province: profileData.province || "",
      city:     profileData.city || "",
      verified: false,
      coins,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  // STEP 2: role collection (no coins field)
  await setDoc(doc(db, roleCollection, uid), { ...roleData, ...userDoc });

  const profile = { ...userDoc, coins };
  set({
    userProfile: profile,
    sellerProfile: role === 'seller' ? profile : null,
  });

  return profile;
},

      // ── Fetch profile on login (checks role-specific collection) ────────────
      fetchUserProfile: async (uid) => {
        // First read users/{uid} to get the role
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (!userSnap.exists()) {
          // Fall back to legacy sellers/{uid} lookup for existing accounts
          return get().fetchSellerProfile(uid);
        }

        const { role } = userSnap.data();
        const roleCollection = role === 'seller'      ? 'sellers'
  : role === 'transporter' ? 'transporters'
  : role === 'vet'         ? 'vets'
  : 'buyers';

        const profileSnap = await getDoc(doc(db, roleCollection, uid));
        const profile = profileSnap.exists()
          ? { ...profileSnap.data(), coins: userSnap.data().coins ?? 0 }
  : userSnap.data();

        set({
          userProfile: profile,
          sellerProfile: role === 'seller' ? profile : null,
        });

        return profile;
      },

      // ── Legacy fallback — keeps existing seller components working ───────────
      fetchSellerProfile: async (uid) => {
        const snap = await getDoc(doc(db, 'sellers', uid));
        if (snap.exists()) {
          const data = snap.data();
          set({ sellerProfile: data, userProfile: data });
          return data;
        }
        return null;
      },

      // ── Sign in ──────────────────────────────────────────────────────────────
      signIn: async (email, password) => {
        set({ error: null });
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
      },

      // ── Logout ───────────────────────────────────────────────────────────────
      logout: async () => {
        await signOut(auth);
        set({ user: null, userProfile: null, sellerProfile: null });
      },
// ── Coins ────────────────────────────────────────────────────────────────
spendCoin: async (amount = 1) => {
  const uid = get().user?.uid;
  if (!uid) throw new Error('NOT_SIGNED_IN');
  const ref = doc(db, 'users', uid);

  const newBalance = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const coins = snap.data()?.coins ?? 0;
    if (coins < amount) throw new Error('OUT_OF_COINS');
    tx.update(ref, { coins: coins - amount });
    return coins - amount;
  });

  const prev = get().userProfile;
  set({
    userProfile: { ...prev, coins: newBalance },
    sellerProfile: prev?.role === 'seller' ? { ...prev, coins: newBalance } : get().sellerProfile,
  });
  return newBalance;
},
      // ── Helpers ──────────────────────────────────────────────────────────────
      // Convenience getter — use anywhere you need the current role
      getRole: () => get().userProfile?.role ?? null,

      setError:   (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'kraal-auth',
      partialize: (state) => ({
        sellerProfile: state.sellerProfile,
        userProfile:   state.userProfile,
      }),
    }
  )
);

export default useAuthStore;