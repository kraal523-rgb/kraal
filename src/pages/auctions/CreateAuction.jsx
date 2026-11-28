import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import { CATEGORIES, createAuction } from "../../services/auctionService";
import { uploadImage } from "../../lib/cloudflare";
import "./Auctions.css";

const PROVINCES = [
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

const MAX_PHOTOS = 6;
const MAX_MB = 5;

export default function CreateAuction() {
  const authLoading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.userProfile);
  const canPost =
    !!user && profile?.role === "auctioneer" && profile?.verified === true;

  // Wait for sign-in to load, so the form can start with the profile's details
  if (authLoading)
    return (
      <main className="auc-page">
        <p className="auc-muted">Loading…</p>
      </main>
    );

  if (!canPost) {
    return (
      <main className="auc-page">
        <p className="auc-notice">
          Only verified auctioneers can create sales.
        </p>
        <Link className="auc-back" to="/auctions">
          ← Back to sales
        </Link>
      </main>
    );
  }

  return <SaleForm profile={profile} />;
}

function SaleForm({ profile }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const fileInput = useRef(null);
  const [photos, setPhotos] = useState([]); // [{ file, preview }]
  const photosRef = useRef([]);

  // Keep the ref in step with state (refs may only be written in effects)
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Free the preview URLs when leaving the page
  useEffect(
    () => () =>
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)),
    [],
  );

  const addPhotos = (fileList) => {
    const incoming = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/"),
    );
    const tooBig = incoming.filter((f) => f.size > MAX_MB * 1024 * 1024);
    const ok = incoming.filter((f) => f.size <= MAX_MB * 1024 * 1024);
    const room = MAX_PHOTOS - photos.length;

    if (tooBig.length) setError(`Each photo must be under ${MAX_MB}MB.`);
    else if (ok.length > room)
      setError(`You can add up to ${MAX_PHOTOS} photos.`);
    else setError(null);

    setPhotos((prev) => [
      ...prev,
      ...ok.slice(0, room).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  };

  const removePhoto = (index) =>
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });

  const makeCover = (index) =>
    setPhotos((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);

  const [form, setForm] = useState({
    title: "",
    saleType: "commercial",
    venue: "",
    province: PROVINCES.includes(profile.province) ? profile.province : "",
    startsAt: "",
    headCount: {},
    contactPhone: profile.phone || "",
    whatsapp: profile.whatsapp || "",
    registrationUrl: "",
    notes: "",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false); // blocks a double click creating two sales

  const bind = (name) => ({
    id: `auc-${name}`,
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  const setCount = (category, text) =>
    setForm((f) => ({
      ...f,
      headCount: {
        ...f.headCount,
        [category]: text.replace(/\D/g, "").slice(0, 5),
      },
    }));

  const total = CATEGORIES.reduce(
    (sum, c) => sum + (Number(form.headCount[c]) || 0),
    0,
  );

  const submit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    setError(null);

    if (!form.title.trim()) return setError("Sale title is required.");
    if (!form.venue.trim()) return setError("Venue is required.");
    if (!form.province) return setError("Select a province.");
    const startsAt = new Date(form.startsAt); // read as the computer's local time
    if (Number.isNaN(startsAt.getTime()))
      return setError("Choose the sale date and time.");
    if (startsAt.getTime() <= Date.now())
      return setError("The sale must be in the future.");
    if (!form.contactPhone.trim())
      return setError("Contact phone is required.");
    const url = form.registrationUrl.trim();
    if (url && !/^https:\/\/\S+\.\S+$/i.test(url)) {
      return setError("The registration link must start with https://");
    }

    submitting.current = true;
    setSaving(true);
    try {
      // Upload first, so the sale is only saved once every photo is stored
      let photoUrls = [];
      if (photos.length) {
        const token = await user.getIdToken();
        photoUrls = await Promise.all(
          photos.map(
            async (p) => (await uploadImage(p.file, "auctions", token)).url,
          ),
        );
      }

      await createAuction(profile, {
        ...form,
        photos: photoUrls,
        startsAt,
        contactPhone: form.contactPhone.trim(),
        whatsapp: form.whatsapp.trim(),
        registrationUrl: url,
        notes: form.notes.trim(),
      });
      navigate("/auctions");
    } catch (err) {
      console.warn("Create sale failed:", err?.code, err?.message);
      setError(
        String(err?.code).includes("permission-denied")
          ? "Your account is not allowed to create sales yet."
          : "Could not save the sale or upload the photos. Check your connection and try again.",
      );
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <main className="auc-page auc-page--narrow">
      <Link className="auc-back" to="/auctions">
        ← Back to sales
      </Link>
      <h1>Create sale</h1>

      <form className="auc-form" onSubmit={submit} noValidate>
        <label htmlFor="auc-title">Sale title *</label>
        <input {...bind("title")} placeholder="e.g. Mt Hampden Cattle Sale" />

        <label htmlFor="auc-saleType">Sale type</label>
        <select {...bind("saleType")}>
          <option value="commercial">Commercial</option>
          <option value="stud">Stud</option>
          <option value="slaughter">Slaughter only</option>
        </select>

        <label htmlFor="auc-venue">Venue *</label>
        <input {...bind("venue")} placeholder="Sale pens or farm name" />

        <label htmlFor="auc-province">Province *</label>
        <select {...bind("province")}>
          <option value="">Select a province…</option>
          {PROVINCES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <label htmlFor="auc-startsAt">Date and start time *</label>
        <input {...bind("startsAt")} type="datetime-local" />

        <fieldset>
          <legend>Cattle on offer{total > 0 ? `: ${total} head` : ""}</legend>
          <div className="auc-counts">
            {CATEGORIES.map((c) => (
              <label key={c}>
                {c[0].toUpperCase() + c.slice(1)}
                <input
                  name={c}
                  inputMode="numeric"
                  placeholder="0"
                  value={form.headCount[c] || ""}
                  onChange={(e) => setCount(c, e.target.value)}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="auc-contactPhone">Contact phone *</label>
        <input
          {...bind("contactPhone")}
          type="tel"
          placeholder="+263 77 123 4567"
        />

        <label htmlFor="auc-whatsapp">WhatsApp</label>
        <input
          {...bind("whatsapp")}
          type="tel"
          placeholder="+263 77 123 4567"
        />

        <label htmlFor="auc-registrationUrl">
          Registration or bidding link
        </label>
        <input {...bind("registrationUrl")} type="url" placeholder="https://" />

        <fieldset>
          <legend>
            Photos{photos.length ? `: ${photos.length}/${MAX_PHOTOS}` : ""}
          </legend>
          <p className="auc-muted">
            Optional. The first photo is the cover. Max {MAX_MB}MB each.
          </p>

          {photos.length > 0 && (
            <div className="auc-photos">
              {photos.map((p, i) => (
                <div className="auc-photo" key={p.preview}>
                  <img src={p.preview} alt={`Sale photo ${i + 1}`} />
                  {i === 0 ? (
                    <span className="auc-photo-cover">Cover</span>
                  ) : (
                    <button
                      type="button"
                      className="auc-photo-cover auc-photo-cover--btn"
                      onClick={() => makeCover(i)}
                    >
                      Make cover
                    </button>
                  )}
                  <button
                    type="button"
                    className="auc-photo-remove"
                    onClick={() => removePhoto(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    disabled={saving}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              className="auc-action"
              onClick={() => fileInput.current?.click()}
              disabled={saving}
            >
              + Add photos
            </button>
          )}
          <input
            ref={fileInput}
            id="auc-photos"
            name="photos"
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = ""; // lets the same file be picked again
            }}
          />
        </fieldset>

        <label htmlFor="auc-notes">Notes</label>
        <textarea
          {...bind("notes")}
          rows={4}
          placeholder="Deposit, viewing times, conditions…"
        />

        {error && (
          <p className="auc-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="auc-button" disabled={saving}>
          {saving ? "Uploading & publishing…" : "Publish sale"}
        </button>
      </form>
    </main>
  );
}
