// eslint-disable-next-line no-unused-vars
import React from "react";
import { GENDERS, AGE_UNITS, CONDITIONS } from "../../hooks/useListing";

export default function StepDetails({
  form,
  update,
  selectedCategory,
  onNext,
  onBack,
  error,
}) {
  const validate = (f) => {
    if (!f.title.trim()) return "Please add a listing title";
    if (!f.gender) return "Please select the gender";
    if (!f.quantity || parseInt(f.quantity) < 1)
      return "Quantity must be at least 1";
    return null;
  };

  const autoTitle = () => {
    if (!form.title && selectedCategory && form.breed) {
      const breed = form.breed === "Other" ? form.customBreed : form.breed;
      const qty = parseInt(form.quantity) > 1 ? `${form.quantity}x ` : "";
      update({ title: `${qty}${breed} ${selectedCategory.label}` });
    }
  };

  return (
    <div className="step-form">
      <div className="step-header">
        <h2 className="step-title">Tell buyers about your animal</h2>
        <p className="step-sub">More detail = more trust = faster sale</p>
      </div>

      <div className="field">
        <label>
          Listing title <span className="required">*</span>
        </label>
        <input
          type="text"
          placeholder={`e.g. 2 Brahman Bulls, 18 months`}
          value={form.title}
          onChange={(e) => update({ title: e.target.value })}
          onFocus={autoTitle}
          maxLength={80}
        />
        <span className="field-hint">{form.title.length}/80</span>
      </div>

      <div className="field-row three">
        <div className="field">
          <label>
            Gender <span className="required">*</span>
          </label>
          <select
            value={form.gender}
            onChange={(e) => update({ gender: e.target.value })}
          >
            <option value="">Select</option>
            {GENDERS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>
            Quantity <span className="required">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="9999"
            value={form.quantity}
            onChange={(e) => update({ quantity: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Condition</label>
          <select
            value={form.condition}
            onChange={(e) => update({ condition: e.target.value })}
          >
            {CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row two">
        <div className="field">
          <label>
            Age <span className="optional">(optional)</span>
          </label>
          <div className="input-addon">
            <input
              type="number"
              min="0"
              placeholder="e.g. 18"
              value={form.ageValue}
              onChange={(e) => update({ ageValue: e.target.value })}
            />
            <select
              value={form.ageUnit}
              onChange={(e) => update({ ageUnit: e.target.value })}
            >
              {AGE_UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>
            Live weight <span className="optional">(optional)</span>
          </label>
          <div className="input-addon">
            <input
              type="number"
              min="0"
              placeholder="e.g. 450"
              value={form.weight}
              onChange={(e) => update({ weight: e.target.value })}
            />
            <select
              value={form.weightUnit}
              onChange={(e) => update({ weightUnit: e.target.value })}
            >
              <option>kg</option>
              <option>lbs</option>
            </select>
          </div>
        </div>
      </div>

      <div className="field">
        <label>
          Description <span className="optional">(optional)</span>
        </label>
        <textarea
          rows={4}
          placeholder="Describe your animal — health history, temperament, feeding routine, any standout qualities buyers should know…"
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
          maxLength={1000}
        />
        <span className="field-hint">{form.description.length}/1000</span>
      </div>

      <div className="field">
        <label>Health status</label>
        <div className="checkbox-row">
          {[
            { key: "vaccinated", label: "💉 Vaccinated" },
            { key: "dewormed", label: "🩺 Dewormed" },
            { key: "castrated", label: "✂️ Castrated" },
          ].map(({ key, label }) => (
            <label key={key} className="checkbox-label">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => update({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onNext(validate)}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
