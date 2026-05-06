import React, { useRef, useState } from 'react';

const MAX_PHOTOS = 8;

export default function StepPhotos({ form, addPhotos, removePhoto, reorderPhotos, onNext, onBack, error }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const handleFiles = (files) => {
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (images.length) addPhotos(images);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragStart = (index) => setDragging(index);
  const handleDragEnter = (index) => setDragOver(index);
  const handleDragEnd = () => {
    if (dragging !== null && dragOver !== null && dragging !== dragOver) {
      reorderPhotos(dragging, dragOver);
    }
    setDragging(null);
    setDragOver(null);
  };

  const remaining = MAX_PHOTOS - form.photos.length;

  return (
    <div className="step-form">
      <div className="step-header">
        <h2 className="step-title">Add photos</h2>
        <p className="step-sub">Listings with photos get 5× more enquiries. Drag to reorder — first photo is the cover.</p>
      </div>

      {/* Photo grid */}
      {form.photos.length > 0 && (
        <div className="photo-grid">
          {form.photos.map((photo, index) => (
            <div
              key={index}
              className={`photo-thumb ${index === 0 ? 'cover' : ''} ${dragging === index ? 'dragging' : ''} ${dragOver === index ? 'drag-over' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <img src={photo.preview} alt={`Photo ${index + 1}`} />
              {index === 0 && <span className="cover-badge">Cover</span>}
              <button
                type="button"
                className="photo-remove"
                onClick={() => removePhoto(index)}
                title="Remove"
              >×</button>
            </div>
          ))}

          {/* Add more slot */}
          {remaining > 0 && (
            <button
              type="button"
              className="photo-add-slot"
              onClick={() => inputRef.current?.click()}
            >
              <span>+</span>
              <span className="slot-hint">{remaining} left</span>
            </button>
          )}
        </div>
      )}

      {/* Drop zone (shown when no photos yet) */}
      {form.photos.length === 0 && (
        <div
          className="photo-dropzone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <div className="dropzone-inner">
            <CameraIcon />
            <p>Drag photos here or <span>browse</span></p>
            <p className="dz-hint">Up to {MAX_PHOTOS} photos · JPG, PNG, WEBP · Max 5MB each</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {form.photos.length > 0 && (
        <p className="photos-hint">
          <DragIcon /> Drag thumbnails to reorder · First photo is your cover image
        </p>
      )}

      {error && <p className="error-msg">{error}</p>}

      <div className="btn-row">
        <button type="button" className="btn-ghost" onClick={onBack}>Back</button>
        <button type="button" className="btn-ghost" onClick={() => onNext(null)}>Skip for now</button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onNext(null)}
          disabled={form.photos.length === 0}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

function DragIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}>
      <circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/>
      <circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/>
    </svg>
  );
}