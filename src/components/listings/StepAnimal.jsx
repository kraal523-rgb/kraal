// eslint-disable-next-line no-unused-vars
import React from "react";
import { LIVESTOCK_CATEGORIES } from "../../hooks/useListing";

export default function StepAnimal({ form, update, onNext, error }) {
  const selected = LIVESTOCK_CATEGORIES.find((c) => c.id === form.categoryId);

  const validate = (f) => {
    if (!f.categoryId) return "Please select an animal type";
    if (!f.breed) return "Please select a breed";
    if (f.breed === "Other" && !f.customBreed.trim())
      return "Please enter the breed name";
    return null;
  };

  return (
    <div className="step-form">
      <div className="step-header">
        <h2 className="step-title">What are you selling?</h2>
        <p className="step-sub">
          Choose the type of livestock for this listing
        </p>
      </div>

      <div className="animal-grid">
        {LIVESTOCK_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`animal-card ${form.categoryId === cat.id ? "selected" : ""}`}
            onClick={() =>
              update({ categoryId: cat.id, breed: "", customBreed: "" })
            }
          >
            <span className="animal-emoji">{cat.emoji}</span>
            <span className="animal-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="field fade-in">
          <label>Breed</label>
          <div className="breed-grid">
            {selected.breeds.map((breed) => (
              <button
                key={breed}
                type="button"
                className={`breed-chip ${form.breed === breed ? "selected" : ""}`}
                onClick={() => update({ breed, customBreed: "" })}
              >
                {breed}
              </button>
            ))}
          </div>
          {form.breed === "Other" && (
            <input
              className="other-breed-input"
              type="text"
              placeholder="Enter breed name"
              value={form.customBreed}
              onChange={(e) => update({ customBreed: e.target.value })}
              autoFocus
            />
          )}
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      <div className="btn-row right">
        <button
          type="button"
          className="btn-primary"
          onClick={() => onNext(validate)}
          disabled={!form.categoryId}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
