import React from 'react';
import { useRegister, STEPS, STEP_LABELS } from '../../hooks/useRegister';
import StepAccount from '../../components/auth/StepAccount';
import StepBusiness from '../../components/auth/StepBusiness';
import StepLocation from '../../components/auth/StepLocation';
import StepPhoto from '../../components/auth/StepPhoto';
import StepDone from '../../components/auth/StepDone';
import './Register.css';

export default function Register() {
  const {
    step, form, loading, error,
    update, toggleLivestock,
    submitAccount, nextStep, prevStep, submitFinal,
    setError,
  } = useRegister();

  const isDone = step === STEPS.DONE;

  return (
    <div className="register-page">
      {/* Left panel - branding */}
      <div className="register-brand">
        <div className="brand-content">
          <div className="brand-logo">
            <KraalLogo />
          </div>
          <h1>Sell your livestock to the world</h1>
          <p>
            Join thousands of farmers across Zimbabwe already using Kraal to
            connect with buyers locally and internationally.
          </p>
          <div className="brand-stats">
            <div className="stat"><strong>12,000+</strong><span>Sellers</span></div>
            <div className="stat"><strong>5 countries</strong><span>Reach</span></div>
            <div className="stat"><strong>Free</strong><span>To list</span></div>
          </div>
        </div>
        <div className="brand-art" aria-hidden="true">
          <span className="art-emoji art-1">🐄</span>
          <span className="art-emoji art-2">🐐</span>
          <span className="art-emoji art-3">🐓</span>
          <span className="art-emoji art-4">🐑</span>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="register-form-panel">
        {!isDone && (
          <div className="progress-bar">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className={`progress-step ${i < step ? 'done' : i === step ? 'active' : ''}`}
              >
                <div className="progress-dot">
                  {i < step ? '✓' : i + 1}
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="form-card">
          {step === STEPS.ACCOUNT && (
            <StepAccount
              form={form}
              update={update}
              onSubmit={submitAccount}
              loading={loading}
              error={error}
            />
          )}
          {step === STEPS.BUSINESS && (
            <StepBusiness
              form={form}
              update={update}
              toggleLivestock={toggleLivestock}
              onNext={nextStep}
              onBack={prevStep}
              error={error}
            />
          )}
          {step === STEPS.LOCATION && (
            <StepLocation
              form={form}
              update={update}
              onNext={nextStep}
              onBack={prevStep}
              error={error}
            />
          )}
          {step === STEPS.PHOTO && (
            <StepPhoto
              form={form}
              update={update}
              onSubmit={submitFinal}
              onBack={prevStep}
              loading={loading}
              error={error}
              setError={setError}
            />
          )}
          {step === STEPS.DONE && (
            <StepDone />
          )}
        </div>
      </div>
    </div>
  );
}

function KraalLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="#2D5A27" />
      <text x="24" y="32" textAnchor="middle" fontSize="28" fill="white">K</text>
    </svg>
  );
}