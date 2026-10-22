import { useState } from "react";
import { collection, doc,  getDoc,  runTransaction,  serverTimestamp, } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { uploadImage } from "../lib/cloudflare";
import useAuthStore from "../store/useAuthStore";

export const LISTING_STEPS = {
  ANIMAL: 0,
  DETAILS: 1,
  PHOTOS: 2,
  PRICING: 3,
  REVIEW: 4,
  DONE: 5,
};
export const LISTING_STEP_LABELS = [
  "Animal",
  "Details",
  "Photos",
  "Pricing",
  "Review",
];

export const LIVESTOCK_CATEGORIES = [
  {
    id: "cattle",
    label: "Cattle",
    emoji: "🐄",
    breeds: [
      "Brahman",
      "Hereford",
      "Angus",
      "Nguni",
      "Mashona",
      "Afrikaner",
      "Simmental",
      "Limousin",
      "Other",
    ],
  },
  {
    id: "goats",
    label: "Goats",
    emoji: "🐐",
    breeds: [
      "Boer",
      "Kalahari Red",
      "Indigenous",
      "Saanen",
      "Toggenburg",
      "Other",
    ],
  },
  {
    id: "sheep",
    label: "Sheep",
    emoji: "🐑",
    breeds: ["Merino", "Dorper", "Damara", "Mutton Merino", "Romney", "Other"],
  },
  {
    id: "chicken",
    label: "Chickens (Road Runner)",
    emoji: "🐓",
    breeds: ["Road Runner", "Broiler", "Layer", "Indigenous", "Other"],
  },
  {
    id: "guinea",
    label: "Guinea Fowl",
    emoji: "🦤",
    breeds: ["Helmeted", "Crested", "Other"],
  },
  {
    id: "ducks",
    label: "Ducks",
    emoji: "🦆",
    breeds: ["Pekin", "Muscovy", "Khaki Campbell", "Indigenous", "Other"],
  },
  {
    id: "rabbits",
    label: "Rabbits",
    emoji: "🐇",
    breeds: [
      "New Zealand White",
      "Chinchilla",
      "Rex",
      "Flemish Giant",
      "Other",
    ],
  },
  {
    id: "turkey",
    label: "Turkey",
    emoji: "🦃",
    breeds: ["Bronze", "White Holland", "Narragansett", "Other"],
  },
  {
    id: "pigs",
    label: "Pigs",
    emoji: "🐖",
    breeds: ["Large White", "Landrace", "Duroc", "Berkshire", "Other"],
  },
  {
    id: "horses",
    label: "Horses",
    emoji: "🐴",
    breeds: ["Thoroughbred", "Arabian", "Quarter Horse", "Warmblood", "Other"],
  },
  {
    id: "donkeys",
    label: "Donkeys",
    emoji: "🫏",
    breeds: ["Standard", "Miniature", "Other"],
  },
  { id: "other", label: "Other", emoji: "🐾", breeds: ["Other"] },
];

export const GENDERS = ["Male", "Female", "Mixed (lot)"];
export const AGE_UNITS = ["Days", "Weeks", "Months", "Years"];
export const CONDITIONS = ["Excellent", "Good", "Fair"];
export const CURRENCIES = ["USD", "ZWL", "ZAR", "BWP", "ZMW"];

const INITIAL_FORM = {
  // Step 0 - Animal type
  categoryId: "",
  breed: "",
  customBreed: "",

  // Step 1 - Details
  title: "",
  description: "",
  gender: "",
  ageValue: "",
  ageUnit: "Months",
  quantity: "1",
  weight: "",
  weightUnit: "kg",
  condition: "Good",
  vaccinated: false,
  dewormed: false,
  castrated: false,

  // Step 2 - Photos
  photos: [], // [{ file, preview, url, id }]

  // Step 3 - Pricing
  price: "",
  currency: "USD",
  negotiable: false,
  pricePerHead: true,
  deliveryAvailable: false,
  deliveryNotes: "",
};

