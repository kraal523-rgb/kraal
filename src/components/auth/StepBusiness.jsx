import React from 'react';
import { LIVESTOCK_TYPES } from '../../hooks/useRegister';

function validateBusiness(form) {
  if (!form.businessName.trim()) return 'Farm or business name is required.';
  if (!form.phone.trim()) return 'Phone number is required.';
  if (form.livestockTypes.length === 0) return 'Select at least one livestock type.';
  return null;
}

export default function StepBusiness({ form, update, toggleLivestock, onNext, onBack, error }) {
  const handleNext = (e) => {
    e.preventDefault();
    onNext(validateBusiness);
  };

  return (
    <form className="step-form" onSubmit={handleNext} noValidate>
      <h2 className="step-title">Your business</h2>
      <p className="step-sub">Tell buyers who you are and what you sell.</p>

      <div className="field">
        <label htmlFor="businessName">
          Farm or business name <span className="required">*</span>
        </label>
        <input
          id="businessName"
          type="text"
          placeholder="e.g. Moyo Family Farm"
          value={form.businessName}
          onChange={e => update({ businessName: e.target.value })}
          required
        />
      </div>

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
            onChange={e => update({ phone: e.target.value })}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="whatsapp">
            WhatsApp number <span className="optional">(optional)</span>
          </label>
          <input
            id="whatsapp"
            type="tel"
            placeholder="Same as phone if blank"
            value={form.whatsapp}
            onChange={e => update({ whatsapp: e.target.value })}
          />
        </div>
      </div>

      <div className="field">
        <label>
          Livestock you sell <span className="required">*</span>
        </label>
        <div className="livestock-grid">
          {LIVESTOCK_TYPES.map(type => (
            <button
              key={type}
              type="button"
              className={`livestock-chip ${form.livestockTypes.includes(type) ? 'selected' : ''}`}
              onClick={() => toggleLivestock(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="description">
          About your farm <span className="optional">(optional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          placeholder="Tell buyers what makes your livestock special — breed, grazing method, certifications…"
          value={form.description}
          onChange={e => update({ description: e.target.value })}
        />
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
        <button type="submit" className="btn-primary">Continue →</button>
      </div>
    </form>
  );
}