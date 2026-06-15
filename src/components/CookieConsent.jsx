import { useState, useEffect } from "react";
import CookieIcon from "../assets/cookie-icon.svg";

const STORAGE_KEY = "kraal_cookie_consent";

const CATEGORIES = [
  {
    id: "necessary",
    label: "Strictly necessary",
    description:
      "Essential for the website to function. These cannot be disabled as they are required for core functionality such as authentication and security.",
    examples: "Session tokens, CSRF protection, load balancing",
    required: true,
    icon: "🔒",
  },
  {
    id: "analytics",
    label: "Analytics & performance",
    description:
      "Help us understand how visitors interact with Kraal by collecting and reporting usage data anonymously. No personally identifiable information is stored.",
    examples: "Page views, session duration, error tracking (Mixpanel, Sentry)",
    required: false,
    icon: "📊",
  },
  {
    id: "marketing",
    label: "Marketing & advertising",
    description:
      "Used to deliver relevant advertisements and track the effectiveness of campaigns. Data may be shared with third-party advertising partners.",
    examples:
      "Remarketing pixels, ad conversion tracking (Meta Pixel, Google Ads)",
    required: false,
    icon: "📣",
  },
  {
    id: "preferences",
    label: "Preferences & functionality",
    description:
      "Remember your settings and personalise your experience — such as language, theme, and saved filters — so you don't have to reconfigure them each visit.",
    examples: "Language settings, UI theme, dashboard layout preferences",
    required: false,
    icon: "⚙️",
  },
];

