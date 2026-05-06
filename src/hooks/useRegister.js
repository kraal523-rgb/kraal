import { useState } from 'react';
import { auth } from '../lib/firebase';
import { uploadImage } from '../lib/cloudflare';
import useAuthStore from '../store/useAuthStore';
import { updateProfile } from 'firebase/auth';
export const STEPS = {
  ACCOUNT: 0,
  BUSINESS: 1,
  LOCATION: 2,
  PHOTO: 3,
  DONE: 4,
};

export const STEP_LABELS = [
  'Account',
  'Business',
  'Location',
  'Profile photo',
];

const INITIAL_FORM = {
  // Step 0 - Account
  email: '',
  password: '',
  confirmPassword: '',
  authMethod: 'email', // 'email' | 'google'

  // Step 1 - Business
  businessName: '',
  phone: '',
  whatsapp: '',
  description: '',
  livestockTypes: [],

  // Step 2 - Location
  country: 'Zimbabwe',
  province: '',
  city: '',
  address: '',

  // Step 3 - Photo
  profilePhoto: null,
  profilePhotoPreview: null,
};

export const LIVESTOCK_TYPES = [
  'Cattle', 'Goats', 'Sheep', 'Chickens (Road Runner)',
  'Guinea Fowl', 'Ducks', 'Rabbits', 'Turkey',
  'Pigs', 'Horses', 'Donkeys', 'Other',
];

export const ZIMBABWE_PROVINCES = [
  'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central',
  'Mashonaland East', 'Mashonaland West', 'Masvingo',
  'Matabeleland North', 'Matabeleland South', 'Midlands',
];

export function useRegister() {
  const [step, setStep] = useState(STEPS.ACCOUNT);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);

  const { registerWithEmail, signInWithGoogle, createSellerProfile } = useAuthStore();

  const update = (fields) => setForm((f) => ({ ...f, ...fields }));

  const toggleLivestock = (type) => {
    setForm((f) => ({
      ...f,
      livestockTypes: f.livestockTypes.includes(type)
        ? f.livestockTypes.filter((t) => t !== type)
        : [...f.livestockTypes, type],
    }));
  };

  // Step 0: Create Firebase Auth account
const submitAccount = async () => {
  setError(null);
  setLoading(true);
  try {
    if (form.authMethod === 'google') {
      const user = await signInWithGoogle();
      setFirebaseUser(user);
      update({ email: user.email });
    } else {
      if (form.password !== form.confirmPassword) throw new Error('Passwords do not match');
      if (form.password.length < 8) throw new Error('Password must be at least 8 characters');
      const user = await registerWithEmail(form.email, form.password);
      setFirebaseUser(user);
    }
    setStep(STEPS.BUSINESS);
  } catch (e) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
};
  // Steps 1-2: Just validate and advance
  const nextStep = (validationFn) => {
    const err = validationFn?.(form);
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  // Step 3: Upload photo + save profile to Firestore
const submitFinal = async () => {
  setError(null);
  setLoading(true);
  try {
    const user = firebaseUser || auth.currentUser;
    if (!user) throw new Error('No authenticated user found');

    // ✅ Set displayName so it shows in the dashboard
    if (form.businessName) {
      await updateProfile(user, { displayName: form.businessName });
    }

    let photoUrl = null;
    if (form.profilePhoto) {
      const token = await user.getIdToken();
      const result = await uploadImage(form.profilePhoto, 'sellers', token);
      photoUrl = result.url;
    }

    await createSellerProfile(user.uid, {
      email: form.email || user.email,
      businessName: form.businessName,
      // ... rest stays the same
      photoUrl,
    });

    setStep(STEPS.DONE);
  } catch (e) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
};
  return {
    step, form, loading, error,
    update, toggleLivestock,
    submitAccount, nextStep, prevStep, submitFinal,
    setError,
  };
}