import React from "react";
import { LIVESTOCK_TYPES } from "../../hooks/useRegister";

function validateBusiness(form) {
  if (!form.businessName.trim()) return "Farm or business name is required.";
  if (!form.phone.trim()) return "Phone number is required.";
  // Only sellers need to pick livestock types
  if (form.role === "seller" && form.livestockTypes.length === 0)
    return "Select at least one livestock type.";
  // Transporters need a vehicle type
  if (form.role === "transporter" && !form.vehicleType?.trim())
    return "Vehicle type is required.";
  return null;
}

// Role-specific copy
const ROLE_COPY = {
  seller: {
    title: "Your farm",
    sub: "Tell buyers who you are and what you sell.",
    namePlaceholder: "e.g. Moyo Family Farm",
    nameLabel: "Farm or business name",
  },
  buyer: {
    title: "Your details",
    sub: "Help sellers know who they are dealing with.",
    namePlaceholder: "e.g. Harare Meat Supplies",
    nameLabel: "Full name or business name",
  },
  transporter: {
    title: "Your transport business",
    sub: "Tell farmers how you can move their livestock.",
    namePlaceholder: "e.g. Bvunzawabaya Transport",
    nameLabel: "Business or trading name",
  },
};

const VEHICLE_TYPES = [
  "Cattle truck",
  "Flatbed",
  "Pickup / bakkie",
  "Horse box",
  "Mini truck",
  "Other",
];

export default function StepBusiness({
  form,
  update,
  toggleLivestock,
  onNext,
  onBack,
  error,
}) {
  const role = form.role || "seller";
  const copy = ROLE_COPY[role] ?? ROLE_COPY.seller;

  const handleNext = (e) => {
    e.preventDefault();
    onNext(validateBusiness);
  };

  return (
    <form className="step-form" onSubmit={handleNext} noValidate>
      <h2 className="step-title">{copy.title}</h2>
      <p className="step-sub">{copy.sub}</p>

      {/* ── Name field — all roles ── */}
      <div className="field">
        <label htmlFor="businessName">
          {copy.nameLabel} <span className="required">*</span>
        </label>
        <input
          id="businessName"
          type="text"
          placeholder={copy.namePlaceholder}
          value={form.businessName}
          onChange={(e) => update({ businessName: e.target.value })}
          required
        />
      </div>

      {/* ── Phone fields — all roles ── */}
      <div className="field-row">
        <div className="field">
          <label htmlFor="phone">
            Phone number <span className="required">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="+263 77 123 4567"
            value={form.phone}
            onChange={(e) => update({ phone: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="whatsapp">
            WhatsApp <span className="optional">(optional)</span>
          </label>
          <input
            id="whatsapp"
            type="tel"
            placeholder="Same as phone if blank"
            value={form.whatsapp}
            onChange={(e) => update({ whatsapp: e.target.value })}
          />
        </div>
      </div>

      {/* ── Seller only: livestock types ── */}
      {role === "seller" && (
        <div className="field">
          <label>
            Livestock you sell <span className="required">*</span>
          </label>
          <div className="livestock-grid">
            {LIVESTOCK_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`livestock-chip ${form.livestockTypes.includes(type) ? "selected" : ""}`}
                onClick={() => toggleLivestock(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Buyer only: what they're looking for ── */}
      {role === "buyer" && (
        <div className="field">
          <label>
            Livestock you buy <span className="optional">(optional)</span>
          </label>
          <div className="livestock-grid">
            {LIVESTOCK_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`livestock-chip ${form.livestockTypes.includes(type) ? "selected" : ""}`}
                onClick={() => toggleLivestock(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Transporter only: vehicle type ── */}
      {role === "transporter" && (
        <>
          <div className="field">
            <label>
              Vehicle type <span className="required">*</span>
            </label>
            <div className="livestock-grid">
              {VEHICLE_TYPES.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`livestock-chip ${form.vehicleType === v ? "selected" : ""}`}
                  onClick={() => update({ vehicleType: v })}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="capacity">
              Capacity <span className="optional">(optional)</span>
            </label>
            <input
              id="capacity"
              type="text"
              placeholder="e.g. Up to 20 cattle or 5 tonnes"
              value={form.capacity || ""}
              onChange={(e) => update({ capacity: e.target.value })}
            />
          </div>
        </>
      )}

      {/* ── About — seller and transporter only ── */}
      {role !== "buyer" && (
        <div className="field">
          <label htmlFor="description">
            {role === "transporter" ? "About your service" : "About your farm"}{" "}
            <span className="optional">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder={
              role === "transporter"
                ? "Routes covered, experience, special equipment…"
                : "Breed, grazing method, certifications…"
            }
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
          />
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <button type="submit" className="btn-primary">
          Continue →
        </button>
      </div>
    </form>
  );
}
