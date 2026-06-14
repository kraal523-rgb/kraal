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
  const [toggles, setToggles] = useState({
    necessary: true,
    analytics: true,
    marketing: false,
    preferences: true,
  });

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
      // Auto-open banner if no consent recorded yet
      setPanelOpen(true);
    }
  }, []);

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
      {/* Floating trigger button */}
      <button
        onClick={() => setPanelOpen((o) => !o)}
        aria-label="Cookies"
        title="Cookies"
        style={{
          position: "fixed",
          bottom: "24px",
          left: "24px",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 16px",
          background: "transparent",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 500,
          color: isConsented ? "#0F6E56" : "#444",
          transition: "all 0.2s",
        }}
      >
      
 <img src={CookieIcon} alt="" width={80} height={80} style={{ display: "block" }} />
<span>Cookies</span>
      
        
      </button>

      {/* Panel overlay */}
      {panelOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "0 0 80px",
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
              borderRadius: "16px",
              width: "100%",
              maxWidth: "640px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  borderRadius: "10px",
                  background: "#E1F5EE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                }}
              >
                🔐
              </div>
              <div style={{ flex: 1 }}>
                <h2
                  style={{
                    fontSize: "16px",
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
                  We use cookies and similar tracking technologies to improve
                  your experience, analyse site traffic, and personalise
                  content. You can choose which categories to allow below.
                </p>
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  {[
                    { label: "Privacy policy", href: "/privacy" },
                    { label: "Cookie policy", href: "/cookies" },
                    { label: "Terms of service", href: "/terms" },
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
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#aaa",
                  lineHeight: 1,
                  padding: "2px 4px",
                }}
              >
                ×
              </button>
            </div>

            {/* Category list */}
            <div
              style={{
                padding: "12px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#999",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
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
                    padding: "14px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    background: cat.required ? "#fafafa" : "#fff",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      minWidth: 34,
                      borderRadius: "8px",
                      background: cat.required ? "#E1F5EE" : "#f4f4f4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                    }}
                  >
                    {cat.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
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
                        lineHeight: 1.55,
                        margin: "0 0 4px",
                      }}
                    >
                      {cat.description}
                    </p>
                    <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>
                      Includes: {cat.examples}
                    </p>
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

            {/* Footer */}
            <div
              style={{
                padding: "14px 24px 20px",
                borderTop: "1px solid #f0f0f0",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
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
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={handleRejectAll}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #f0997b",
                    background: "#fff",
                    color: "#993C1D",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Reject non-essential
                </button>
                <button
                  onClick={handleSaveSelected}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    background: "#fff",
                    color: "#333",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Save preferences
                </button>
                <button
                  onClick={handleAcceptAll}
                  style={{
                    padding: "8px 14px",
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
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
