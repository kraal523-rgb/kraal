import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const googleProvider = new GoogleAuthProvider();

const ROLE_COLLECTIONS = {
  buyer: "buyers",
  seller: "sellers",
  transporter: "transporters",
  vet: "vets",
  auctioneer: "auctioneers",
};

const roleCollectionFor = (role) => ROLE_COLLECTIONS[role] || "buyers";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      userProfile: null, // unified profile for all roles
      sellerProfile: null, // kept for existing seller components
      loading: true,
      error: null,

      // ── Auth listener ────────────────────────────────────────────────────────
      init: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              const profile = await get().fetchUserProfile(firebaseUser.uid);
              set({
                user: firebaseUser,
                userProfile: profile,
                sellerProfile: profile?.role === "seller" ? profile : null,
                loading: false,
              });
            } else {
              set({
                user: null,
                userProfile: null,
                sellerProfile: null,
                loading: false,
              });
            }
          } catch (e) {
            // Without this, a rules or network error leaves the app loading forever
            console.warn("Auth listener error:", e?.code, e?.message);
            set({ user: firebaseUser ?? null, loading: false });
          }
        });
        return unsubscribe;
      },

      // ── Registration ─────────────────────────────────────────────────────────
      registerWithEmail: async (email, password) => {
        set({ error: null });
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        // A failed verification email must not make sign-up look like it failed
        try {
          await sendEmailVerification(cred.user);
        } catch (e) {
          console.warn("Verification email failed:", e?.code);
        }
        return cred.user;
      },

      signInWithGoogle: async () => {
        set({ error: null });
        const cred = await signInWithPopup(auth, googleProvider);
        return cred.user;
      },

      // ── Create / resume a profile (all roles) ────────────────────────────────
      createSellerProfile: async (uid, profileData) => {
        const now = serverTimestamp();
        const role = profileData.role || "buyer";

        const userRef = doc(db, "users", uid);
        const existing = await getDoc(userRef);
        const existingData = existing.data();
        const isNew = !existingData;

        // Re-running registration for the same role is fine. Switching role is not.
        if (existingData?.role && existingData.role !== role) {
          const err = new Error(
            "This account is already registered. Please sign in.",
          );
          err.code = "app/account-exists";
          throw err;
        }

        // wallets/{uid} owns coins; only an admin sets verified
        // eslint-disable-next-line no-unused-vars
        const { coins, verified, ...roleData } = profileData;

        const common = {
          uid,
          email: profileData.email || "",
          // Only write phone if given, so migrated numbers aren't blanked
          ...(profileData.phone && { phone: profileData.phone }),
          role,
          province: profileData.province || "",
          provinceId: profileData.provinceId || "",
          district: profileData.district || "",
          districtId: profileData.districtId || "",
          ward: profileData.ward || "",
          city: profileData.city || "",
          updatedAt: now,
          ...(isNew && { verified: false, createdAt: now }),
        };

        // STEP 1: users/{uid} first so rules can resolve the role
        await setDoc(userRef, common, { merge: true });

        // STEP 2: role collection
        const roleDoc = {
          ...roleData,
          ...common,
          displayName: profileData.businessName || profileData.email || "",
          ...(role === "transporter" && {
            available: true,
            serviceProvinces: profileData.province
              ? [profileData.province]
              : [],
          }),
        };
        await setDoc(doc(db, roleCollectionFor(role), uid), roleDoc, {
          merge: true,
        });

        // Plain, serialisable copy for state (no server-timestamp sentinels)
        const profile = {
          ...roleDoc,
          verified: existingData?.verified ?? false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({
          userProfile: profile,
          sellerProfile: role === "seller" ? profile : null,
        });
        return profile;
      },

      // ── Fetch profile on login ───────────────────────────────────────────────
      fetchUserProfile: async (uid) => {
        const userSnap = await getDoc(doc(db, "users", uid));
        const userData = userSnap.data();
        if (!userData) {
          return get().fetchSellerProfile(uid); // legacy fallback
        }

        const { role } = userData;
        const profileSnap = await getDoc(doc(db, roleCollectionFor(role), uid));
        // `verified` always comes from users/{uid}, which only an admin can change
        const profile = {
          ...(profileSnap.data() || userData),
          role,
          verified: userData.verified ?? false,
        };

        set({
          userProfile: profile,
          sellerProfile: role === "seller" ? profile : null,
        });
        return profile;
      },

      // ── Legacy fallback ──────────────────────────────────────────────────────
      fetchSellerProfile: async (uid) => {
        const snap = await getDoc(doc(db, "sellers", uid));
        const data = snap.data();
        if (data) {
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
      getRole: () => get().userProfile?.role ?? null,
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "kraal-auth",
      partialize: (state) => ({
        sellerProfile: state.sellerProfile,
        userProfile: state.userProfile,
      }),
    },
  ),
);

export default useAuthStore;
