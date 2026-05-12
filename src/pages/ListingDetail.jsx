import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import useAuthStore from "../store/useAuthStore";
import "./ListingDetail.css";

function getCategoryEmoji(categoryId) {
  const map = {
    cattle:    "🐄", goats:     "🐐", sheep:  "🐑",
    chicken:   "🐓", guinea:    "🦅", ducks:  "🦆",
    geese:     "🪿", pigeons:   "🕊️", quail:  "🐦",
    rabbits:   "🐇", guineapig: "🐹", turkey: "🦃",
    pigs:      "🐖", horses:    "🐴", donkeys:"🫏",
    dogs:      "🐕", cats:      "🐱", ostrich:"🦤",
  };
  return map[categoryId] || "🐾";
}
function timeAgo(seconds) {
  const diff = Date.now() / 1000 - seconds;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [listing, setListing] = useState(null);      // ← null instead of MOCK
  const [loading, setLoading] = useState(true);       // ← true to show spinner
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryMsg, setEnquiryMsg] = useState("");
  const [enquirySent, setEnquirySent] = useState(false);
  const [related, setRelated] = useState([]);         // ← empty instead of RELATED_MOCK
  const [copied, setCopied] = useState(false);

useEffect(() => {
    const fetchListing = async () => {
      setLoading(true);
      try {
        // 1. Get the listing
        const snap = await getDoc(doc(db, "listings", id));
        if (!snap.exists()) {
          navigate("/marketplace");
          return;
        }
        const listingData = { id: snap.id, ...snap.data() };

        // 2. Get the seller profile
        const sellerSnap = await getDoc(doc(db, "sellers", listingData.sellerId));
        const sellerData = sellerSnap.exists() ? sellerSnap.data() : null;

        setListing({ ...listingData, seller: sellerData });
        await updateDoc(doc(db, "listings", id), {
  views: increment(1),
});
        // 3. Fetch related listings (same category, exclude current)
        const relatedQ = query(
          collection(db, "listings"),
          where("categoryId", "==", listingData.categoryId),
          where("status", "==", "active"),
          limit(4)
        );
        const relatedSnap = await getDocs(relatedQ);
        const relatedData = relatedSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => l.id !== id)  // exclude current listing
          .slice(0, 3);
        setRelated(relatedData);

      } catch (err) {
        console.error("Failed to fetch listing:", err);
        navigate("/marketplace");
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id, navigate]);

 const whatsappUrl = () => {
  if (!listing) return "#";
  const num = (listing.seller?.whatsapp || "").replace(/\D/g, "");
  const msg = encodeURIComponent(
    `Hi, I saw your listing on Kraal: "${listing.title}" for ${listing.currency} ${listing.price}. Is it still available?`
  );
  return `https://wa.me/${num}?text=${msg}`;
};
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  

 if (loading) return (
  <div className="ld-loading">
    <div className="ld-spinner" />
    <p>Loading listing…</p>
  </div>
);
   if (!listing) return null;
const totalPrice =
    listing.pricePerHead && listing.quantity > 1
      ? listing.price * listing.quantity
      : listing.price;
  return (
    <div className="ld-page">
      {/* ── BREADCRUMB ── */}
      <div className="ld-breadcrumb">
        <div className="ld-breadcrumb-inner">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/marketplace">Marketplace</Link>
          <span>/</span>
          <Link to={`/marketplace?category=${listing.categoryId}`}>
            {listing.categoryLabel}
          </Link>
          <span>/</span>
          <span className="current">{listing.title}</span>
        </div>
      </div>

      <div className="ld-body">
        {/* ── LEFT: GALLERY + DETAILS ── */}
        <div className="ld-main">
          {/* Gallery */}
          <div className="ld-gallery">
            <div
              className="gallery-cover"
              onClick={() => setLightbox(activePhoto)}
            >
              <img
                src={listing.photos[activePhoto]?.url}
                alt={listing.title}
                className="cover-img"
              />
              <button className="gallery-expand" title="View full size">
                <ExpandIcon />
              </button>
              {listing.photos.length > 1 && (
                <div className="gallery-nav">
                  <button
                    className="gnav-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhoto((i) => Math.max(0, i - 1));
                    }}
                    disabled={activePhoto === 0}
                  >
                    ‹
                  </button>
                  <span className="gnav-count">
                    {activePhoto + 1} / {listing.photos.length}
                  </span>
                  <button
                    className="gnav-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhoto((i) =>
                        Math.min(listing.photos.length - 1, i + 1),
                      );
                    }}
                    disabled={activePhoto === listing.photos.length - 1}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {listing.photos.length > 1 && (
              <div className="gallery-thumbs">
                {listing.photos.map((p, i) => (
                  <button
                    key={i}
                    className={`thumb ${i === activePhoto ? "active" : ""}`}
                    onClick={() => setActivePhoto(i)}
                  >
                    <img src={p.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title block */}
          <div className="ld-title-block">
            <div className="ld-meta-top">
              <span className="ld-category-pill">{listing.categoryLabel}</span>
              <span className="ld-breed-pill">{listing.breed}</span>
              {listing.status === "active" && (
                <span className="ld-status-pill">Available</span>
              )}
              <span className="ld-time">
                {timeAgo(listing.createdAt.seconds)}
              </span>
            </div>

            <h1 className="ld-title">{listing.title}</h1>

            <div className="ld-price-row">
              <div className="ld-price">
                <span className="price-currency">{listing.currency}</span>
                <span className="price-amount">
                  {listing.price.toLocaleString()}
                </span>
                {listing.pricePerHead && listing.quantity > 1 && (
                  <span className="price-qualifier">/ head</span>
                )}
              </div>
              {listing.quantity > 1 && listing.pricePerHead && (
                <div className="price-total-badge">
                  {listing.currency} {totalPrice.toLocaleString()} total
                </div>
              )}
              {listing.negotiable && (
                <span className="negotiable-badge">Negotiable</span>
              )}
            </div>
          </div>

          {/* Key specs */}
          <div className="ld-specs">
            <h2 className="ld-section-label">Details</h2>
            <div className="specs-grid">
              <SpecItem icon="📦" label="Quantity" value={listing.quantity} />
              <SpecItem icon="⚧" label="Gender" value={listing.gender} />
              {listing.age && (
                <SpecItem icon="🗓" label="Age" value={listing.age} />
              )}
              {listing.weight && (
                <SpecItem icon="⚖️" label="Weight" value={listing.weight} />
              )}
              <SpecItem icon="✅" label="Condition" value={listing.condition} />
              {listing.deliveryAvailable && (
                <SpecItem
                  icon="🚛"
                  label="Delivery"
                  value="Available"
                  highlight
                />
              )}
            </div>
          </div>

          {/* Health */}
          {(listing.vaccinated || listing.dewormed || listing.castrated) && (
            <div className="ld-health">
              <h2 className="ld-section-label">Health status</h2>
              <div className="health-tags">
                {listing.vaccinated && (
                  <span className="health-tag">💉 Vaccinated</span>
                )}
                {listing.dewormed && (
                  <span className="health-tag">🩺 Dewormed</span>
                )}
                {listing.castrated && (
                  <span className="health-tag">✂️ Castrated</span>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div className="ld-description">
              <h2 className="ld-section-label">About this listing</h2>
              {listing.description.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {/* Delivery notes */}
          {listing.deliveryAvailable && listing.deliveryNotes && (
            <div className="ld-delivery-note">
              <span className="delivery-icon">🚛</span>
              <div>
                <strong>Delivery available</strong>
                <p>{listing.deliveryNotes}</p>
              </div>
            </div>
          )}

          {/* Share row */}
          <div className="ld-share">
            <span>Share this listing:</span>
            <button
              className="share-btn wa"
              onClick={() => window.open(whatsappUrl())}
            >
              <WhatsAppIcon /> WhatsApp
            </button>
            <button className="share-btn copy" onClick={copyLink}>
              <CopyIcon /> {copied ? "Copied!" : "Copy link"}
            </button>
          </div>

          {/* Related */}
          <div className="ld-related">
            <h2 className="ld-section-label">Similar listings</h2>
            <div className="related-grid">
  {related.length === 0 ? (
    <p style={{ color: "#888", fontSize: "0.9rem" }}>
      No similar listings found.
    </p>
  ) : (
    related.map((r) => (
      <Link key={r.id} to={`/listings/${r.id}`} className="related-card">
        <div className="related-img-wrap">
          {r.photos?.[0]?.url ? (
            <img src={r.photos[0].url} alt={r.title} />
          ) : (
            <div className="related-img-placeholder">
              {getCategoryEmoji(r.categoryId)}
            </div>
          )}
        </div>
        <div className="related-info">
          <p className="related-title">{r.title}</p>
          <p className="related-price">
            {r.currency || "USD"} {r.price?.toLocaleString()}
          </p>
          <p className="related-loc">📍 {r.city || r.province || "Zimbabwe"}</p>
        </div>
      </Link>
    ))
  )}
</div>
          </div>
        </div>

        {/* ── RIGHT: STICKY SELLER CARD ── */}
        <aside className="ld-sidebar">
          <div className="seller-card">
            {/* Price summary */}
            <div className="sc-price">
              <span className="scp-currency">{listing.currency}</span>
              <span className="scp-amount">
                {listing.price.toLocaleString()}
              </span>
              {listing.pricePerHead && listing.quantity > 1 && (
                <span className="scp-qualifier">per head</span>
              )}
              {listing.negotiable && (
                <span className="scp-neg">Negotiable</span>
              )}
            </div>
            {listing.quantity > 1 && listing.pricePerHead && (
              <p className="sc-total">
                {listing.currency} {totalPrice.toLocaleString()} for all{" "}
                {listing.quantity}
              </p>
            )}

            {/* Primary CTA */}
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="sc-wa-btn"
            >
              <WhatsAppIcon />
              Chat on WhatsApp
            </a>

            {/* Secondary CTA */}
            <button
              className="sc-enquiry-btn"
              onClick={() => setEnquiryOpen(true)}
            >
              Send enquiry
            </button>

            <div className="sc-divider" />

            {/* Seller info */}
            <div className="sc-seller">
              <div className="sc-seller-avatar">
                {listing.seller?.photoUrl ? (
                  <img src={listing.seller.photoUrl} alt="" />
                ) : (
                  <span className="avatar-initial">
                    {listing.seller?.businessName?.[0] || "S"}
                  </span>
                )}
              </div>
              <div className="sc-seller-info">
                <strong>{listing.seller?.businessName}</strong>
                <span>
                  📍 {listing.seller?.city}, {listing.seller?.province}
                </span>
                {listing.seller?.verified && (
                  <span className="verified-badge">✓ Verified</span>
                )}
              </div>
            </div>

            {listing.seller?.description && (
              <p className="sc-seller-desc">{listing.seller.description}</p>
            )}

            {listing.seller?.livestockTypes?.length > 0 && (
              <div className="sc-also-sells">
                <span>Also sells:</span>
                {listing.seller.livestockTypes.map((t) => (
                  <span key={t} className="also-chip">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <Link
              to={`/sellers/${listing.sellerId}`}
              className="sc-view-seller"
            >
              View all listings from this seller →
            </Link>

            {/* Safety note */}
            <div className="sc-safety">
              <ShieldIcon />
              <p>
                Always meet in a safe place. Never send payment before viewing
                the animal.
              </p>
            </div>
          </div>

          {/* Location card */}
          <div className="location-card">
            <h3>Location</h3>
            <p>
              📍 {listing.seller?.city}, {listing.seller?.province}
            </p>
            <p className="loc-country">{listing.seller?.country}</p>
          </div>
        </aside>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightbox !== null && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lb-close" onClick={() => setLightbox(null)}>
            ×
          </button>
          <button
            className="lb-prev"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => Math.max(0, i - 1));
              setActivePhoto((i) => Math.max(0, i - 1));
            }}
            disabled={lightbox === 0}
          >
            ‹
          </button>
          <img
            src={listing.photos[lightbox]?.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="lb-img"
          />
          <button
            className="lb-next"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => Math.min(listing.photos.length - 1, i + 1));
              setActivePhoto((i) => Math.min(listing.photos.length - 1, i + 1));
            }}
            disabled={lightbox === listing.photos.length - 1}
          >
            ›
          </button>
          <div className="lb-counter">
            {lightbox + 1} / {listing.photos.length}
          </div>
        </div>
      )}

      {/* ── ENQUIRY MODAL ── */}
      {enquiryOpen && (
        <div className="modal-overlay" onClick={() => setEnquiryOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setEnquiryOpen(false)}
            >
              ×
            </button>

            {enquirySent ? (
              <div className="enquiry-sent">
                <div className="sent-icon">✓</div>
                <h3>Enquiry sent!</h3>
                <p>
                  The seller will get back to you. You can also reach them
                  directly on WhatsApp for a faster reply.
                </p>
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sc-wa-btn"
                >
                  <WhatsAppIcon /> Chat on WhatsApp
                </a>
              </div>
            ) : (
              <>
                <h3 className="modal-title">Send an enquiry</h3>
                <p className="modal-sub">
                  Message the seller about <em>{listing.title}</em>
                </p>

                {!user && (
                  <div className="modal-auth-note">
                    <Link to="/login">Sign in</Link> to send enquiries, or use
                    WhatsApp directly.
                  </div>
                )}

                <textarea
                  className="enquiry-textarea"
                  rows={5}
                  placeholder={`Hi, I'm interested in your ${listing.title}. Is it still available?`}
                  value={enquiryMsg}
                  onChange={(e) => setEnquiryMsg(e.target.value)}
                />

                <div className="modal-actions">
                  <button
                    className="btn-ghost-sm"
                    onClick={() => setEnquiryOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
  className="btn-primary-sm"
  onClick={async () => {
    if (!enquiryMsg.trim()) return;
    try {
      await addDoc(collection(db, "enquiries"), {
        listingId: id,
        listingTitle: listing.title,
        sellerId: listing.sellerId,
        buyerId: user?.uid || null,
        buyerEmail: user?.email || null,
        message: enquiryMsg,
        createdAt: serverTimestamp(),
        read: false,
      });
      setEnquirySent(true);
    } catch (err) {
      console.error("Enquiry failed:", err);
    }
  }}
  disabled={!enquiryMsg.trim()}
>
  Send message
</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SpecItem({ icon, label, value, highlight }) {
  return (
    <div className={`spec-item ${highlight ? "highlight" : ""}`}>
      <span className="spec-icon">{icon}</span>
      <div className="spec-content">
        <span className="spec-label">{label}</span>
        <span className="spec-value">{value}</span>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
