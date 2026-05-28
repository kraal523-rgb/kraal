import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import "./KraalOnboardingForm.css";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

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

const ANIMAL_OPTIONS = [
  "Cattle",
  "Goats",
  "Sheep",
  "Road Runners",
  "Pigs",
  "Rabbits",
  "Ducks",
  "Guinea Fowl",
  "Turkeys",
  "Horses / Donkeys",
  "Other",
];

const STEP_LABELS = {
  seller: ["Profile", "Your livestock", "Verify & submit"],
  buyer: ["Profile", "What you need", "Verify & submit"],
  transporter: ["Profile", "Transport info", "Verify & submit"],
};

const INITIAL_PROFILE = {
  firstName: "",
  lastName: "",
  whatsapp: "",
  email: "",
  province: "",
  town: "",
  contactPrefs: ["WhatsApp"],
};

const INITIAL_SELLER = {
  animalsSold: [],
  herdSize: "",
  sellFrequency: "",
  hasVaccRecords: false,
  hasDVFS: false,
  hasBrandReg: false,
  hasZIMRA: false,
  preferredCurrency: "USD",
  deliveryOption: "",
  farmName: "",
};

const INITIAL_BUYER = {
  animalsBuy: [],
  purchasePurpose: "",
  buyFrequency: "",
  budget: "",
  paymentMethod: "",
  travelRange: "",
};

