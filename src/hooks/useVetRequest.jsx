

import { useState, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const CERT_TYPES = [
  { id: "movement",    label: "Movement Permit",       icon: "🚚" },
  { id: "health",      label: "Health Certificate",     icon: "💉" },
  { id: "vaccination", label: "Vaccination Record",     icon: "🩺" },
  { id: "inspection",  label: "Pre-Sale Inspection",    icon: "🔍" },
  { id: "slaughter",   label: "Fit-for-Slaughter",      icon: "✅" },
];

const ANIMAL_TYPES = [
  "Cattle","Goats","Sheep","Pigs","Chickens","Ducks","Horses","Donkeys","Other",
];

const PROVINCES = [
  "Harare","Bulawayo","Manicaland","Mashonaland Central",
  "Mashonaland East","Mashonaland West","Masvingo",
  "Matabeleland North","Matabeleland South","Midlands",
];

export function useVetRequest(user, userProfile) {
  const [open, setOpen]           = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [form, setForm] = useState({
    certType:   "",
    animalType: "",
    quantity:   "",
    province:   userProfile?.province || "",
    town:       "",
    notes:      "",
    preferredDate: "",
  });

  const openVetRequest = useCallback((prefill = {}) => {
    setForm((f) => ({ ...f, ...prefill }));
    setSuccess(false);
    setOpen(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.certType || !form.animalType || !form.province) return;
    setSubmitting(true);

    try {
      // 1. Create the vet_request document
      const reqRef = await addDoc(collection(db, "vet_requests"), {
        ...form,
        requesterId:   user.uid,
        requesterName: user.displayName || user.email,
        requesterEmail: user.email,
        requesterRole: userProfile?.role || "buyer",
        status:        "pending",
        vetId:         null,
        createdAt:     serverTimestamp(),
      });

      // 2. Find vets in the same province and notify them
      const vetSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "vet"), where("province", "==", form.province)),
      );

      await Promise.all(
        vetSnap.docs.map((vetDoc) =>
          addDoc(collection(db, "notifications"), {
            toUid:        vetDoc.id,
            type:         "new_vet_request",
            vetRequestId: reqRef.id,
            message:      `New ${form.certType} request from ${user.displayName || user.email} in ${form.province} for ${form.quantity}× ${form.animalType}.`,
            province:     form.province,
            createdAt:    serverTimestamp(),
            read:         false,
          }),
        ),
      );

      setSuccess(true);
      setForm({ certType: "", animalType: "", quantity: "", province: userProfile?.province || "", town: "", notes: "", preferredDate: "" });
      setTimeout(() => { setSuccess(false); setOpen(false); }, 3000);
    } catch (err) {
      console.error("Vet request failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const modal = open ? (
    <div style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,.4)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div style={{
        background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500,
        maxHeight: "90vh", overflowY: "auto", padding: 24,
        display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,.18)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>🩺 Request Vet Certificate</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#7A7670" }}>
              A licensed veterinarian in your province will be notified immediately.
            </p>
          </div>
          <button onClick={() => setOpen(false)} style={{ fontSize: "1rem", color: "#7A7670", border: "none", background: "none", cursor: "pointer" }}>✕</button>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: "2.5rem" }}>✅</div>
            <h3 style={{ marginTop: 8 }}>Request Sent!</h3>
            <p style={{ color: "#7A7670", fontSize: "0.85rem" }}>
              Veterinarians in <strong>{form.province || "your province"}</strong> have been notified.
              You'll receive a message when one is assigned.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Cert type grid */}
            <div>
              <label style={labelStyle}>Certificate Type *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                {CERT_TYPES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, certType: c.id }))}
                    style={{
                      padding: "10px 12px", borderRadius: 8, textAlign: "left",
                      border: `2px solid ${form.certType === c.id ? "#1A7A5E" : "#E4DDD2"}`,
                      background: form.certType === c.id ? "#E6F4F0" : "#F5F2EC",
                      cursor: "pointer", fontSize: "0.82rem", fontWeight: 500,
                      color: form.certType === c.id ? "#145C46" : "#2C2A26",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Animal + quantity */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Animal Type *</label>
                <select required value={form.animalType}
                  onChange={(e) => setForm((f) => ({ ...f, animalType: e.target.value }))}
                  style={inputStyle}>
                  <option value="">Select…</option>
                  {ANIMAL_TYPES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantity *</label>
                <input type="number" min="1" required placeholder="e.g. 5"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  style={inputStyle} />
              </div>
            </div>

            {/* Location */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Province *</label>
                <select required value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                  style={inputStyle}>
                  <option value="">Select…</option>
                  {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Town / Farm</label>
                <input type="text" placeholder="e.g. Marondera"
                  value={form.town}
                  onChange={(e) => setForm((f) => ({ ...f, town: e.target.value }))}
                  style={inputStyle} />
              </div>
            </div>

            {/* Preferred date */}
            <div>
              <label style={labelStyle}>Preferred Inspection Date</label>
              <input type="date" value={form.preferredDate}
                onChange={(e) => setForm((f) => ({ ...f, preferredDate: e.target.value }))}
                style={inputStyle} />
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Additional Notes</label>
              <textarea rows={3} placeholder="e.g. Animals need to be cleared for cross-province movement…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                style={{ ...inputStyle, resize: "vertical" }} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setOpen(false)} style={cancelBtnStyle}>Cancel</button>
              <button type="submit" disabled={submitting || !form.certType || !form.animalType || !form.province} style={submitBtnStyle}>
                {submitting ? "Sending…" : "🩺 Send to Vets"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  ) : null;

  return { openVetRequest, vetRequestModal: modal };
}

// ── Inline styles (avoids CSS class conflicts with host dashboards) ──────────

const labelStyle = {
  display: "block", fontSize: "0.78rem", fontWeight: 600,
  color: "#2C2A26", marginBottom: 4,
};

const inputStyle = {
  width: "100%", border: "1px solid #E4DDD2", borderRadius: 8,
  padding: "8px 11px", fontSize: "0.85rem", background: "#F5F2EC",
  fontFamily: "inherit", color: "#2C2A26",
  boxSizing: "border-box",
};

const cancelBtnStyle = {
  padding: "9px 18px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600,
  border: "1px solid #E4DDD2", color: "#7A7670", background: "#fff", cursor: "pointer",
};

const submitBtnStyle = {
  padding: "9px 20px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600,
  background: "#1A7A5E", color: "#fff", border: "none", cursor: "pointer",
  opacity: 1,
};