export function useListing() {
  const [step, setStep] = useState(LISTING_STEPS.ANIMAL);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listingId, setListingId] = useState(null);

  const update = (fields) => setForm((f) => ({ ...f, ...fields }));

  const selectedCategory = LIVESTOCK_CATEGORIES.find(
    (c) => c.id === form.categoryId,
  );

  const addPhotos = (files) => {
    const newPhotos = Array.from(files)
      .slice(0, 8 - form.photos.length)
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        url: null,
        id: null,
      }));
    setForm((f) => ({ ...f, photos: [...f.photos, ...newPhotos] }));
  };

  const removePhoto = (index) => {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }));
  };

  const reorderPhotos = (from, to) => {
    setForm((f) => {
      const photos = [...f.photos];
      const [moved] = photos.splice(from, 1);
      photos.splice(to, 0, moved);
      return { ...f, photos };
    });
  };
const resetForm = () => {
  setStep(LISTING_STEPS.ANIMAL);
  setForm(INITIAL_FORM);
  setError(null);
  setListingId(null);
};


  const nextStep = (validateFn) => {
    const err = validateFn?.(form);
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

const submitListing = async () => {
  setError(null);
  setLoading(true);
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Please sign in to post a listing");

    const token = await user.getIdToken();
    const sellerSnap = await getDoc(doc(db, "users", user.uid));
    const sellerData = sellerSnap.exists() ? sellerSnap.data() : {};

    const uploadedPhotos = await Promise.all(
      form.photos.map(async (p) => {
        if (p.url) return p;
        try {
          const result = await uploadImage(p.file, "listings", token);
          return { ...p, url: result.url, id: result.id };
        } catch {
          return { ...p, url: null }; // skip failed uploads gracefully
        }
      }),
    );

    const category = LIVESTOCK_CATEGORIES.find((c) => c.id === form.categoryId);

    const listing = {
      sellerId: user.uid,
      sellerEmail: user.email || "",
      sellerName: sellerData.businessName || user.displayName || "",  // 👈 add
      city: sellerData.city || "",       // 👈 add
      province: sellerData.province || "",  // 👈 add
      country: sellerData.country || "Zimbabwe",  // 👈 add
      categoryId: form.categoryId || "",
      categoryLabel: category?.label || "",
      breed: (form.breed === "Other" ? form.customBreed : form.breed) || "",
      title: form.title || "",
      description: form.description || "",
      gender: form.gender || "",
      age: form.ageValue && form.ageUnit ? `${form.ageValue} ${form.ageUnit}` : "",
      quantity: parseInt(form.quantity) || 1,
      weight: form.weight && form.weightUnit ? `${form.weight} ${form.weightUnit}` : "",
      condition: form.condition || "Good",
      vaccinated: form.vaccinated ?? false,
      dewormed: form.dewormed ?? false,
      castrated: form.castrated ?? false,
      photos: uploadedPhotos
        .filter((p) => p.url)
        .map((p) => ({ url: p.url || "", id: p.id || "" })),
      price: parseFloat(form.price) || 0,
      currency: form.currency || "USD",
      negotiable: form.negotiable ?? false,
      pricePerHead: form.pricePerHead ?? true,
      deliveryAvailable: form.deliveryAvailable ?? false,
      deliveryNotes: form.deliveryAvailable ? form.deliveryNotes || "" : "",
      views: 0,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

   const userRef = doc(db, "users", user.uid);
const listingRef = doc(collection(db, "listings")); // pre-generated id

const newBalance = await runTransaction(db, async (tx) => {
  const snap = await tx.get(userRef);
  const coins = snap.data()?.coins ?? 0;
  if (coins < 1) throw new Error("OUT_OF_COINS");
  tx.update(userRef, { coins: coins - 1 });
  tx.set(listingRef, listing);
  return coins - 1;
});

// Keep the UI balance in sync
const prev = useAuthStore.getState().userProfile;
useAuthStore.setState({
  userProfile: { ...prev, coins: newBalance },
  sellerProfile: { ...(useAuthStore.getState().sellerProfile ?? prev), coins: newBalance },
});

setListingId(listingRef.id);
setStep(LISTING_STEPS.DONE);
  } catch (e) {
  setError(
    e.message === "OUT_OF_COINS"
      ? "You're out of coins. Top up to publish this listing."
      : e.message,
  );
} finally {
    setLoading(false);
  }
};

  return {
    step,
    form,
    loading,
    error,
    listingId,
    selectedCategory,
    update,
    addPhotos,
    removePhoto,
    reorderPhotos,
    nextStep,
    prevStep,
    resetForm,
    submitListing,
    setError,
  };
}
