// eslint-disable-next-line no-unused-vars
import React from 'react';
import { useListing, LISTING_STEPS, LISTING_STEP_LABELS } from '../../hooks/useListing';
import StepAnimal from '../../components/listings/StepAnimal';
import StepDetails from '../../components/listings/StepDetails';
import StepPhotos from '../../components/listings/StepPhotos';
import StepPricing from '../../components/listings/StepPricing';
import StepReview from '../../components/listings/StepReview';
import StepListingDone from '../../components/listings/StepListingDone';
import './SellAnimal.css';

export default function SellAnimal() {
  const {
    step, form, loading, error, listingId, selectedCategory,
    update, addPhotos, removePhoto, reorderPhotos,
    nextStep, prevStep, submitListing,resetForm,
  } = useListing();

  const isDone = step === LISTING_STEPS.DONE;
  const progress = isDone ? 100 : (step / LISTING_STEP_LABELS.length) * 100;

  return (
    <div className="sell-page">
      <div className="sell-inner">

        {/* Header */}
        <div className="sell-header">
          <a href="/seller/dashboard" className="back-link">← Dashboard</a>
          <h1 className="sell-page-title">
            {isDone ? 'Listing published' : 'Post a listing'}
          </h1>
        </div>

        {/* Progress */}
        {!isDone && (
          <div className="sell-progress">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-steps">
              {LISTING_STEP_LABELS.map((label, i) => (
                <div key={label} className={`ps ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                  <div className="ps-dot">{i < step ? '✓' : i + 1}</div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form card */}
        <div className="sell-card">
          {step === LISTING_STEPS.ANIMAL && (
            <StepAnimal form={form} update={update} onNext={nextStep} error={error} />
          )}
          {step === LISTING_STEPS.DETAILS && (
            <StepDetails
              form={form} update={update} selectedCategory={selectedCategory}
              onNext={nextStep} onBack={prevStep} error={error}
            />
          )}
          {step === LISTING_STEPS.PHOTOS && (
            <StepPhotos
              form={form} addPhotos={addPhotos} removePhoto={removePhoto}
              reorderPhotos={reorderPhotos} onNext={nextStep} onBack={prevStep} error={error}
            />
          )}
          {step === LISTING_STEPS.PRICING && (
            <StepPricing form={form} update={update} onNext={nextStep} onBack={prevStep} error={error} />
          )}
          {step === LISTING_STEPS.REVIEW && (
            <StepReview
              form={form} onSubmit={submitListing} onBack={prevStep}
              loading={loading} error={error}
            />
          )}
          {step === LISTING_STEPS.DONE && (
  <StepListingDone listingId={listingId} onPostAnother={resetForm} />
)}
        </div>
      </div>
    </div>
  );
}