// eslint-disable-next-line no-unused-vars
import React from 'react';
import { useNavigate } from 'react-router-dom';

const STARTER_COINS = 5;

const COPY = {
  seller: {
    sub: 'Your seller account is live. Start listing your livestock and connect with buyers across the region.',
    checklist: [
      'Account created & verified',
      'Business profile saved',
      'Location set for buyer discovery',
      'Ready to list your first animal',
    ],
    coinNote: 'Each new listing costs 1 coin.',
    cta: 'Go to my dashboard →',
    secondary: { label: '+ List my first animal', to: '/sell' },
  },
  transporter: {
    sub: 'Your transport profile is live. Farmers and buyers can now find you for livestock deliveries.',
    checklist: [
      'Account created & verified',
      'Transport business saved',
      'Location set for job matching',
      'Ready to receive delivery jobs',
    ],
    coinNote: 'Each job you take costs 1 coin.',
    cta: 'Go to my dashboard →',
  },
  buyer: {
    sub: 'Your buyer account is ready. Browse livestock from sellers across the region.',
    checklist: [
      'Account created & verified',
      'Profile saved',
      'Location set',
      'Ready to browse the marketplace',
    ],
    cta: 'Start browsing →',
  },
  vet: {
    sub: 'Your practice profile is live. Farmers can now find you for health certificates and inspections.',
    checklist: [
      'Account created & verified',
      'Practice profile saved',
      'Location set for farmer discovery',
      'Ready to receive inspection requests',
    ],
    cta: 'Go to my dashboard →',
  },
};

export default function StepDone({ role, onContinue }) {
  const navigate = useNavigate();
  const copy = COPY[role] ?? COPY.seller;
  const getsCoins = role === 'seller' || role === 'transporter';

  // Falls back to the seller dashboard if no handler is passed
  const handleContinue =
    onContinue ?? (() => navigate('/seller/dashboard', { replace: true }));

  return (
    <div className="step-form done-screen">
      <div className="done-icon">🎉</div>

      <h2 className="step-title" style={{ textAlign: 'center' }}>
        Welcome to Kraal!
      </h2>
      <p className="step-sub" style={{ textAlign: 'center' }}>
        {copy.sub}
      </p>

      {getsCoins && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#FFF8E1',
            border: '1.5px solid #F2D675',
            borderRadius: '12px',
            padding: '12px 16px',
            margin: '4px 0 16px',
          }}
        >
          <span style={{ fontSize: '1.6rem' }}>🪙</span>
          <div>
            <strong style={{ display: 'block', color: '#5C4A00' }}>
              You've received {STARTER_COINS} free coins!
            </strong>
            <span style={{ fontSize: '0.85rem', color: '#7A6A2E' }}>
              {copy.coinNote} Top up anytime when you run out.
            </span>
          </div>
        </div>
      )}

      <div className="done-checklist">
        {copy.checklist.map((item) => (
          <div key={item} className="check-item">
            <div className="check-icon">✓</div>
            <span>{item}</span>
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: '8px' }}
        onClick={handleContinue}
      >
        {copy.cta}
      </button>

      {copy.secondary && (
        <button
          type="button"
          onClick={() => navigate(copy.secondary.to)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            marginTop: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#2D5A27',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {copy.secondary.label}
        </button>
      )}
    </div>
  );
}