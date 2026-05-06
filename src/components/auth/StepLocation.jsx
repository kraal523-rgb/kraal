import React from 'react';
import { ZIMBABWE_PROVINCES } from '../../hooks/useRegister';

const COUNTRIES = [
  'Zimbabwe', 'South Africa', 'Zambia', 'Botswana',
  'Mozambique', 'Malawi', 'Tanzania', 'Kenya', 'Other',
];

function validateLocation(form) {
  if (!form.country) return 'Country is required.';
  if (!form.province.trim()) return 'Province or region is required.';
  if (!form.city.trim()) return 'City or town is required.';
  return null;
}

export default function StepLocation({ form, update, onNext, onBack, error }) {
  const isZimbabwe = form.country === 'Zimbabwe';

  const handleNext = (e) => {
    e.preventDefault();
    onNext(validateLocation);
  };

  const handleCountryChange = (e) => {
    // Reset province when switching away from Zimbabwe
    update({ country: e.target.value, province: '' });
  };

  return (
    <form className="step-form" onSubmit={handleNext} noValidate>
      <h2 className="step-title">Where are you located?</h2>
      <p className="step-sub">Buyers search by location to find livestock near them.</p>

      <div className="field">
        <label htmlFor="country">
          Country <span className="required">*</span>
        </label>
        <select
          id="country"
          value={form.country}
          onChange={handleCountryChange}
          required
        >
          <option value="">Select a country…</option>
          {COUNTRIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="province">
            Province <span className="required">*</span>
          </label>
          {isZimbabwe ? (
            <select
              id="province"
              value={form.province}
              onChange={e => update({ province: e.target.value })}
              required
            >
              <option value="">Select a province…</option>
              {ZIMBABWE_PROVINCES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          ) : (
            <input
              id="province"
              type="text"
              placeholder="Province or region"
              value={form.province}
              onChange={e => update({ province: e.target.value })}
              required
            />
          )}
        </div>

        <div className="field">
          <label htmlFor="city">
            City / Town <span className="required">*</span>
          </label>
          <input
            id="city"
            type="text"
            placeholder="e.g. Chinhoyi"
            value={form.city}
            onChange={e => update({ city: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="address">
          Farm address <span className="optional">(optional)</span>
        </label>
        <textarea
          id="address"
          rows={2}
          placeholder="Street address, farm name, or nearest landmark"
          value={form.address}
          onChange={e => update({ address: e.target.value })}
        />
        <span style={{ fontSize: '0.78rem', color: '#6B6860', marginTop: '4px' }}>
          Only shared with buyers after a confirmed sale.
        </span>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
        <button type="submit" className="btn-primary">Continue →</button>
      </div>
    </form>
  );
}