import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function StepListingDone({ listingId, onPostAnother }) {
  const navigate = useNavigate();

  return (
    <div className="step-form done-screen">
      <div className="done-icon">🎉</div>
      <h2 className="step-title">Listing published!</h2>
      <p className="step-sub">
        Your listing is now live on Kraal. Buyers across Zimbabwe and beyond can find it.
      </p>

      <div className="done-actions">
        <button className="btn-primary" onClick={() => navigate(`/listings/${listingId}`)}>
          View my listing
        </button>
        <button className="btn-ghost" onClick={onPostAnother}> {/* 👈 resets form */}
          Post another listing
        </button>
        <button className="btn-ghost" onClick={() => navigate('/seller/dashboard')}>
          Go to dashboard
        </button>
      </div>

      <div className="share-nudge">
        <p>📢 Share your listing to get more buyers</p>
        <div className="share-btns">
          <button
            className="share-btn whatsapp"
            onClick={() => window.open(`https://wa.me/?text=Check out my listing on Kraal: ${window.location.origin}/listings/${listingId}`)}
          >
            WhatsApp
          </button>
          <button
            className="share-btn copy"
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/listings/${listingId}`)}
          >
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
}