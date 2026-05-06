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
      sellerProfile: null,
      loading: true,
      error: null,

      // Called once in App.jsx to listen for auth changes
      init: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const profile = await get().fetchSellerProfile(firebaseUser.uid);
            set({ user: firebaseUser, sellerProfile: profile, loading: false });
          } else {
            set({ user: null, sellerProfile: null, loading: false });
          }
        });
        return unsubscribe;
      },

      // Step 1: Create Firebase Auth account
      registerWithEmail: async (email, password) => {
        set({ error: null });
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        return cred.user;
      },

      // Google sign-in (also used for registration)
      signInWithGoogle: async () => {
        set({ error: null });
        const cred = await signInWithPopup(auth, googleProvider);
        return cred.user;
      },

      // Step 2: Save seller profile to Firestore after registration
      createSellerProfile: async (uid, profileData) => {
        const ref = doc(db, 'sellers', uid);
        const data = {
          ...profileData,
          uid,
          verified: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(ref, data);
        set({ sellerProfile: data });
        return data;
      },

      // Fetch existing seller profile
      fetchSellerProfile: async (uid) => {
        const ref = doc(db, 'sellers', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          set({ sellerProfile: data });
          return data;
        }
        return null;
      },

      signIn: async (email, password) => {
        set({ error: null });
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
      },

      logout: async () => {
        await signOut(auth);
        set({ user: null, sellerProfile: null });
      },

      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'kraal-auth',
      partialize: (state) => ({ sellerProfile: state.sellerProfile }),
    }
  )
);

export default useAuthStore;