import React, { useRef } from 'react';

const UploadIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const MAX_SIZE_MB = 5;

export default function StepPhoto({ form, update, onSubmit, onBack, loading, error, setError }) {
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, or WEBP).');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    update({ profilePhoto: file, profilePhotoPreview: previewUrl });
  };

  const handleRemove = () => {
    // Revoke previous object URL to avoid memory leak
    if (form.profilePhotoPreview) {
      URL.revokeObjectURL(form.profilePhotoPreview);
    }
    update({ profilePhoto: null, profilePhotoPreview: null });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="step-form" onSubmit={handleSubmit} noValidate>
      <h2 className="step-title">Add a profile photo</h2>
      <p className="step-sub">
        A photo of you or your farm builds trust with buyers.{' '}
        <span className="optional">You can skip this step.</span>
      </p>

      <div
        className="photo-drop"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload profile photo"
      >
        {form.profilePhotoPreview ? (
          <>
            <img
              src={form.profilePhotoPreview}
              alt="Profile preview"
              className="photo-preview"
            />
            <div className="photo-change-overlay">Change photo</div>
          </>
        ) : (
          <div className="photo-placeholder">
            <UploadIcon />
            <p style={{ margin: 0 }}>
              <span>Click to upload</span> or drag & drop
            </p>
            <p className="photo-hint">JPG, PNG, WEBP · Max {MAX_SIZE_MB} MB</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />

      {form.profilePhotoPreview && (
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="btn-ghost small"
            onClick={handleRemove}
          >
            Remove photo
          </button>
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onBack} disabled={loading}>
          ← Back
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Setting up your account…' : 'Finish & go to Kraal →'}
        </button>
      </div>

      <p className="step-footer">
        By registering you agree to our{' '}
        <a href="/terms">Terms of Service</a> and{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </form>
  );
}