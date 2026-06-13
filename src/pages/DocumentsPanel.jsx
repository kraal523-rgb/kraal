import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import useAuthStore from "../store/useAuthStore";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateRef(type) {
  const prefix = type === "invoice" ? "INV" : "QUO";
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  return `${prefix}-${ts}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-ZW", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const EMPTY_LINE = { description: "", qty: "", unitPrice: "", total: 0 };

const EMPTY_DOC = {
  type: "quote",
  ref: "",
  status: "draft",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  clientAddress: "",
  issueDate: new Date().toISOString().split("T")[0],
  dueDate: "",
  validUntil: "",
  currency: "USD",
  lines: [{ ...EMPTY_LINE }],
  taxRate: 15,
  notes: "",
  terms:
    "Payment due within 30 days. Animals remain property of seller until full payment received.",
  sellerName: "",
  sellerPhone: "",
  sellerAddress: "",
};

const STATUS_STYLES = {
  draft: {
    bg: "var(--color-background-secondary)",
    color: "var(--color-text-secondary)",
  },
  sent: { bg: "var(--color-background-info)", color: "var(--color-text-info)" },
  accepted: {
    bg: "var(--color-background-success)",
    color: "var(--color-text-success)",
  },
  paid: {
    bg: "var(--color-background-success)",
    color: "var(--color-text-success)",
  },
  overdue: {
    bg: "var(--color-background-danger)",
    color: "var(--color-text-danger)",
  },
  cancelled: {
    bg: "var(--color-background-warning)",
    color: "var(--color-text-warning)",
  },
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function DocumentsPanel() {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [mode, setMode] = useState("list"); // list | edit | preview
  const [currentDoc, setCurrentDoc] = useState(null);
  const [form, setForm] = useState(EMPTY_DOC);
  const [saving, setSaving] = useState(false);
  const printRef = useRef(null);

  // ── Firestore sync ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "kraal_documents"),
      where("sellerId", "==", user.uid),
    );
    return onSnapshot(q, (snap) => {
      setDocuments(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          ),
      );
      setLoading(false);
    });
  }, [user?.uid]);

  // ── Line calculations ────────────────────────────────────────────────────
  function recalcLine(lines, index, field, value) {
    return lines.map((l, i) => {
      if (i !== index) return l;
      const updated = { ...l, [field]: value };
      updated.total =
        (Number(updated.qty) || 0) * (Number(updated.unitPrice) || 0);
      return updated;
    });
  }

  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, { ...EMPTY_LINE }] }));
  }

  function removeLine(idx) {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }

  const subtotal = form.lines.reduce((s, l) => s + (Number(l.total) || 0), 0);
  const taxAmount = (subtotal * (Number(form.taxRate) || 0)) / 100;
  const grandTotal = subtotal + taxAmount;

  // ── Save ─────────────────────────────────────────────────────────────────
  async function saveDocument() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        sellerId: user.uid,
        subtotal,
        taxAmount,
        grandTotal,
        updatedAt: serverTimestamp(),
      };
      if (currentDoc?.id) {
        await updateDoc(doc(db, "kraal_documents", currentDoc.id), payload);
      } else {
        const ref = generateRef(form.type);
        await addDoc(collection(db, "kraal_documents"), {
          ...payload,
          ref,
          createdAt: serverTimestamp(),
        });
      }
      setMode("list");
      setCurrentDoc(null);
    } finally {
      setSaving(false);
    }
  }

  async function deleteDocument(id) {
    if (!window.confirm("Delete this document permanently?")) return;
    await deleteDoc(doc(db, "kraal_documents", id));
  }

  async function updateStatus(id, status) {
    await updateDoc(doc(db, "kraal_documents", id), {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  // ── Open forms ───────────────────────────────────────────────────────────
  function openNew(type) {
    setCurrentDoc(null);
    setForm({
      ...EMPTY_DOC,
      type,
      sellerName: user?.displayName || "",
      sellerPhone: user?.phone || "",
      sellerAddress: user?.location || "Zimbabwe",
    });
    setMode("edit");
  }

  function openEdit(docObj) {
    setCurrentDoc(docObj);
    setForm({ ...EMPTY_DOC, ...docObj });
    setMode("edit");
  }

  function openPreview(docObj) {
    setCurrentDoc(docObj);
    setForm({ ...EMPTY_DOC, ...docObj });
    setMode("preview");
  }

  // ── Print ────────────────────────────────────────────────────────────────
  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>${form.ref || "Document"}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #222; padding: 32px; }
        .pv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .pv-brand { font-size: 22px; font-weight: 700; color: #1a6b3c; }
        .pv-ref { font-size: 16px; font-weight: 600; }
        .pv-type-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: #e8f5ec; color: #1a6b3c; }
        .pv-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .pv-party-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
        .pv-party-name { font-weight: 600; font-size: 14px; }
        .pv-party-detail { color: #555; line-height: 1.6; }
        .pv-dates { display: flex; gap: 32px; margin-bottom: 24px; padding: 12px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; }
        .pv-date-item { display: flex; flex-direction: column; gap: 2px; }
        .pv-date-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
        .pv-date-val { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        thead tr { background: #f0faf4; }
        th { padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; border-bottom: 2px solid #d4edd9; }
        td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
        .text-right { text-align: right; }
        .pv-totals { width: 260px; margin-left: auto; }
        .pv-total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .pv-grand-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; font-weight: 700; border-top: 2px solid #222; margin-top: 4px; }
        .pv-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .pv-footer-label { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 4px; letter-spacing: 0.5px; }
        .pv-footer-text { font-size: 12px; color: #555; line-height: 1.6; }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  }

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered =
    typeFilter === "all"
      ? documents
      : documents.filter((d) => d.type === typeFilter);

  // ─────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === "list") {
    return (
      <div className="dp-root">
        <div className="dp-toolbar">
          <div className="dp-filter-tabs">
            {["all", "quote", "invoice"].map((t) => (
              <button
                key={t}
                className={`dp-filter-btn ${typeFilter === t ? "active" : ""}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === "all"
                  ? "All"
                  : t === "quote"
                    ? "📋 Quotes"
                    : "🧾 Invoices"}
                <span className="dp-filter-count">
                  {t === "all"
                    ? documents.length
                    : documents.filter((d) => d.type === t).length}
                </span>
              </button>
            ))}
          </div>
          <div className="dp-new-btns">
            <button
              className="dp-new-btn dp-new-quote"
              onClick={() => openNew("quote")}
            >
              + New quote
            </button>
            <button
              className="dp-new-btn dp-new-invoice"
              onClick={() => openNew("invoice")}
            >
              + New invoice
            </button>
          </div>
        </div>

        {loading ? (
          <div className="dp-empty">
            <span>⏳</span>
            <p>Loading documents…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="dp-empty">
            <span>🗂</span>
            <p>No documents yet. Create a quote or invoice to get started.</p>
          </div>
        ) : (
          <div className="dp-list">
            {filtered.map((d) => {
              const st = STATUS_STYLES[d.status] || STATUS_STYLES.draft;
              return (
                <div key={d.id} className="dp-doc-row">
                  <div className="dp-doc-left">
                    <span
                      className="dp-doc-type-badge"
                      style={{
                        background:
                          d.type === "invoice" ? "#e8f0fe" : "#e8f5ec",
                        color: d.type === "invoice" ? "#1557b0" : "#1a6b3c",
                      }}
                    >
                      {d.type === "invoice" ? "🧾 Invoice" : "📋 Quote"}
                    </span>
                    <span className="dp-doc-ref">{d.ref || "—"}</span>
                    <span className="dp-doc-client">
                      {d.clientName || "No client"}
                    </span>
                  </div>
                  <div className="dp-doc-middle">
                    <span className="dp-doc-amount">
                      {d.currency || "USD"}{" "}
                      {(d.grandTotal || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <span className="dp-doc-date">
                      {formatDate(d.issueDate)}
                    </span>
                  </div>
                  <div className="dp-doc-right">
                    <span
                      className="dp-status-pill"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {d.status}
                    </span>
                    <div className="dp-doc-actions">
                      <button
                        className="dp-action-btn"
                        onClick={() => openPreview(d)}
                        title="Preview"
                      >
                        👁
                      </button>
                      <button
                        className="dp-action-btn"
                        onClick={() => openEdit(d)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <select
                        className="dp-status-select"
                        value={d.status}
                        onChange={(e) => updateStatus(d.id, e.target.value)}
                        title="Change status"
                      >
                        {Object.keys(STATUS_STYLES).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        className="dp-action-btn dp-action-del"
                        onClick={() => deleteDocument(d.id)}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === "edit") {
    return (
      <div className="dp-root">
        <div className="dp-edit-header">
          <button className="dp-back-btn" onClick={() => setMode("list")}>
            ← Back
          </button>
          <h2>
            {currentDoc ? `Edit ${form.type}` : `New ${form.type}`}{" "}
            {form.ref ? `— ${form.ref}` : ""}
          </h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="dp-preview-btn"
              onClick={() => setMode("preview")}
            >
              👁 Preview
            </button>
            <button
              className="dp-save-btn"
              onClick={saveDocument}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="dp-edit-body">
          {/* Document type + status */}
          <div className="dp-section">
            <div className="dp-section-title">Document info</div>
            <div className="dp-form-grid">
              <div className="dp-fg">
                <label>Type</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  <option value="quote">Quote</option>
                  <option value="invoice">Invoice</option>
                </select>
              </div>
              <div className="dp-fg">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  {Object.keys(STATUS_STYLES).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="dp-fg">
                <label>Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currency: e.target.value }))
                  }
                >
                  <option>USD</option>
                  <option>ZWG</option>
                  <option>ZAR</option>
                  <option>BWP</option>
                </select>
              </div>
              <div className="dp-fg">
                <label>Issue date</label>
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, issueDate: e.target.value }))
                  }
                />
              </div>
              {form.type === "invoice" ? (
                <div className="dp-fg">
                  <label>Due date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dueDate: e.target.value }))
                    }
                  />
                </div>
              ) : (
                <div className="dp-fg">
                  <label>Valid until</label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, validUntil: e.target.value }))
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Parties */}
          <div className="dp-two-col">
            <div className="dp-section">
              <div className="dp-section-title">From (your details)</div>
              <div className="dp-form-stack">
                <div className="dp-fg">
                  <label>Your name / farm name</label>
                  <input
                    value={form.sellerName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sellerName: e.target.value }))
                    }
                    placeholder="Takudzwa Moyo Farms"
                  />
                </div>
                <div className="dp-fg">
                  <label>Phone / WhatsApp</label>
                  <input
                    value={form.sellerPhone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sellerPhone: e.target.value }))
                    }
                    placeholder="+263 71 234 5678"
                  />
                </div>
                <div className="dp-fg">
                  <label>Address</label>
                  <textarea
                    rows={2}
                    value={form.sellerAddress}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sellerAddress: e.target.value }))
                    }
                    placeholder="Marondera, Mashonaland East"
                  />
                </div>
              </div>
            </div>
            <div className="dp-section">
              <div className="dp-section-title">Bill to (client)</div>
              <div className="dp-form-stack">
                <div className="dp-fg">
                  <label>Client name *</label>
                  <input
                    value={form.clientName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, clientName: e.target.value }))
                    }
                    placeholder="Farai Chikwanda"
                  />
                </div>
                <div className="dp-fg">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, clientEmail: e.target.value }))
                    }
                    placeholder="farai@example.com"
                  />
                </div>
                <div className="dp-fg">
                  <label>Phone</label>
                  <input
                    value={form.clientPhone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, clientPhone: e.target.value }))
                    }
                    placeholder="+263 77 987 6543"
                  />
                </div>
                <div className="dp-fg">
                  <label>Address</label>
                  <textarea
                    rows={2}
                    value={form.clientAddress}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, clientAddress: e.target.value }))
                    }
                    placeholder="Gweru, Midlands"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="dp-section">
            <div className="dp-section-title">Line items</div>
            <div className="dp-line-table-wrap">
              <table className="dp-line-table">
                <thead>
                  <tr>
                    <th style={{ width: "45%" }}>Description</th>
                    <th style={{ width: "12%" }}>Qty</th>
                    <th style={{ width: "18%" }}>Unit price</th>
                    <th style={{ width: "18%" }}>Total</th>
                    <th style={{ width: "7%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          className="dp-inline-input"
                          placeholder="e.g. 5× Brahman Bulls – Grade A"
                          value={line.description}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              lines: recalcLine(
                                f.lines,
                                idx,
                                "description",
                                e.target.value,
                              ),
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="dp-inline-input dp-num-input"
                          type="number"
                          min="0"
                          value={line.qty}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              lines: recalcLine(
                                f.lines,
                                idx,
                                "qty",
                                e.target.value,
                              ),
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="dp-inline-input dp-num-input"
                          type="number"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              lines: recalcLine(
                                f.lines,
                                idx,
                                "unitPrice",
                                e.target.value,
                              ),
                            }))
                          }
                        />
                      </td>
                      <td className="dp-line-total">
                        {(line.total || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        {form.lines.length > 1 && (
                          <button
                            className="dp-remove-line"
                            onClick={() => removeLine(idx)}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="dp-add-line-btn" onClick={addLine}>
              + Add line
            </button>

            <div className="dp-totals-block">
              <div className="dp-total-row">
                <span>Subtotal</span>
                <span>
                  {form.currency}{" "}
                  {subtotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="dp-total-row">
                <span
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  Tax
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.taxRate}
                    className="dp-tax-input"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, taxRate: e.target.value }))
                    }
                  />
                  %
                </span>
                <span>
                  {form.currency}{" "}
                  {taxAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="dp-grand-total-row">
                <span>Total</span>
                <span>
                  {form.currency}{" "}
                  {grandTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Notes + Terms */}
          <div className="dp-two-col">
            <div className="dp-section">
              <div className="dp-section-title">Notes</div>
              <textarea
                className="dp-textarea"
                rows={4}
                placeholder="Delivery instructions, special conditions, thank you message…"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
            <div className="dp-section">
              <div className="dp-section-title">Terms &amp; conditions</div>
              <textarea
                className="dp-textarea"
                rows={4}
                value={form.terms}
                onChange={(e) =>
                  setForm((f) => ({ ...f, terms: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PREVIEW / PRINT VIEW
  // ─────────────────────────────────────────────────────────────────────────
  const previewSubtotal = form.lines.reduce(
    (s, l) => s + (Number(l.total) || 0),
    0,
  );
  const previewTax = (previewSubtotal * (Number(form.taxRate) || 0)) / 100;
  const previewTotal = previewSubtotal + previewTax;

  return (
    <div className="dp-root">
      <div className="dp-preview-toolbar">
        <button className="dp-back-btn" onClick={() => setMode("list")}>
          ← Back
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="dp-action-btn-lg" onClick={() => setMode("edit")}>
            ✏️ Edit
          </button>
          <button className="dp-print-btn" onClick={handlePrint}>
            🖨 Print / PDF
          </button>
        </div>
      </div>

      <div className="dp-preview-paper" ref={printRef}>
        {/* Header */}
        <div className="pv-header">
          <div>
            <div className="pv-brand">🐄 Kraal</div>
            <div className="pv-seller-detail">{form.sellerName}</div>
            <div className="pv-seller-detail">{form.sellerPhone}</div>
            <div className="pv-seller-detail">{form.sellerAddress}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              className="pv-type-badge"
              style={{
                background: form.type === "invoice" ? "#e8f0fe" : "#e8f5ec",
                color: form.type === "invoice" ? "#1557b0" : "#1a6b3c",
              }}
            >
              {form.type.toUpperCase()}
            </span>
            <div className="pv-ref">{form.ref || "Draft"}</div>
            <div
              className="pv-status-chip"
              style={{
                background: STATUS_STYLES[form.status]?.bg,
                color: STATUS_STYLES[form.status]?.color,
              }}
            >
              {form.status}
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="pv-parties">
          <div>
            <div className="pv-party-label">From</div>
            <div className="pv-party-name">{form.sellerName || "—"}</div>
            <div className="pv-party-detail">{form.sellerPhone}</div>
            <div className="pv-party-detail">{form.sellerAddress}</div>
          </div>
          <div>
            <div className="pv-party-label">Bill to</div>
            <div className="pv-party-name">{form.clientName || "—"}</div>
            <div className="pv-party-detail">{form.clientEmail}</div>
            <div className="pv-party-detail">{form.clientPhone}</div>
            <div className="pv-party-detail">{form.clientAddress}</div>
          </div>
        </div>

        {/* Dates */}
        <div className="pv-dates">
          <div className="pv-date-item">
            <span className="pv-date-label">Issue date</span>
            <span className="pv-date-val">{formatDate(form.issueDate)}</span>
          </div>
          {form.type === "invoice" && form.dueDate && (
            <div className="pv-date-item">
              <span className="pv-date-label">Due date</span>
              <span className="pv-date-val">{formatDate(form.dueDate)}</span>
            </div>
          )}
          {form.type === "quote" && form.validUntil && (
            <div className="pv-date-item">
              <span className="pv-date-label">Valid until</span>
              <span className="pv-date-val">{formatDate(form.validUntil)}</span>
            </div>
          )}
        </div>

        {/* Line items */}
        <table className="pv-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Unit price</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {form.lines.map((l, i) => (
              <tr key={i}>
                <td>{l.description || "—"}</td>
                <td className="text-right">{l.qty || "—"}</td>
                <td className="text-right">
                  {l.unitPrice
                    ? `${form.currency} ${Number(l.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : "—"}
                </td>
                <td className="text-right">
                  {form.currency}{" "}
                  {(Number(l.total) || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="pv-totals">
          <div className="pv-total-row">
            <span>Subtotal</span>
            <span>
              {form.currency}{" "}
              {previewSubtotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="pv-total-row">
            <span>Tax ({form.taxRate}%)</span>
            <span>
              {form.currency}{" "}
              {previewTax.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="pv-grand-row">
            <span>Total due</span>
            <span>
              {form.currency}{" "}
              {previewTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pv-footer">
          {form.notes && (
            <div>
              <div className="pv-footer-label">Notes</div>
              <div className="pv-footer-text">{form.notes}</div>
            </div>
          )}
          {form.terms && (
            <div>
              <div className="pv-footer-label">Terms &amp; conditions</div>
              <div className="pv-footer-text">{form.terms}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
