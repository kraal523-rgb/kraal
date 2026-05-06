import React from 'react';
import { useNavigate } from 'react-router-dom';

const CHECKLIST = [
  'Account created & verified',
  'Business profile saved',
  'Location set for buyer discovery',
  'Ready to list your first animal',
];

export default function StepDone() {
  const navigate = useNavigate();

  return (
    <div className="step-form done-screen">
      <div className="done-icon">🎉</div>

      <h2 className="step-title" style={{ textAlign: 'center' }}>
        Welcome to Kraal!
      </h2>
      <p className="step-sub" style={{ textAlign: 'center' }}>
        Your seller account is live. Start listing your livestock and connect
        with buyers across the region.
      </p>

      <div className="done-checklist">
        {CHECKLIST.map(item => (
          <div key={item} className="check-item">
            <div className="check-icon">✓</div>
            <span>{item}</span>
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: '8px' }}
        onClick={() => navigate('/seller/dashboard', { replace: true })}  // ← fixed
      >
        Go to my dashboard →
      </button>

      
       <a href="/sell"   // ← your actual route from App.js
        style={{
          display: 'block',
          textAlign: 'center',
          marginTop: '12px',
          color: '#2D5A27',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: '0.9rem',
        }}
      >
        + List my first animal
      </a>
    </div>
  );
}