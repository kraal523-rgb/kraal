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
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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

  const roleCollection = role === 'seller'
    ? 'sellers'
    : role === 'transporter'
      ? 'transporters'
      : 'buyers';

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

  // ✅ STEP 1 — write users/{uid} FIRST so Firestore rules can resolve isRole()
  await setDoc(doc(db, 'users', uid), {
    uid,
    email:    profileData.email,
    role,
    province: profileData.province || "",
    city:     profileData.city || "",
    verified: false,
    createdAt: now,
    updatedAt: now,
  });

  // ✅ STEP 2 — now write the role collection (rules call isRole() which reads users/{uid})
  await setDoc(doc(db, roleCollection, uid), { ...profileData, ...userDoc });

  set({
    userProfile: userDoc,
    sellerProfile: role === 'seller' ? userDoc : null,
  });

  return userDoc;
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
        const roleCollection = role === 'seller'
          ? 'sellers'
          : role === 'transporter'
            ? 'transporters'
            : 'buyers';

        const profileSnap = await getDoc(doc(db, roleCollection, uid));
        const profile = profileSnap.exists()
          ? profileSnap.data()
          : userSnap.data(); // fall back to users doc if role doc missing

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