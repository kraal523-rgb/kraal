import React from "react";
import { LIVESTOCK_CATEGORIES } from "../../hooks/useListing";

export default function StepReview({ form, onSubmit, onBack, loading, error }) {
  const category = LIVESTOCK_CATEGORIES.find((c) => c.id === form.categoryId);
  const breed = form.breed === "Other" ? form.customBreed : form.breed;
  const qty = parseInt(form.quantity) || 1;
  const total =
    form.price && qty > 1 && form.pricePerHead
      ? `${form.currency} ${(parseFloat(form.price) * qty).toLocaleString()} total`
      : null;

  return (
    <div className="step-form">
      <div className="step-header">
        <h2 className="step-title">Review your listing</h2>
        <p className="step-sub">
          This is how buyers will see it. Looks good? Hit publish.
        </p>
      </div>

      {/* Preview card */}
      <div className="preview-card">
        {/* Cover photo */}
        {form.photos.length > 0 ? (
          <div className="preview-photos">
            <img
              src={form.photos[0].preview}
              alt="Cover"
              className="preview-cover"
            />
            {form.photos.length > 1 && (
              <div className="preview-thumbs">
                {form.photos.slice(1, 4).map((p, i) => (
                  <img
                    key={i}
                    src={p.preview}
                    alt=""
                    className="preview-thumb"
                  />
                ))}
                {form.photos.length > 4 && (
                  <div className="preview-more">+{form.photos.length - 4}</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="preview-no-photo">
            <span>{category?.emoji}</span>
            <p>No photos added</p>
          </div>
        )}

        <div className="preview-body">
          <div className="preview-top">
            <h3 className="preview-title">
              {form.title || `${breed} ${category?.label}`}
            </h3>
            <div className="preview-badges">
              {form.negotiable && (
                <span className="badge amber">Negotiable</span>
              )}
              {form.deliveryAvailable && (
                <span className="badge green">Delivery</span>
              )}
            </div>
          </div>

          <div className="preview-price">
            <strong>
              {form.currency} {parseFloat(form.price || 0).toLocaleString()}
            </strong>
            {qty > 1 && form.pricePerHead && <span> / head</span>}
            {total && <span className="price-total-inline"> · {total}</span>}
          </div>

          <div className="preview-meta">
            <MetaItem icon="🐾" label={`${breed} ${category?.label}`} />
            <MetaItem icon="📦" label={`Qty: ${form.quantity}`} />
            {form.gender && <MetaItem icon="⚧" label={form.gender} />}
            {form.ageValue && (
              <MetaItem icon="🗓" label={`${form.ageValue} ${form.ageUnit}`} />
            )}
            {form.weight && (
              <MetaItem icon="⚖️" label={`${form.weight} ${form.weightUnit}`} />
            )}
            <MetaItem icon="✅" label={form.condition} />
          </div>

          {(form.vaccinated || form.dewormed || form.castrated) && (
            <div className="preview-health">
              {form.vaccinated && (
                <span className="health-tag">💉 Vaccinated</span>
              )}
              {form.dewormed && <span className="health-tag">🩺 Dewormed</span>}
              {form.castrated && (
                <span className="health-tag">✂️ Castrated</span>
              )}
            </div>
          )}

          {form.description && (
            <p className="preview-desc">
              {form.description.slice(0, 180)}
              {form.description.length > 180 ? "…" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Summary checklist */}
      <div className="review-checklist">
        <CheckRow
          ok={!!form.categoryId && !!form.breed}
          label="Animal type & breed"
          onFix={() => {}}
          step={0}
        />
        <CheckRow
          ok={!!form.title && !!form.gender}
          label="Title, gender & details"
          step={1}
        />
        <CheckRow
          ok={form.photos.length > 0}
          label={`Photos (${form.photos.length} added)`}
          warn={form.photos.length === 0}
          step={2}
        />
        <CheckRow
          ok={!!form.price && parseFloat(form.price) > 0}
          label={`Price: ${form.currency} ${form.price || "—"}`}
          step={3}
        />
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="btn-row">
        <button
          type="button"
          className="btn-ghost"
          onClick={onBack}
          disabled={loading}
        >
          Back
        </button>
        <button
          type="button"
          className="btn-primary large"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? "Publishing…" : "🚀 Publish listing"}
        </button>
      </div>
    </div>
  );
}

function MetaItem({ icon, label }) {
  return (
    <span className="meta-item">
      {icon} {label}
    </span>
  );
}

function CheckRow({ ok, label, warn }) {
  return (
    <div className={`check-row ${ok ? "ok" : warn ? "warn" : "missing"}`}>
      <span className="check-icon-sm">{ok ? "✓" : warn ? "!" : "○"}</span>
      <span>{label}</span>
    </div>
  );
}
