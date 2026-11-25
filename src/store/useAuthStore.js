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
import { doc, setDoc, getDoc, serverTimestamp  } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const googleProvider = new GoogleAuthProvider();
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
  const roleCollection =
    role === 'seller' ? 'sellers'
    : role === 'transporter' ? 'transporters'
    : role === 'vet' ? 'vets'
    : 'buyers';

  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);
  const isNew = !existing.exists();

  // Re-running registration for the same role is fine (retry / resume).
  // Switching an existing account to a different role is not.
  if (!isNew && existing.data().role && existing.data().role !== role) {
    const err = new Error('This account is already registered. Please sign in.');
    err.code = 'app/account-exists';
    throw err;
  }

  // Coins are NOT stored here any more: wallets/{uid} (Worker) is the only
  // source of truth. Strip any stray coins field from the role doc too.
  // eslint-disable-next-line no-unused-vars
  const { coins: _ignored, ...roleData } = profileData;

  const common = {
    uid,
    email: profileData.email || '',
    role,
    province: profileData.province || '',
    provinceId: profileData.provinceId || '',
    district: profileData.district || '',
    districtId: profileData.districtId || '',
    ward: profileData.ward || '',
    city: profileData.city || '',
    updatedAt: now,
    // Only on first creation, so a re-run can't reset verification or the join date
    ...(isNew && { verified: false, createdAt: now }),
  };

  // STEP 1: users/{uid} first so rules can resolve isRole().
  // merge:true keeps fields from the USSD migration.
  await setDoc(userRef, common, { merge: true });

  // STEP 2: role collection
  const roleDoc = {
    ...roleData,
    ...common,
    displayName: profileData.businessName || profileData.email,
    ...(role === 'transporter' && {
      available: true,
      serviceProvinces: profileData.province ? [profileData.province] : [],
    }),
  };
  await setDoc(doc(db, roleCollection, uid), roleDoc, { merge: true });

  // Plain, serialisable copy for state (no server-timestamp sentinels)
  const { createdAt, updatedAt, ...rest } = roleDoc; // eslint-disable-line no-unused-vars
  const profile = { ...rest, createdAt: Date.now(), updatedAt: Date.now() };
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
        const profile = profileSnap.exists() ? profileSnap.data() : userSnap.data();

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