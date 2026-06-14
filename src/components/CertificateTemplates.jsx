import { useState, useRef } from "react";

// ─── CERTIFICATE TEMPLATES ────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "movement",
    label: "Movement Permit",
    icon: "🚚",
    color: "#1A5276",
    accent: "#2E86C1",
  },
  {
    id: "health",
    label: "Health Certificate",
    icon: "💉",
    color: "#1A7A5E",
    accent: "#27AE60",
  },
  {
    id: "vaccination",
    label: "Vaccination Record",
    icon: "🩺",
    color: "#6C3483",
    accent: "#9B59B6",
  },
  {
    id: "inspection",
    label: "Pre-Sale Inspection",
    icon: "🔍",
    color: "#784212",
    accent: "#CA6F1E",
  },
  {
    id: "slaughter",
    label: "Fit-for-Slaughter",
    icon: "✅",
    color: "#1B2631",
    accent: "#2C3E50",
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-ZW", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getTemplate(certType) {
  return TEMPLATES.find((t) => t.id === certType) || TEMPLATES[1];
}

// ─── TEMPLATE SELECTOR ────────────────────────────────────────────────────────

export function TemplateSelector({ selectedId, onSelect }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 10,
      }}
    >
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          style={{
            padding: "14px 10px",
            borderRadius: 10,
            border: `2px solid ${selectedId === t.id ? t.color : "#E4DDD2"}`,
            background: selectedId === t.id ? `${t.color}11` : "#F9F6F0",
            cursor: "pointer",
            textAlign: "center",
            transition: "all 0.15s",
          }}
        >
          <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>{t.icon}</div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: selectedId === t.id ? t.color : "#2C2A26",
              lineHeight: 1.3,
            }}
          >
            {t.label}
          </div>
          {selectedId === t.id && (
            <div
              style={{
                marginTop: 6,
                fontSize: "0.7rem",
                color: t.color,
                fontWeight: 600,
              }}
            >
              ✓ Selected
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── CERTIFICATE PREVIEW / PRINT ──────────────────────────────────────────────

export function CertificateDocument({ cert }) {
  const tmpl = getTemplate(cert.certType);

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: "#fff",
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        border: `3px solid ${tmpl.color}`,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      {/* ── Header band ── */}
      <div
        style={{
          background: tmpl.color,
          color: "#fff",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: 3,
              textTransform: "uppercase",
              opacity: 0.75,
              marginBottom: 4,
            }}
          >
            Republic of Zimbabwe · Department of Veterinary Services
          </div>
          <div
            style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: 0.5 }}
          >
            {tmpl.icon} {tmpl.label}
          </div>
          <div style={{ fontSize: "0.78rem", opacity: 0.8, marginTop: 4 }}>
            Certificate No: <strong>{cert.certNumber || "—"}</strong>
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: "0.75rem",
            opacity: 0.85,
            lineHeight: 1.8,
          }}
        >
          <div>Issued: {formatDate(cert.issuedAt)}</div>
          {cert.validUntil && <div>Valid Until: {cert.validUntil}</div>}
          <div
            style={{
              marginTop: 4,
              padding: "2px 8px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 4,
            }}
          >
            OFFICIAL DOCUMENT
          </div>
        </div>
      </div>

      {/* ── Decorative rule ── */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${tmpl.color}, ${tmpl.accent}, ${tmpl.color})`,
        }}
      />

      {/* ── Body ── */}
      <div
        style={{
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Opening declaration */}
        <p
          style={{
            margin: 0,
            fontSize: "0.9rem",
            color: "#2C2A26",
            lineHeight: 1.7,
            fontStyle: "italic",
          }}
        >
          This is to certify that the livestock described herein has been
          inspected by a licensed veterinary officer and found to comply with
          the applicable requirements of the Zimbabwe Animal Health Act [Chapter
          19:01].
        </p>

        {/* Two-col fields */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Field label="Issued To" value={cert.requesterName} />
          <Field label="Role / Capacity" value={cert.requesterRole} />
          <Field label="Animal Type" value={cert.animalType} />
          <Field
            label="Quantity"
            value={cert.quantity ? `${cert.quantity} head` : "—"}
          />
          <Field label="Province / Location" value={cert.province} />
          <Field label="Certificate Type" value={tmpl.label} />
        </div>

        {/* Notes */}
        {cert.notes && (
          <div
            style={{
              background: "#F9F6F0",
              border: `1px solid #E4DDD2`,
              borderLeft: `4px solid ${tmpl.accent}`,
              borderRadius: 4,
              padding: "12px 16px",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: tmpl.color,
                marginBottom: 6,
              }}
            >
              Veterinary Notes & Observations
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: "#2C2A26",
                lineHeight: 1.7,
              }}
            >
              {cert.notes}
            </p>
          </div>
        )}

        {/* Signature row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            marginTop: 12,
          }}
        >
          <SignatureBlock
            label="Issuing Veterinary Officer"
            name={cert.vetName}
          />
          <SignatureBlock label="Authorized Stamp" name="" stamp />
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 8,
            paddingTop: 12,
            borderTop: `1px solid #E4DDD2`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "0.7rem", color: "#9A9490" }}>
            Issued via Kraal Livestock Platform · kraal.co.zw
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              padding: "3px 10px",
              border: `1px solid ${tmpl.color}`,
              color: tmpl.color,
              borderRadius: 20,
              fontWeight: 600,
              letterSpacing: 1,
            }}
          >
            {cert.certNumber || "DRAFT"}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "#9A9490",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "0.92rem", color: "#1C1A16", fontWeight: 600 }}>
        {value || "—"}
      </div>
    </div>
  );
}

function SignatureBlock({ label, name, stamp }) {
  return (
    <div>
      <div
        style={{
          height: 56,
          borderBottom: "1.5px solid #2C2A26",
          marginBottom: 6,
          display: "flex",
          alignItems: "flex-end",
          paddingBottom: 4,
        }}
      >
        {stamp && (
          <div
            style={{
              width: 52,
              height: 52,
              border: "2px dashed #C0BCB6",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#C0BCB6",
              fontSize: "0.6rem",
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            OFFICIAL
            <br />
            STAMP
          </div>
        )}
        {name && !stamp && (
          <span
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: "1rem",
              fontStyle: "italic",
              color: "#2C2A26",
            }}
          >
            {name}
          </span>
        )}
      </div>
      <div style={{ fontSize: "0.72rem", color: "#7A7670" }}>{label}</div>
      {name && (
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#2C2A26" }}>
          {name}
        </div>
      )}
    </div>
  );
}

// ─── PRINT BUTTON ─────────────────────────────────────────────────────────────

export function PrintCertificateButton({ cert }) {
  const handlePrint = () => {
    const tmpl = getTemplate(cert.certType);
    const html = buildPrintHTML(cert, tmpl);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
  };

  return (
    <button
      onClick={handlePrint}
      style={{
        padding: "9px 18px",
        borderRadius: 8,
        fontSize: "0.85rem",
        fontWeight: 600,
        background: "#1A7A5E",
        color: "#fff",
        border: "none",
        cursor: "pointer",
      }}
    >
      🖨 Print / Download PDF
    </button>
  );
}

function buildPrintHTML(cert, tmpl) {
  const issued = formatDate(cert.issuedAt);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${tmpl.label} — ${cert.certNumber || "Certificate"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'EB Garamond', Georgia, serif; background: #fff; color: #1C1A16; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm 14mm; border: 3px solid ${tmpl.color}; }
  .header { background: ${tmpl.color}; color: #fff; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; margin: -12mm -14mm 0; padding: 20px 28px; }
  .header-left .dept { font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; opacity: 0.75; margin-bottom: 4px; }
  .header-left .title { font-size: 20px; font-weight: 700; }
  .header-left .certno { font-size: 11px; opacity: 0.85; margin-top: 4px; }
  .header-right { text-align: right; font-size: 11px; opacity: 0.85; line-height: 1.9; }
  .stripe { height: 4px; background: linear-gradient(90deg, ${tmpl.color}, ${tmpl.accent}, ${tmpl.color}); margin: 0 -14mm 24px; }
  .declaration { font-style: italic; font-size: 13px; line-height: 1.8; color: #2C2A26; margin-bottom: 20px; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; margin-bottom: 20px; }
  .field-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9A9490; margin-bottom: 3px; }
  .field-value { font-size: 14px; font-weight: 600; }
  .notes-box { background: #F9F6F0; border: 1px solid #E4DDD2; border-left: 4px solid ${tmpl.accent}; padding: 12px 16px; margin-bottom: 20px; }
  .notes-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${tmpl.color}; margin-bottom: 6px; }
  .notes-text { font-size: 13px; line-height: 1.7; }
  .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
  .sig-line { height: 48px; border-bottom: 1.5px solid #2C2A26; margin-bottom: 6px; display: flex; align-items: flex-end; padding-bottom: 4px; }
  .sig-name { font-style: italic; font-size: 15px; }
  .sig-label { font-size: 10px; color: #7A7670; margin-top: 4px; }
  .stamp-circle { width: 52px; height: 52px; border: 2px dashed #C0BCB6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #C0BCB6; font-size: 8px; text-align: center; line-height: 1.4; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #E4DDD2; display: flex; justify-content: space-between; align-items: center; }
  .footer-left { font-size: 10px; color: #9A9490; }
  .footer-badge { font-size: 9px; padding: 3px 10px; border: 1px solid ${tmpl.color}; color: ${tmpl.color}; border-radius: 20px; font-weight: 700; letter-spacing: 1px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { border: none; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <div class="dept">Republic of Zimbabwe · Department of Veterinary Services</div>
      <div class="title">${tmpl.icon} ${tmpl.label}</div>
      <div class="certno">Certificate No: ${cert.certNumber || "—"}</div>
    </div>
    <div class="header-right">
      <div>Issued: ${issued}</div>
      ${cert.validUntil ? `<div>Valid Until: ${cert.validUntil}</div>` : ""}
      <div style="margin-top:6px;padding:2px 8px;background:rgba(255,255,255,0.2);border-radius:4px;display:inline-block">OFFICIAL DOCUMENT</div>
    </div>
  </div>
  <div class="stripe"></div>

  <p class="declaration">
    This is to certify that the livestock described herein has been inspected by a licensed
    veterinary officer and found to comply with the applicable requirements of the
    Zimbabwe Animal Health Act [Chapter 19:01].
  </p>

  <div class="fields">
    <div><div class="field-label">Issued To</div><div class="field-value">${cert.requesterName || "—"}</div></div>
    <div><div class="field-label">Role / Capacity</div><div class="field-value">${cert.requesterRole || "—"}</div></div>
    <div><div class="field-label">Animal Type</div><div class="field-value">${cert.animalType || "—"}</div></div>
    <div><div class="field-label">Quantity</div><div class="field-value">${cert.quantity ? cert.quantity + " head" : "—"}</div></div>
    <div><div class="field-label">Province / Location</div><div class="field-value">${cert.province || "—"}</div></div>
    <div><div class="field-label">Certificate Type</div><div class="field-value">${tmpl.label}</div></div>
  </div>

  ${
    cert.notes
      ? `
  <div class="notes-box">
    <div class="notes-label">Veterinary Notes &amp; Observations</div>
    <div class="notes-text">${cert.notes}</div>
  </div>`
      : ""
  }

  <div class="sigs">
    <div>
      <div class="sig-line"><span class="sig-name">${cert.vetName || ""}</span></div>
      <div class="sig-label">Issuing Veterinary Officer</div>
      <div style="font-size:13px;font-weight:600;margin-top:3px">${cert.vetName || "—"}</div>
    </div>
    <div>
      <div class="sig-line"><div class="stamp-circle">OFFICIAL<br>STAMP</div></div>
      <div class="sig-label">Authorized Stamp</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">Issued via Kraal Livestock Platform · kraal.co.zw</div>
    <div class="footer-badge">${cert.certNumber || "DRAFT"}</div>
  </div>
</div>
</body>
</html>`;
}

// ─── CERTIFICATE VIEWER MODAL ────────────────────────────────────────────────
// Drop this into VetDashboard where you want to preview + print issued certs.

export function CertificateViewerModal({ cert, onClose }) {
  if (!cert) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 16px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ width: "100%", maxWidth: 760 }}>
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>
            📜 Certificate Preview
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <PrintCertificateButton cert={cert} />
            <button
              onClick={onClose}
              style={{
                padding: "9px 16px",
                borderRadius: 8,
                fontSize: "0.85rem",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>
        <CertificateDocument cert={cert} />
      </div>
    </div>
  );
}