function generateConsentId() {
  return "kraal-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

function loadSavedConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConsent(prefs) {
  const consent = {
    ...prefs,
    consentId: generateConsentId(),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  return consent;
}

export default function CookieConsent() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [saved, setSaved] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [toggles, setToggles] = useState({
    necessary: true,
    analytics: true,
    marketing: false,
    preferences: true,
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const existing = loadSavedConsent();
    if (existing) {
      setSaved(existing);
      setToggles({
        necessary: true,
        analytics: existing.analytics ?? true,
        marketing: existing.marketing ?? false,
        preferences: existing.preferences ?? true,
      });
    } else {
      setPanelOpen(true);
    }
  }, []);

  // Lock body scroll when panel is open on mobile
  useEffect(() => {
    if (panelOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [panelOpen, isMobile]);

  function handleToggle(id) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleAcceptAll() {
    const consent = saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
    setSaved(consent);
    setPanelOpen(false);
  }

  function handleRejectAll() {
    const consent = saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
    setSaved(consent);
    setPanelOpen(false);
  }

  function handleSaveSelected() {
    const consent = saveConsent({ ...toggles, necessary: true });
    setSaved(consent);
    setPanelOpen(false);
  }

  function handleWithdraw() {
    localStorage.removeItem(STORAGE_KEY);
    setSaved(null);
    setToggles({
      necessary: true,
      analytics: true,
      marketing: false,
      preferences: true,
    });
    setPanelOpen(true);
  }

  const isConsented = !!saved;

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setPanelOpen((o) => !o)}
        aria-label="Cookie preferences"
        title="Cookie preferences"
        style={{
          position: "fixed",
          bottom: isMobile ? "72px" : "24px", // above bottom nav on mobile
          left: "16px",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px 8px 10px",
          background: "#ffffff00",
          border: "0px solid #e0e0e0",
          borderRadius: "999px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 500,
          color: isConsented ? "#0F6E56" : "#444",
          transition: "all 0.2s",
        }}
      >
        <img
          src={CookieIcon}
          alt=""
          width={50}
          height={50}
          style={{ display: "block" }}
        />
        <span>Cookies</span>
      </button>

      {/* Overlay + panel */}
      {panelOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1001,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            // On mobile: sheet slides up from bottom; on desktop: centred
            alignItems: isMobile ? "flex-end" : "center",
            justifyContent: "center",
            padding: isMobile ? 0 : "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPanelOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cookie consent preferences"
            style={{
              background: "#fff",
              // Mobile: full-width bottom sheet with rounded top corners
              borderRadius: isMobile ? "20px 20px 0 0" : "16px",
              width: "100%",
              maxWidth: isMobile ? "100%" : "640px",
              // Mobile: up to 92% of screen height; desktop: 90vh
              maxHeight: isMobile ? "92svh" : "90vh",
              overflowY: "auto",
              boxShadow: "0 -4px 40px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drag handle — mobile only */}
            {isMobile && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "12px 0 4px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: "999px",
                    background: "#ddd",
                  }}
                />
              </div>
            )}

            {/* Header */}
            <div
              style={{
                padding: isMobile ? "12px 16px 14px" : "20px 24px 16px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  borderRadius: "10px",
                  background: "#E1F5EE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                🔐
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  style={{
                    fontSize: isMobile ? "15px" : "16px",
                    fontWeight: 600,
                    color: "#111",
                    margin: "0 0 4px",
                  }}
                >
                  Cookie preferences — Kraal
                </h2>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    lineHeight: 1.55,
                    margin: "0 0 8px",
                  }}
                >
                  We use cookies and similar technologies to improve your
                  experience, analyse traffic, and personalise content. Choose
                  which categories to allow below.
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {[
                    { label: "Privacy policy", href: "/privacy" },
                    { label: "Cookie policy", href: "/cookies" },
                    { label: "Terms", href: "/terms" },
                  ].map(({ label, href }) => (
                    <a
                      key={href}
                      href={href}
                      style={{
                        fontSize: "12px",
                        color: "#185FA5",
                        textDecoration: "none",
                      }}
                    >
                      {label} →
                    </a>
                  ))}
                </div>
                {saved && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#999",
                      marginTop: "6px",
                    }}
                  >
                    Last saved: {new Date(saved.savedAt).toLocaleString()} · ID:{" "}
                    {saved.consentId}
                  </p>
                )}
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                aria-label="Close cookie panel"
                style={{
                  background: "#f5f5f5",
                  border: "none",
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  borderRadius: "50%",
                  fontSize: "16px",
                  cursor: "pointer",
                  color: "#888",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  marginTop: "2px",
                }}
              >
                ×
              </button>
            </div>

            {/* Category list — scrollable middle */}
            <div
              style={{
                padding: isMobile ? "10px 12px" : "12px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                overflowY: "auto",
                flex: 1,
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#999",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: "2px 0 4px",
                }}
              >
                Cookie categories
              </p>
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: "10px",
                    padding: isMobile ? "12px" : "14px",
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                    background: cat.required ? "#fafafa" : "#fff",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      minWidth: 32,
                      borderRadius: "8px",
                      background: cat.required ? "#E1F5EE" : "#f4f4f4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "15px",
                    }}
                  >
                    {cat.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "3px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#111",
                        }}
                      >
                        {cat.label}
                      </span>
                      {cat.required && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#888",
                            fontStyle: "italic",
                          }}
                        >
                          Always active
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        lineHeight: 1.5,
                        margin: "0 0 3px",
                      }}
                    >
                      {cat.description}
                    </p>
                    {/* Hide examples on mobile to save space */}
                    {!isMobile && (
                      <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>
                        Includes: {cat.examples}
                      </p>
                    )}
                  </div>
                  {/* Toggle */}
                  <label
                    style={{
                      position: "relative",
                      width: 38,
                      height: 22,
                      cursor: cat.required ? "not-allowed" : "pointer",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                    aria-label={`Toggle ${cat.label}`}
                  >
                    <input
                      type="checkbox"
                      checked={toggles[cat.id]}
                      disabled={cat.required}
                      onChange={() => !cat.required && handleToggle(cat.id)}
                      style={{
                        opacity: 0,
                        width: 0,
                        height: 0,
                        position: "absolute",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "999px",
                        background: toggles[cat.id] ? "#1D9E75" : "#ccc",
                        transition: "background 0.2s",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 3,
                        left: toggles[cat.id] ? "calc(100% - 19px)" : "3px",
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#fff",
                        transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>

            {/* Footer — pinned at bottom */}
            <div
              style={{
                padding: isMobile ? "12px 12px 20px" : "14px 24px 20px",
                borderTop: "1px solid #f0f0f0",
                flexShrink: 0,
                // Stack vertically on mobile
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "10px",
                alignItems: isMobile ? "stretch" : "center",
                justifyContent: isMobile ? "flex-start" : "space-between",
              }}
            >
              {/* Accept all — primary action first on mobile */}
              {isMobile && (
                <button
                  onClick={handleAcceptAll}
                  style={{
                    padding: "13px 14px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#1D9E75",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Accept all
                </button>
              )}

              {/* Secondary actions */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <button
                  onClick={handleRejectAll}
                  style={{
                    flex: isMobile ? 1 : "unset",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #f0997b",
                    background: "#fff",
                    color: "#993C1D",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Reject non-essential
                </button>
                <button
                  onClick={handleSaveSelected}
                  style={{
                    flex: isMobile ? 1 : "unset",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    background: "#fff",
                    color: "#333",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Save preferences
                </button>
                {/* Desktop: accept all lives here */}
                {!isMobile && (
                  <button
                    onClick={handleAcceptAll}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#1D9E75",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Accept all
                  </button>
                )}
              </div>

              {/* Withdraw / hint */}
              <div style={{ marginTop: isMobile ? "2px" : 0 }}>
                {saved ? (
                  <button
                    onClick={handleWithdraw}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "12px",
                      color: "#c0392b",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                    }}
                  >
                    Withdraw consent
                  </button>
                ) : (
                  <span style={{ fontSize: "12px", color: "#aaa" }}>
                    You can change these at any time.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}