import { useState } from "react";
import { auth } from "../lib/firebase";
import { uploadImage } from "../lib/cloudflare";
import useAuthStore from "../store/useAuthStore";
import { updateProfile, onAuthStateChanged } from "firebase/auth";

export const STEPS = {
  ACCOUNT: 0,
  BUSINESS: 1,
  LOCATION: 2,
  PHOTO: 3,
  DONE: 4,
};

export const STEP_LABELS = ["Account", "Business", "Location", "Profile photo"];

// Roles a user can register as
export const ROLES = [
  {
    value: "buyer",
    label: "Buyer",
    emoji: "🛒",
    desc: "Browse and purchase livestock",
  },
  {
    value: "seller",
    label: "Seller / Farmer",
    emoji: "🌾",
    desc: "List and sell your animals",
  },
  {
    value: "transporter",
    label: "Transport Provider",
    emoji: "🚚",
    desc: "Deliver livestock between buyers and sellers",
  },
];

const INITIAL_FORM = {
  // Step 0 - Account
  email: "",
  password: "",
  confirmPassword: "",
  authMethod: "email", // 'email' | 'google'
  role: "", // 'buyer' | 'seller' | 'transporter'

  // Step 1 - Business
  businessName: "",
  phone: "",
  whatsapp: "",
  description: "",
  livestockTypes: [],
  vehicleType: "",  
  capacity: "",     
  // Step 2 - Location
  country: "Zimbabwe",
  province: "",
  city: "",
  address: "",

  // Step 3 - Photo
  profilePhoto: null,
  profilePhotoPreview: null,
};

export const LIVESTOCK_TYPES = [
  "Cattle",
  "Goats",
  "Sheep",
  "Chickens (Road Runner)",
  "Guinea Fowl",
  "Ducks",
  "Rabbits",
  "Turkey",
  "Pigs",
  "Horses",
  "Donkeys",
  "Other",
];

export const ZIMBABWE_PROVINCES = [
  "Harare",
  "Bulawayo",
  "Manicaland",
  "Mashonaland Central",
  "Mashonaland East",
  "Mashonaland West",
  "Masvingo",
  "Matabeleland North",
  "Matabeleland South",
  "Midlands",
];

export function useRegister() {
  const [step, setStep] = useState(STEPS.ACCOUNT);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);

  const { registerWithEmail, signInWithGoogle, createSellerProfile } =
    useAuthStore();

  const update = (fields) => setForm((f) => ({ ...f, ...fields }));

  const toggleLivestock = (type) => {
    setForm((f) => ({
      ...f,
      livestockTypes: f.livestockTypes.includes(type)
        ? f.livestockTypes.filter((t) => t !== type)
        : [...f.livestockTypes, type],
    }));
  };

  const getAuthenticatedUser = () => {
    return new Promise((resolve, reject) => {
      if (auth.currentUser) {
        resolve(auth.currentUser);
        return;
      }
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) resolve(user);
        else reject(new Error("No authenticated user found"));
      });
      setTimeout(() => reject(new Error("Auth timeout")), 5000);
    });
  };

  // Step 0: Create Firebase Auth account
  const submitAccount = async () => {
    setError(null);

    // Validate role is selected before proceeding
    if (!form.role) {
      setError("Please select how you want to use Kraal.");
      return;
    }

    setLoading(true);
    try {
      if (form.authMethod === "google") {
        const user = await signInWithGoogle();
        setFirebaseUser(user);
        update({ email: user.email });
      } else {
        if (form.password !== form.confirmPassword)
          throw new Error("Passwords do not match");
        if (form.password.length < 8)
          throw new Error("Password must be at least 8 characters");
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

  // Steps 1–2: Validate and advance
  const nextStep = (validationFn) => {
    const err = validationFn?.(form);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  // Step 3: Upload photo + save full profile to Firestore
  const submitFinal = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await getAuthenticatedUser();
      const token = await user.getIdToken(true);

      if (form.businessName) {
        await updateProfile(user, { displayName: form.businessName });
      }

      let photoUrl = null;
      if (form.profilePhoto) {
        const result = await uploadImage(form.profilePhoto, "sellers", token);
        photoUrl = result.url;
      }

      // createSellerProfile now receives role — update that function in
      // useAuthStore to write role into the Firestore users/{uid} document
      await createSellerProfile(user.uid, {
        email: form.email || user.email,
        businessName: form.businessName,
        phone: form.phone,
        whatsapp: form.whatsapp || form.phone,
        livestockTypes: form.livestockTypes,
        description: form.description || "",
        country: form.country,
        province: form.province,
        city: form.city,
        address: form.address || "",
        photoUrl,
        role: form.role, 
        available: form.role === "transporter",
        vehicleType: form.vehicleType || "",   
        capacity: form.capacity || "", 
      });

      setStep(STEPS.DONE);
    } catch (e) {
      console.error("submitFinal error:", e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Expose role so StepDone can redirect correctly
  return {
    step,
    form,
    loading,
    error,
    update,
    toggleLivestock,
    submitAccount,
    nextStep,
    prevStep,
    submitFinal,
    setError,
  };
}
