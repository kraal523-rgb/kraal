import { useState, useEffect, useCallback, useRef } from "react";
import "./ListingGalleryModal.css";

/**
 * ListingGalleryModal
 * Drop-in replacement for the existing mp-modal in Marketplace.jsx
 *
 * Props:
 *   listing  — the active listing object (same shape as your Firestore docs)
 *   onClose  — () => void
 *   savedItems — Set of saved listing IDs
 *   onToggleSave — (id) => void
 *   onStartConversation — optional (sellerId, sellerName, role, context) => void
 *   getCategoryEmoji — (categoryId) => string  (pass your existing helper)
 */
export default function ListingGalleryModal({
  listing,
  onClose,
  savedItems = new Set(),
  onToggleSave,
  onStartConversation,
  getCategoryEmoji,
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [thumbsScrolled, setThumbsScrolled] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [activeSection, setActiveSection] = useState("details");
  const thumbsRef = useRef(null);
  const touchStartX = useRef(null);

  const photos = listing?.photos?.length
    ? listing.photos
    : [{ url: null, label: "No photo" }];

  const isSaved = savedItems.has(listing?.id);

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setZoomed(false);
        onClose();
      }
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [photoIndex, photos.length]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Scroll active thumb into view
  useEffect(() => {
    if (!thumbsRef.current) return;
    const active = thumbsRef.current.querySelector(".lgm-thumb.active");
    if (active)
      active.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
  }, [photoIndex]);

  const next = useCallback(() => {
    setZoomed(false);
    setPhotoIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const prev = useCallback(() => {
    setZoomed(false);
    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const handleMouseMove = (e) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  // Touch swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStartX.current = null;
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Check out this listing on Kraal: ${listing?.title} — ${listing?.currency || "USD"} ${listing?.price?.toLocaleString()}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing?.title, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      }
    } catch {}
  };

  const getDaysAgo = (ts) => {
    if (!ts?.seconds) return null;
    const d = Math.floor((Date.now() / 1000 - ts.seconds) / 86400);
    return d === 0 ? "Today" : `${d}d ago`;
  };

  const emoji = getCategoryEmoji ? getCategoryEmoji(listing?.categoryId) : "🐾";
  const currentPhoto = photos[photoIndex];
  const daysAgo = getDaysAgo(listing?.createdAt);
  const sellerInitials = (listing?.sellerName || listing?.seller || "S")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const details = [
    { icon: "🏷", label: "Breed", value: listing?.breed },
    { icon: "📅", label: "Age", value: listing?.age },
    { icon: "⚖️", label: "Weight", value: listing?.weight },
    {
      icon: "📦",
      label: "Quantity",
      value: listing?.qty ? `${listing.qty} available` : listing?.quantity,
    },
    {
      icon: "💉",
      label: "Vaccinated",
      value: listing?.vaccinated
        ? "Yes ✅"
        : listing?.vaccinated === false
          ? "No"
          : null,
    },
    {
      icon: "📍",
      label: "Location",
      value: listing?.city || listing?.province || listing?.location,
    },
    {
      icon: "👁",
      label: "Views",
      value: listing?.views ? `${listing.views} views` : null,
    },
    { icon: "🕐", label: "Listed", value: daysAgo },
  ].filter((d) => d.value);

  if (!listing) return null;

  return (
    <div
      className="lgm-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="lgm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={listing.title}
      >
        {/* ── TOP BAR ── */}
        <div className="lgm-topbar">
          <div className="lgm-topbar-left">
            <span className="lgm-topbar-emoji">{emoji}</span>
            <div>
              <h2 className="lgm-title">{listing.title}</h2>
              <p className="lgm-location">
                📍{" "}
                {listing.city ||
                  listing.province ||
                  listing.location ||
                  "Zimbabwe"}
              </p>
            </div>
          </div>
          <div className="lgm-topbar-right">
            <button
              className="lgm-icon-btn"
              onClick={handleShare}
              aria-label="Share listing"
            >
              <ShareIcon />
              {shareToast && <span className="lgm-toast">Copied!</span>}
            </button>
            <button
              className={`lgm-icon-btn ${isSaved ? "lgm-saved" : ""}`}
              onClick={() => onToggleSave?.(listing.id)}
              aria-label={isSaved ? "Unsave listing" : "Save listing"}
            >
              {isSaved ? "❤️" : "🤍"}
            </button>
            <button
              className="lgm-icon-btn lgm-close"
              onClick={onClose}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* ── MAIN BODY ── */}
        <div className="lgm-body">
          {/* ── LEFT: GALLERY ── */}
          <div className="lgm-gallery-col">
            {/* Main image */}
            <div
              className={`lgm-main-img-wrap ${zoomed ? "zoomed" : ""}`}
              onClick={() =>
                photos.length > 0 && currentPhoto.url && setZoomed((z) => !z)
              }
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setZoomed(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={
                zoomed
                  ? { "--zx": `${zoomPos.x}%`, "--zy": `${zoomPos.y}%` }
                  : {}
              }
            >
              {currentPhoto?.url ? (
                <img
                  src={currentPhoto.url}
                  alt={listing.title}
                  className="lgm-main-img"
                  draggable={false}
                />
              ) : (
                <div className="lgm-img-placeholder">
                  <span>{emoji}</span>
                  <p>No photo available</p>
                </div>
              )}

              {/* Nav arrows */}
              {photos.length > 1 && (
                <>
                  <button
                    className="lgm-arrow lgm-arrow-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      prev();
                    }}
                    aria-label="Previous photo"
                  >
                    <ChevronLeftIcon />
                  </button>
                  <button
                    className="lgm-arrow lgm-arrow-right"
                    onClick={(e) => {
                      e.stopPropagation();
                      next();
                    }}
                    aria-label="Next photo"
                  >
                    <ChevronRightIcon />
                  </button>
                </>
              )}

              {/* Photo counter */}
              {photos.length > 1 && (
                <div className="lgm-photo-counter">
                  {photoIndex + 1} / {photos.length}
                </div>
              )}

              {/* Zoom hint */}
              {currentPhoto?.url && !zoomed && (
                <div className="lgm-zoom-hint">🔍 Hover to zoom</div>
              )}

              {/* Badges */}
              <div className="lgm-img-badges">
                {listing.vaccinated && (
                  <span className="lgm-badge lgm-badge-green">
                    💉 Vaccinated
                  </span>
                )}
                {daysAgo === "Today" && (
                  <span className="lgm-badge lgm-badge-blue">🆕 New</span>
                )}
                {(listing.views || 0) > 50 && (
                  <span className="lgm-badge lgm-badge-orange">🔥 Hot</span>
                )}
              </div>
            </div>

            {/* Dot indicators */}
            {photos.length > 1 && (
              <div className="lgm-dots">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    className={`lgm-dot ${i === photoIndex ? "active" : ""}`}
                    onClick={() => {
                      setPhotoIndex(i);
                      setZoomed(false);
                    }}
                    aria-label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Thumbnails strip */}
            {photos.length > 1 && (
              <div
                className={`lgm-thumbs ${thumbsScrolled ? "scrolled" : ""}`}
                ref={thumbsRef}
                onScroll={(e) => setThumbsScrolled(e.target.scrollLeft > 0)}
              >
                {photos.map((p, i) => (
                  <button
                    key={i}
                    className={`lgm-thumb ${i === photoIndex ? "active" : ""}`}
                    onClick={() => {
                      setPhotoIndex(i);
                      setZoomed(false);
                    }}
                    aria-label={`View photo ${i + 1}`}
                  >
                    {p?.url ? (
                      <img src={p.url} alt={`Photo ${i + 1}`} />
                    ) : (
                      <span className="lgm-thumb-emoji">{emoji}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: INFO ── */}
          <div className="lgm-info-col">
            {/* Price block */}
            <div className="lgm-price-block">
              <div className="lgm-price-main">
                <strong>
                  {listing.currency || "USD"} {listing.price?.toLocaleString()}
                </strong>
                <span>
                  {listing.pricePerHead ? "/ head" : listing.unit || "/ lot"}
                </span>
              </div>
              {listing.qty && (
                <div className="lgm-qty-badge">{listing.qty} available</div>
              )}
            </div>

            {/* Section tabs */}
            <div className="lgm-tabs">
              {["details", "description", "seller"].map((tab) => (
                <button
                  key={tab}
                  className={`lgm-tab ${activeSection === tab ? "active" : ""}`}
                  onClick={() => setActiveSection(tab)}
                >
                  {tab === "details"
                    ? "Details"
                    : tab === "description"
                      ? "Description"
                      : "Seller"}
                </button>
              ))}
            </div>

            {/* Details */}
            {activeSection === "details" && (
              <div className="lgm-details-grid">
                {details.map((d) => (
                  <div key={d.label} className="lgm-detail-row">
                    <span className="lgm-detail-icon">{d.icon}</span>
                    <span className="lgm-detail-label">{d.label}</span>
                    <span className="lgm-detail-value">{d.value}</span>
                  </div>
                ))}
                {details.length === 0 && (
                  <p className="lgm-empty-section">
                    No details provided for this listing.
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            {activeSection === "description" && (
              <div className="lgm-description">
                {listing.description || listing.desc ? (
                  <p>{listing.description || listing.desc}</p>
                ) : (
                  <p className="lgm-empty-section">No description provided.</p>
                )}
              </div>
            )}

            {/* Seller */}
            {activeSection === "seller" && (
              <div className="lgm-seller-section">
                <div className="lgm-seller-card">
                  <div className="lgm-seller-avatar">{sellerInitials}</div>
                  <div className="lgm-seller-info">
                    <strong>
                      {listing.sellerName || listing.seller || "Seller"}
                    </strong>
                    {listing.sellerRating && (
                      <div className="lgm-stars">
                        {"★".repeat(Math.round(listing.sellerRating))}
                        {"☆".repeat(5 - Math.round(listing.sellerRating))}
                        <span>{listing.sellerRating} / 5.0</span>
                      </div>
                    )}
                    {listing.sellerCity && (
                      <span className="lgm-seller-loc">
                        📍 {listing.sellerCity}
                      </span>
                    )}
                  </div>
                </div>
                <div className="lgm-trust-row">
                  <span className="lgm-trust-chip">✅ Verified seller</span>
                  <span className="lgm-trust-chip">
                    🔒 Safe transaction tips
                  </span>
                </div>
              </div>
            )}

            {/* CTA block — always visible */}
            <div className="lgm-cta-block">
              <a
                href={`https://wa.me/${listing.sellerPhone || ""}?text=${encodeURIComponent(`Hi, I'm interested in your listing: *${listing.title}* on Kraal — USD ${listing.price?.toLocaleString()}`)}`}
                target="_blank"
                rel="noreferrer"
                className="lgm-btn lgm-btn-whatsapp"
              >
                <WhatsAppIcon /> Chat on WhatsApp
              </a>

              {onStartConversation && listing.sellerId && (
                <button
                  className="lgm-btn lgm-btn-chat"
                  onClick={() =>
                    onStartConversation(
                      listing.sellerId,
                      listing.sellerName || "Seller",
                      "seller",
                      `Inquiry about ${listing.title}`,
                    )
                  }
                >
                  💬 Message on Kraal
                </button>
              )}

              <button
                className={`lgm-btn lgm-btn-save ${isSaved ? "saved" : ""}`}
                onClick={() => onToggleSave?.(listing.id)}
              >
                {isSaved ? "❤️ Saved" : "🤍 Save Listing"}
              </button>
            </div>

            {/* Safety note */}
            <p className="lgm-safety">
              🔒 Always meet in a safe, public location. Never send money in
              advance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────
function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