const INITIAL_TRANSPORTER = {
  vehicleType: "",
  capacity: "",
  animalsTransport: [],
  operatingArea: "",
  pricingModel: "",
  hasDVFSTransport: false,
  hasRoadworthy: false,
  hasCommercialLicence: false,
  hasInsurance: false,
  hasWaterTrough: false,
  hasFeedStorage: false,
  hasSepPens: false,
  hasNonSlip: false,
  turnaround: "",
  availability: "",
  vehicleReg: "",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function CheckPill({ label, checked, onChange }) {
  return (
    <button
      type="button"
      className={`kof-pill${checked ? " kof-pill--on" : ""}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      {checked && <span className="kof-pill-tick">✓</span>}
      {label}
    </button>
  );
}

function MultiCheck({ options, value, onChange }) {
  const toggle = (opt) => {
    const next = value.includes(opt)
      ? value.filter((v) => v !== opt)
      : [...value, opt];
    onChange(next);
  };
  return (
    <div className="kof-pills-wrap">
      {options.map((opt) => (
        <CheckPill
          key={opt}
          label={opt}
          checked={value.includes(opt)}
          onChange={() => toggle(opt)}
        />
      ))}
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div className="kof-field">
      <label className="kof-label">
        {label}
        {required && <span className="kof-req"> *</span>}
      </label>
      {children}
      {hint && <p className="kof-hint">{hint}</p>}
    </div>
  );
}

function StepBar({ role, step }) {
  const labels = STEP_LABELS[role];
  return (
    <div className="kof-stepbar">
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "active" : "idle";
        return (
          <div key={i} className={`kof-step kof-step--${state}`}>
            <div className="kof-step-dot">{state === "done" ? "✓" : n}</div>
            <span>{label}</span>
            {i < labels.length - 1 && <div className="kof-step-line" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── STEP 1: Profile ─────────────────────────────────────────────────────────

function StepProfile({ data, onChange }) {
  const set = (k) => (e) => onChange({ ...data, [k]: e.target.value });
  const togglePref = (pref) => {
    const prefs = data.contactPrefs.includes(pref)
      ? data.contactPrefs.filter((p) => p !== pref)
      : [...data.contactPrefs, pref];
    onChange({ ...data, contactPrefs: prefs });
  };

  return (
    <div className="kof-section">
      <h3 className="kof-section-title">
        <span className="kof-section-icon">👤</span> Your profile
      </h3>
      <div className="kof-grid kof-grid--2">
        <Field label="First name" required>
          <input
            value={data.firstName}
            onChange={set("firstName")}
            placeholder="e.g. Tendai"
          />
        </Field>
        <Field label="Surname" required>
          <input
            value={data.lastName}
            onChange={set("lastName")}
            placeholder="e.g. Moyo"
          />
        </Field>
      </div>
      <div className="kof-grid kof-grid--2">
        <Field
          label="WhatsApp number"
          required
          hint="Include country code e.g. +263 77 …"
        >
          <input
            value={data.whatsapp}
            onChange={set("whatsapp")}
            placeholder="+263 77 123 4567"
            type="tel"
          />
        </Field>
        <Field label="Email address">
          <input
            value={data.email}
            onChange={set("email")}
            placeholder="you@example.com"
            type="email"
          />
        </Field>
      </div>
      <div className="kof-grid kof-grid--2">
        <Field label="Province" required>
          <select value={data.province} onChange={set("province")}>
            <option value="">Select province</option>
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Nearest town / city" required>
          <input
            value={data.town}
            onChange={set("town")}
            placeholder="e.g. Gweru"
          />
        </Field>
      </div>
      <Field label="Preferred contact method">
        <div className="kof-pills-wrap">
          {["WhatsApp", "Phone call", "SMS", "Email"].map((p) => (
            <CheckPill
              key={p}
              label={p}
              checked={data.contactPrefs.includes(p)}
              onChange={() => togglePref(p)}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

// ─── STEP 2A: Seller ─────────────────────────────────────────────────────────

function StepSeller({ data, onChange }) {
  const set = (k) => (e) => onChange({ ...data, [k]: e.target.value });
  const setB = (k) => (v) => onChange({ ...data, [k]: v });
  const toggle = (k) => () => onChange({ ...data, [k]: !data[k] });

  return (
    <div className="kof-section">
      <h3 className="kof-section-title">
        <span className="kof-section-icon">🐄</span> What you sell
      </h3>
      <Field label="Animals you typically sell" required>
        <MultiCheck
          options={ANIMAL_OPTIONS}
          value={data.animalsSold}
          onChange={setB("animalsSold")}
        />
      </Field>
      <div className="kof-grid kof-grid--2">
        <Field label="Typical herd / flock size">
          <select value={data.herdSize} onChange={set("herdSize")}>
            <option value="">Select range</option>
            <option>1 – 10 animals</option>
            <option>11 – 50 animals</option>
            <option>51 – 200 animals</option>
            <option>200+ animals</option>
          </select>
        </Field>
        <Field label="How often do you sell?">
          <select value={data.sellFrequency} onChange={set("sellFrequency")}>
            <option value="">Select frequency</option>
            <option>Regularly (weekly)</option>
            <option>Monthly</option>
            <option>Seasonally</option>
            <option>One-off / occasionally</option>
          </select>
        </Field>
      </div>

      <div className="kof-divider" />
      <h3 className="kof-section-title">
        <span className="kof-section-icon">📋</span> Compliance & health
      </h3>
      <Field label="Documents you hold">
        <div className="kof-pills-wrap">
          {[
            ["hasVaccRecords", "Vaccination records"],
            ["hasDVFS", "DVFS movement permit"],
            ["hasBrandReg", "Brand / ear-tag registration"],
            ["hasZIMRA", "ZIMRA tax registration"],
          ].map(([key, label]) => (
            <CheckPill
              key={key}
              label={label}
              checked={data[key]}
              onChange={toggle(key)}
            />
          ))}
        </div>
      </Field>
      <div className="kof-grid kof-grid--2">
        <Field label="Preferred currency">
          <select
            value={data.preferredCurrency}
            onChange={set("preferredCurrency")}
          >
            <option>USD</option>
            <option>ZiG</option>
            <option>ZAR</option>
            <option>Accepts all</option>
          </select>
        </Field>
        <Field label="Delivery / collection">
          <select value={data.deliveryOption} onChange={set("deliveryOption")}>
            <option value="">Select option</option>
            <option>Buyer collects only</option>
            <option>I can arrange transport</option>
            <option>Both options available</option>
          </select>
        </Field>
      </div>
      <Field label="Farm / business name (optional)">
        <input
          value={data.farmName}
          onChange={set("farmName")}
          placeholder="e.g. Moyo Family Farm"
        />
      </Field>
    </div>
  );
}

// ─── STEP 2B: Buyer ──────────────────────────────────────────────────────────

function StepBuyer({ data, onChange }) {
  const set = (k) => (e) => onChange({ ...data, [k]: e.target.value });
  const setB = (k) => (v) => onChange({ ...data, [k]: v });

  return (
    <div className="kof-section">
      <h3 className="kof-section-title">
        <span className="kof-section-icon">🛒</span> What you're looking for
      </h3>
      <Field label="Animals you want to buy" required>
        <MultiCheck
          options={[...ANIMAL_OPTIONS.slice(0, -1), "Any / just browsing"]}
          value={data.animalsBuy}
          onChange={setB("animalsBuy")}
        />
      </Field>
      <div className="kof-grid kof-grid--2">
        <Field label="Purpose of purchase" required>
          <select
            value={data.purchasePurpose}
            onChange={set("purchasePurpose")}
          >
            <option value="">Select purpose</option>
            <option>Breeding stock</option>
            <option>Fattening / resale</option>
            <option>Personal consumption</option>
            <option>Commercial farming</option>
            <option>Cultural / ceremonial</option>
          </select>
        </Field>
        <Field label="How often do you buy?">
          <select value={data.buyFrequency} onChange={set("buyFrequency")}>
            <option value="">Select frequency</option>
            <option>Regularly</option>
            <option>Monthly</option>
            <option>Seasonally</option>
            <option>One-off purchase</option>
          </select>
        </Field>
      </div>
      <div className="kof-grid kof-grid--2">
        <Field label="Typical budget per purchase">
          <select value={data.budget} onChange={set("budget")}>
            <option value="">Select range</option>
            <option>Under USD 200</option>
            <option>USD 200 – 1,000</option>
            <option>USD 1,000 – 5,000</option>
            <option>USD 5,000+</option>
          </select>
        </Field>
        <Field label="Preferred payment method">
          <select value={data.paymentMethod} onChange={set("paymentMethod")}>
            <option value="">Select method</option>
            <option>Cash (USD)</option>
            <option>EcoCash</option>
            <option>Innbucks</option>
            <option>Bank transfer</option>
            <option>ZiG mobile</option>
          </select>
        </Field>
      </div>
      <Field label="How far will you travel to collect?">
        <select value={data.travelRange} onChange={set("travelRange")}>
          <option value="">Select range</option>
          <option>Within my district only</option>
          <option>Within my province</option>
          <option>Anywhere in Zimbabwe</option>
          <option>Cross-border (SADC)</option>
        </select>
      </Field>
      <div className="kof-note">
        💡 After joining you can set up price alerts — we'll WhatsApp you when
        matching listings are posted.
      </div>
    </div>
  );
}

// ─── STEP 2C: Transporter ────────────────────────────────────────────────────

function StepTransporter({ data, onChange }) {
  const set = (k) => (e) => onChange({ ...data, [k]: e.target.value });
  const setB = (k) => (v) => onChange({ ...data, [k]: v });
  const toggle = (k) => () => onChange({ ...data, [k]: !data[k] });

  return (
    <div className="kof-section">
      <h3 className="kof-section-title">
        <span className="kof-section-icon">🚛</span> Your transport service
      </h3>
      <div className="kof-grid kof-grid--2">
        <Field label="Vehicle type" required>
          <select value={data.vehicleType} onChange={set("vehicleType")}>
            <option value="">Select type</option>
            <option>Pickup / bakkie (small loads)</option>
            <option>Cattle truck (medium)</option>
            <option>Large livestock truck</option>
            <option>Horse float / trailer</option>
            <option>Multiple vehicle types</option>
          </select>
        </Field>
        <Field
          label="Approximate capacity"
          required
          hint="e.g. 20 cattle or 80 goats per trip"
        >
          <input
            value={data.capacity}
            onChange={set("capacity")}
            placeholder="e.g. 20 cattle"
          />
        </Field>
      </div>
      <Field label="Animals you can transport">
        <MultiCheck
          options={[
            "Cattle",
            "Goats / Sheep",
            "Pigs",
            "Poultry",
            "Horses / Donkeys",
            "All livestock",
          ]}
          value={data.animalsTransport}
          onChange={setB("animalsTransport")}
        />
      </Field>
      <div className="kof-grid kof-grid--2">
        <Field label="Operating area" required>
          <select value={data.operatingArea} onChange={set("operatingArea")}>
            <option value="">Select coverage</option>
            <option>Local district only</option>
            <option>Province-wide</option>
            <option>Nationwide</option>
            <option>Cross-border (SADC)</option>
          </select>
        </Field>
        <Field label="Pricing model">
          <select value={data.pricingModel} onChange={set("pricingModel")}>
            <option value="">Select model</option>
            <option>Per head</option>
            <option>Per km / per trip</option>
            <option>Flat rate per route</option>
            <option>Negotiated per job</option>
          </select>
        </Field>
      </div>

      <div className="kof-divider" />
      <h3 className="kof-section-title">
        <span className="kof-section-icon">📋</span> Compliance
      </h3>
      <Field label="Permits & certificates you hold">
        <div className="kof-pills-wrap">
          {[
            ["hasDVFSTransport", "DVFS transport permit"],
            ["hasRoadworthy", "Roadworthy certificate"],
            ["hasCommercialLicence", "Commercial driving licence"],
            ["hasInsurance", "Insurance cover"],
          ].map(([key, label]) => (
            <CheckPill
              key={key}
              label={label}
              checked={data[key]}
              onChange={toggle(key)}
            />
          ))}
        </div>
      </Field>
      <Field label="Livestock welfare equipment on vehicle">
        <div className="kof-pills-wrap">
          {[
            ["hasWaterTrough", "Water troughs"],
            ["hasFeedStorage", "Feed storage"],
            ["hasSepPens", "Separation pens"],
            ["hasNonSlip", "Non-slip flooring"],
          ].map(([key, label]) => (
            <CheckPill
              key={key}
              label={label}
              checked={data[key]}
              onChange={toggle(key)}
            />
          ))}
        </div>
      </Field>
      <div className="kof-grid kof-grid--2">
        <Field label="Typical turnaround time">
          <select value={data.turnaround} onChange={set("turnaround")}>
            <option value="">Select</option>
            <option>Same day</option>
            <option>Overnight</option>
            <option>2 – 3 days</option>
            <option>Depends on distance</option>
          </select>
        </Field>
        <Field label="Availability">
          <select value={data.availability} onChange={set("availability")}>
            <option value="">Select</option>
            <option>Available now</option>
            <option>Weekdays only</option>
            <option>Weekends only</option>
            <option>On request</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

// ─── STEP 3: Verification ────────────────────────────────────────────────────

function StepVerify({ role, data, onChange }) {
  const set = (k) => (e) => onChange({ ...data, [k]: e.target.value });
  const toggleTerm = (t) => {
    const terms = data.agreedTerms?.includes(t)
      ? data.agreedTerms.filter((x) => x !== t)
      : [...(data.agreedTerms || []), t];
    onChange({ ...data, agreedTerms: terms });
  };

  return (
    <div className="kof-section">
      <h3 className="kof-section-title">
        <span className="kof-section-icon">🔒</span> Verification
      </h3>
      <div className="kof-note">
        Verified profiles get a <strong>blue tick ✓</strong> and rank higher in
        search results. Documents are reviewed within 24 hours.
      </div>
      <div className="kof-grid kof-grid--2">
        <Field label="National ID or passport number">
          <input
            value={data.nationalId || ""}
            onChange={set("nationalId")}
            placeholder="e.g. 63-123456 A 70"
          />
        </Field>
        <Field label="Upload ID photo (optional)">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => onChange({ ...data, idFile: e.target.files[0] })}
          />
        </Field>
      </div>

      {role === "seller" && (
        <div className="kof-grid kof-grid--2">
          <Field label="ZIMRA business number (if applicable)">
            <input
              value={data.zimraNumber || ""}
              onChange={set("zimraNumber")}
              placeholder="e.g. 2012345678"
            />
          </Field>
          <Field label="Upload livestock permit / brand cert">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                onChange({ ...data, permitFile: e.target.files[0] })
              }
            />
          </Field>
        </div>
      )}

      {role === "transporter" && (
        <div className="kof-grid kof-grid--2">
          <Field label="Vehicle registration number">
            <input
              value={data.vehicleReg || ""}
              onChange={set("vehicleReg")}
              placeholder="e.g. AEG 1234"
            />
          </Field>
          <Field label="Upload roadworthy / permit">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                onChange({ ...data, roadworthyFile: e.target.files[0] })
              }
            />
          </Field>
        </div>
      )}

      <div className="kof-divider" />
      <div className="kof-grid kof-grid--1">
        <Field label="How did you hear about Kraal?">
          <select value={data.referral || ""} onChange={set("referral")}>
            <option value="">Select source</option>
            <option>Friend / family referral</option>
            <option>WhatsApp group</option>
            <option>Facebook</option>
            <option>Radio</option>
            <option>Agritex / government extension officer</option>
            <option>Livestock auction / show</option>
            <option>Other</option>
          </select>
        </Field>
      </div>
      <Field label="Anything else you'd like us to know?">
        <textarea
          value={data.notes || ""}
          onChange={set("notes")}
          rows={3}
          placeholder="e.g. speciality breeds, regular routes, seasonal availability..."
        />
      </Field>

      <div className="kof-divider" />
      <Field label="Agreements" required>
        <div className="kof-pills-wrap">
          {[
            "I agree to Kraal's terms of use",
            "I confirm all information is accurate",
            "I consent to WhatsApp notifications",
          ].map((t) => (
            <CheckPill
              key={t}
              label={t}
              checked={data.agreedTerms?.includes(t)}
              onChange={() => toggleTerm(t)}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

// ─── SUCCESS ─────────────────────────────────────────────────────────────────

function SuccessScreen({ role }) {
  const messages = {
    seller:
      "We'll review your profile and send a WhatsApp confirmation within 24 hours. You can then post your first listing!",
    buyer:
      "Your buyer profile is live. Set up price alerts in your dashboard to get notified of matching listings.",
    transporter:
      "Your transport profile is under review. Once verified you'll appear in our transporter directory.",
  };
  return (
    <div className="kof-success">
      <div className="kof-success-icon">🎉</div>
      <h2>You're on the list!</h2>
      <p>{messages[role]}</p>
      <p className="kof-success-sub">
        Welcome to Kraal Market 🇿🇼 — from the farm gate to the world.
      </p>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function KraalOnboardingForm({ onComplete }) {
  const [role, setRole] = useState("seller");
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [sellerData, setSellerData] = useState(INITIAL_SELLER);
  const [buyerData, setBuyerData] = useState(INITIAL_BUYER);
  const [transData, setTransData] = useState(INITIAL_TRANSPORTER);
  const [verifyData, setVerifyData] = useState({
    nationalId: "",
    zimraNumber: "",
    vehicleReg: "",
    referral: "",
    notes: "",
    agreedTerms: [],
  });

  const TOTAL_STEPS = 3;
  const progress = Math.round((step / TOTAL_STEPS) * 100);

  // ── Validation ──
  const canProceed = () => {
    if (step === 1) {
      return (
        profile.firstName &&
        profile.lastName &&
        profile.whatsapp &&
        profile.province &&
        profile.town
      );
    }
    if (step === 2) {
      if (role === "seller") return sellerData.animalsSold.length > 0;
      if (role === "buyer")
        return buyerData.animalsBuy.length > 0 && buyerData.purchasePurpose;
      if (role === "transporter")
        return (
          transData.vehicleType && transData.capacity && transData.operatingArea
        );
    }
    if (step === 3) {
      return verifyData.agreedTerms?.length === 3;
    }
    return true;
  };

  // ── Submit to Firestore ──
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const roleData =
        role === "seller"
          ? sellerData
          : role === "buyer"
            ? buyerData
            : transData;

      await addDoc(collection(db, "registrations"), {
        role,
        profile,
        roleData,
        verification: {
          nationalId: verifyData.nationalId,
          zimraNumber: verifyData.zimraNumber || null,
          vehicleReg: verifyData.vehicleReg || null,
          referral: verifyData.referral,
          notes: verifyData.notes,
          agreedTerms: verifyData.agreedTerms,
        },
        status: "pending_review",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSubmitted(true);
      if (onComplete) onComplete({ role, profile });
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        "Something went wrong. Please try again or contact support on WhatsApp.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleSubmit();
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setStep(1);
  };

  if (submitted) return <SuccessScreen role={role} />;

  return (
    <div className="kof-wrap">
      {/* Header */}
      <div className="kof-header">
        <div className="kof-logo">🐄</div>
        <div>
          <h1 className="kof-title">Join Kraal Market</h1>
          <p className="kof-sub">
            Zimbabwe's livestock marketplace — free to register
          </p>
        </div>
      </div>

      {/* Role selector — only shown on step 1 */}
      {step === 1 && (
        <div className="kof-roles">
          <p className="kof-roles-label">I want to join as a:</p>
          <div className="kof-role-grid">
            {[
              {
                id: "seller",
                icon: "🏷️",
                label: "Seller",
                sub: "List and sell livestock",
              },
              {
                id: "buyer",
                icon: "🛒",
                label: "Buyer",
                sub: "Browse and buy animals",
              },
              {
                id: "transporter",
                icon: "🚛",
                label: "Transporter",
                sub: "Offer livestock haulage",
              },
            ].map(({ id, icon, label, sub }) => (
              <button
                key={id}
                type="button"
                className={`kof-role-card${role === id ? " kof-role-card--active" : ""}`}
                onClick={() => handleRoleChange(id)}
              >
                <span className="kof-role-icon">{icon}</span>
                <span className="kof-role-label">{label}</span>
                <span className="kof-role-sub">{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="kof-progress-wrap">
        <div className="kof-progress-track">
          <div className="kof-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <span className="kof-progress-pct">{progress}%</span>
      </div>

      {/* Step indicator */}
      <StepBar role={role} step={step} />

      {/* Step content */}
      {step === 1 && <StepProfile data={profile} onChange={setProfile} />}
      {step === 2 && role === "seller" && (
        <StepSeller data={sellerData} onChange={setSellerData} />
      )}
      {step === 2 && role === "buyer" && (
        <StepBuyer data={buyerData} onChange={setBuyerData} />
      )}
      {step === 2 && role === "transporter" && (
        <StepTransporter data={transData} onChange={setTransData} />
      )}
      {step === 3 && (
        <StepVerify role={role} data={verifyData} onChange={setVerifyData} />
      )}

      {/* Error */}
      {error && <p className="kof-error">{error}</p>}

      {/* Actions */}
      <div className="kof-actions">
        {step > 1 && (
          <button
            type="button"
            className="kof-btn kof-btn--back"
            onClick={() => setStep(step - 1)}
          >
            ← Back
          </button>
        )}
        <button
          type="button"
          className={`kof-btn kof-btn--primary${!canProceed() || submitting ? " kof-btn--disabled" : ""}`}
          onClick={handleNext}
          disabled={!canProceed() || submitting}
        >
          {submitting
            ? "Submitting…"
            : step === TOTAL_STEPS
              ? "Submit ✓"
              : "Next →"}
        </button>
      </div>
    </div>
  );
}
