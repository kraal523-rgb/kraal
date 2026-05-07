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
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user found');

    // 🔍 DEBUG - remove these after fixing
    console.log('=== submitFinal DEBUG ===');
    console.log('User UID:', user.uid);
    console.log('User email:', user.email);
    console.log('WORKER_URL:', import.meta.env.VITE_UPLOAD_WORKER_URL);

    const token = await user.getIdToken(true); // true = force refresh
   console.log('Full token:', token);
    console.log('Token length:', token.length);

    if (form.businessName) {
      await updateProfile(user, { displayName: form.businessName });
    }

    let photoUrl = null;
    if (form.profilePhoto) {
      console.log('Attempting upload...');
      console.log('File:', form.profilePhoto.name, form.profilePhoto.type, form.profilePhoto.size);

      // 🔍 Raw fetch test so we can see exact Worker response
      const formData = new FormData();
      formData.append('file', form.profilePhoto);
      formData.append('folder', 'sellers');

      const testRes = await fetch(`${import.meta.env.VITE_UPLOAD_WORKER_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const testData = await testRes.json();
      console.log('Worker status:', testRes.status);
      console.log('Worker response:', testData); // ← this tells us exactly why it's 403

      if (!testRes.ok) {
        throw new Error(testData.error || `Upload failed (${testRes.status})`);
      }

      photoUrl = testData.url;
    }

    await createSellerProfile(user.uid, {
      email: form.email || user.email,
      businessName: form.businessName,
      phone: form.phone,
      whatsapp: form.whatsapp || form.phone,
      livestockTypes: form.livestockTypes,
      description: form.description || '',
      country: form.country,
      province: form.province,
      city: form.city,
      address: form.address || '',
      photoUrl,
    });

    setStep(STEPS.DONE);
  } catch (e) {
    console.error('submitFinal error:', e.message);
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