// eslint-disable-next-line no-unused-vars
import React from "react";
import { CURRENCIES } from "../../hooks/useListing";

export default function StepPricing({ form, update, onNext, onBack, error }) {
  const validate = (f) => {
    if (!f.price || parseFloat(f.price) <= 0) return "Please enter a price";
    return null;
  };

  const qty = parseInt(form.quantity) || 1;
  const total =
    form.price && qty > 1 && form.pricePerHead
      ? (parseFloat(form.price) * qty).toLocaleString()
      : null;

  return (
    <div className="step-form">
      <div className="step-header">
        <h2 className="step-title">Set your price</h2>
        <p className="step-sub">
          You can always update this later from your dashboard
        </p>
      </div>

      <div className="price-row">
        <div className="field currency-field">
          <label>Currency</label>
          <select
            value={form.currency}
            onChange={(e) => update({ currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field price-field">
          <label>
            Price <span className="required">*</span>
            {qty > 1 && (
              <span className="optional">
                {" "}
                — per {form.pricePerHead ? "head" : "lot"}
              </span>
            )}
          </label>
          <div className="price-input-wrap">
            <span className="currency-prefix">{form.currency}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => update({ price: e.target.value })}
              className="price-input"
            />
          </div>
        </div>
      </div>

      {total && (
        <div className="price-total">
          <span>Total for {qty} animals:</span>
          <strong>
            {form.currency} {total}
          </strong>
        </div>
      )}

      <div className="toggle-group">
        {qty > 1 && (
          <label className="toggle-row">
            <div className="toggle-info">
              <span>Price per head</span>
              <span className="toggle-desc">Buyers see price × quantity</span>
            </div>
            <ToggleSwitch
              checked={form.pricePerHead}
              onChange={(v) => update({ pricePerHead: v })}
            />
          </label>
        )}

        <label className="toggle-row">
          <div className="toggle-info">
            <span>Open to negotiation</span>
            <span className="toggle-desc">
              Show "Negotiable" badge on your listing
            </span>
          </div>
          <ToggleSwitch
            checked={form.negotiable}
            onChange={(v) => update({ negotiable: v })}
          />
        </label>

        <label className="toggle-row">
          <div className="toggle-info">
            <span>Delivery available</span>
            <span className="toggle-desc">
              You can arrange transport to the buyer
            </span>
          </div>
          <ToggleSwitch
            checked={form.deliveryAvailable}
            onChange={(v) => update({ deliveryAvailable: v })}
          />
        </label>
      </div>

      {form.deliveryAvailable && (
        <div className="field fade-in">
          <label>
            Delivery details <span className="optional">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Can deliver within 100km, buyer covers fuel"
            value={form.deliveryNotes}
            onChange={(e) => update({ deliveryNotes: e.target.value })}
          />
        </div>
      )}

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
          Review listing
        </button>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`toggle-switch ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-thumb" />
    </button>
  );
}
