import { useState, useEffect } from "react";
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

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { id: "cattle", label: "Cattle", emoji: "🐄" },
  { id: "goats", label: "Goats", emoji: "🐐" },
  { id: "sheep", label: "Sheep", emoji: "🐑" },
  { id: "chicken", label: "Chicken", emoji: "🐓" },
  { id: "pigs", label: "Pigs", emoji: "🐖" },
  { id: "rabbits", label: "Rabbits", emoji: "🐇" },
  { id: "ducks", label: "Ducks", emoji: "🦆" },
  { id: "turkey", label: "Turkey", emoji: "🦃" },
  { id: "guinea", label: "Guinea Fowl", emoji: "🦤" },
  { id: "horses", label: "Horses", emoji: "🐴" },
  { id: "donkeys", label: "Donkeys", emoji: "🫏" },
  { id: "other", label: "Other", emoji: "🐾" },
];

const FEED_UNITS = [
  "kg/day",
  "g/day",
  "bales/week",
  "buckets/day",
  "litres/day",
];

const HEALTH_STATUS = [
  {
    value: "healthy",
    label: "Healthy",
    color: "var(--color-background-success)",
    textColor: "var(--color-text-success)",
  },
  {
    value: "monitor",
    label: "Monitor",
    color: "var(--color-background-warning)",
    textColor: "var(--color-text-warning)",
  },
  {
    value: "sick",
    label: "Sick",
    color: "var(--color-background-danger)",
    textColor: "var(--color-text-danger)",
  },
  {
    value: "quarantine",
    label: "Quarantine",
    color: "var(--color-background-info)",
    textColor: "var(--color-text-info)",
  },
];

// ─── EMPTY FORMS ─────────────────────────────────────────────────────────────

const EMPTY_PEN = {
  name: "",
  category: "cattle",
  breed: "",
  quantity: "",
  avgWeight: "",
  ageGroup: "",
  healthStatus: "healthy",
  location: "",
  notes: "",
};

const EMPTY_FEED = {
  name: "",
  penId: "",
  feedType: "",
  quantity: "",
  unit: "kg/day",
  supplier: "",
  costPerUnit: "",
  lastRestocked: "",
  stockLevel: "",
  minStockAlert: "",
  notes: "",
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function StockManager() {
  const { user } = useAuthStore();
  const [subTab, setSubTab] = useState("pens");
  const [pens, setPens] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPenForm, setShowPenForm] = useState(false);
  const [showFeedForm, setShowFeedForm] = useState(false);
  const [editPen, setEditPen] = useState(null);
  const [editFeed, setEditFeed] = useState(null);
  const [penForm, setPenForm] = useState(EMPTY_PEN);
  const [feedForm, setFeedForm] = useState(EMPTY_FEED);
  const [saving, setSaving] = useState(false);

  // ── Live Firestore sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsubs = [];

    const pensQ = query(
      collection(db, "stock_pens"),
      where("sellerId", "==", user.uid),
    );
    unsubs.push(
      onSnapshot(pensQ, (snap) => {
        setPens(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }),
    );

    const feedQ = query(
      collection(db, "stock_feeds"),
      where("sellerId", "==", user.uid),
    );
    unsubs.push(
      onSnapshot(feedQ, (snap) => {
        setFeeds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }),
    );

    return () => unsubs.forEach((u) => u());
  }, [user?.uid]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const totalAnimals = pens.reduce((s, p) => s + Number(p.quantity || 0), 0);
  const alertFeeds = feeds.filter(
    (f) =>
      f.stockLevel &&
      f.minStockAlert &&
      Number(f.stockLevel) <= Number(f.minStockAlert),
  );
  const getCategoryMeta = (id) =>
    CATEGORY_OPTIONS.find((c) => c.id === id) || { emoji: "🐾", label: id };

  const getPenName = (id) => {
    const pen = pens.find((p) => p.id === id);
    return pen ? pen.name : "—";
  };

  // ── Save / delete pens ───────────────────────────────────────────────────
  async function savePen() {
    if (!penForm.name || !penForm.quantity) return;
    setSaving(true);
    try {
      const payload = {
        ...penForm,
        sellerId: user.uid,
        updatedAt: serverTimestamp(),
      };
      if (editPen) {
        await updateDoc(doc(db, "stock_pens", editPen.id), payload);
      } else {
        await addDoc(collection(db, "stock_pens"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      setShowPenForm(false);
      setEditPen(null);
      setPenForm(EMPTY_PEN);
    } finally {
      setSaving(false);
    }
  }

  async function deletePen(id) {
    if (
      !window.confirm(
        "Remove this pen/batch? Feed schedules linked to it will still exist.",
      )
    )
      return;
    await deleteDoc(doc(db, "stock_pens", id));
  }

  // ── Save / delete feeds ──────────────────────────────────────────────────
  async function saveFeed() {
    if (!feedForm.name || !feedForm.feedType) return;
    setSaving(true);
    try {
      const payload = {
        ...feedForm,
        sellerId: user.uid,
        updatedAt: serverTimestamp(),
      };
      if (editFeed) {
        await updateDoc(doc(db, "stock_feeds", editFeed.id), payload);
      } else {
        await addDoc(collection(db, "stock_feeds"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      setShowFeedForm(false);
      setEditFeed(null);
      setFeedForm(EMPTY_FEED);
    } finally {
      setSaving(false);
    }
  }

  async function deleteFeed(id) {
    if (!window.confirm("Delete this feed entry?")) return;
    await deleteDoc(doc(db, "stock_feeds", id));
  }

  // ── Open edit forms ──────────────────────────────────────────────────────
  function openEditPen(pen) {
    setEditPen(pen);
    setPenForm({ ...EMPTY_PEN, ...pen });
    setShowPenForm(true);
  }

  function openEditFeed(feed) {
    setEditFeed(feed);
    setFeedForm({ ...EMPTY_FEED, ...feed });
    setShowFeedForm(true);
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="sm-root">
      {/* ── Summary row ─── */}
      <div className="sm-summary-row">
        <div className="sm-summary-card">
          <span className="sm-sum-icon">🐾</span>
          <div>
            <span className="sm-sum-value">
              {totalAnimals.toLocaleString()}
            </span>
            <span className="sm-sum-label">Total animals</span>
          </div>
        </div>
        <div className="sm-summary-card">
          <span className="sm-sum-icon">🏠</span>
          <div>
            <span className="sm-sum-value">{pens.length}</span>
            <span className="sm-sum-label">Pens / batches</span>
          </div>
        </div>
        <div className="sm-summary-card">
          <span className="sm-sum-icon">🌾</span>
          <div>
            <span className="sm-sum-value">{feeds.length}</span>
            <span className="sm-sum-label">Feed schedules</span>
          </div>
        </div>
        {alertFeeds.length > 0 && (
          <div className="sm-summary-card sm-summary-warn">
            <span className="sm-sum-icon">⚠️</span>
            <div>
              <span className="sm-sum-value">{alertFeeds.length}</span>
              <span className="sm-sum-label">Low stock alerts</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Sub-tabs ─── */}
      <div className="sm-subtabs">
        <button
          className={`sm-subtab ${subTab === "pens" ? "active" : ""}`}
          onClick={() => setSubTab("pens")}
        >
          🏠 Pens & Breeds
        </button>
        <button
          className={`sm-subtab ${subTab === "feeds" ? "active" : ""}`}
          onClick={() => setSubTab("feeds")}
        >
          🌾 Feed Schedules
          {alertFeeds.length > 0 && (
            <span className="sm-alert-badge">{alertFeeds.length}</span>
          )}
        </button>
      </div>

      {/* ══════ PENS TAB ══════ */}
      {subTab === "pens" && (
        <div className="sm-panel">
          <div className="sm-panel-header">
            <h3>Pens &amp; Batches</h3>
            <button
              className="sm-add-btn"
              onClick={() => {
                setEditPen(null);
                setPenForm(EMPTY_PEN);
                setShowPenForm(true);
              }}
            >
              + Add pen
            </button>
          </div>

          {loading ? (
            <div className="sm-empty">
              <span>⏳</span>
              <p>Loading stock…</p>
            </div>
          ) : pens.length === 0 ? (
            <div className="sm-empty">
              <span>🏠</span>
              <p>
                No pens or batches yet. Add your first to start tracking stock.
              </p>
            </div>
          ) : (
            <div className="sm-card-grid">
              {pens.map((pen) => {
                const cat = getCategoryMeta(pen.category);
                const health =
                  HEALTH_STATUS.find((h) => h.value === pen.healthStatus) ||
                  HEALTH_STATUS[0];
                return (
                  <div key={pen.id} className="sm-pen-card">
                    <div className="sm-pen-top">
                      <span className="sm-pen-emoji">{cat.emoji}</span>
                      <div className="sm-pen-title-group">
                        <span className="sm-pen-name">{pen.name}</span>
                        <span className="sm-pen-breed">
                          {pen.breed || cat.label}
                        </span>
                      </div>
                      <span
                        className="sm-health-pill"
                        style={{
                          background: health.color,
                          color: health.textColor,
                        }}
                      >
                        {health.label}
                      </span>
                    </div>

                    <div className="sm-pen-stats">
                      <div className="sm-pen-stat">
                        <span className="sm-pstat-label">Quantity</span>
                        <span className="sm-pstat-value">{pen.quantity}</span>
                      </div>
                      {pen.avgWeight && (
                        <div className="sm-pen-stat">
                          <span className="sm-pstat-label">Avg weight</span>
                          <span className="sm-pstat-value">
                            {pen.avgWeight} kg
                          </span>
                        </div>
                      )}
                      {pen.ageGroup && (
                        <div className="sm-pen-stat">
                          <span className="sm-pstat-label">Age</span>
                          <span className="sm-pstat-value">{pen.ageGroup}</span>
                        </div>
                      )}
                      {pen.location && (
                        <div className="sm-pen-stat">
                          <span className="sm-pstat-label">Location</span>
                          <span className="sm-pstat-value">{pen.location}</span>
                        </div>
                      )}
                    </div>

                    {pen.notes && <p className="sm-pen-notes">{pen.notes}</p>}

                    <div className="sm-pen-actions">
                      <button
                        className="sm-action-ghost"
                        onClick={() => openEditPen(pen)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="sm-action-ghost sm-action-del"
                        onClick={() => deletePen(pen.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════ FEEDS TAB ══════ */}
      {subTab === "feeds" && (
        <div className="sm-panel">
          <div className="sm-panel-header">
            <h3>Feed Schedules</h3>
            <button
              className="sm-add-btn"
              onClick={() => {
                setEditFeed(null);
                setFeedForm(EMPTY_FEED);
                setShowFeedForm(true);
              }}
            >
              + Add feed
            </button>
          </div>

          {feeds.length === 0 ? (
            <div className="sm-empty">
              <span>🌾</span>
              <p>No feed schedules yet. Add one to track what each pen eats.</p>
            </div>
          ) : (
            <div className="sm-feed-list">
              {feeds.map((feed) => {
                const isLow =
                  feed.stockLevel &&
                  feed.minStockAlert &&
                  Number(feed.stockLevel) <= Number(feed.minStockAlert);
                return (
                  <div
                    key={feed.id}
                    className={`sm-feed-row ${isLow ? "sm-feed-alert" : ""}`}
                  >
                    <div className="sm-feed-left">
                      <span className="sm-feed-name">{feed.name}</span>
                      <span className="sm-feed-type">{feed.feedType}</span>
                      {feed.penId && (
                        <span className="sm-feed-pen">
                          Pen: {getPenName(feed.penId)}
                        </span>
                      )}
                    </div>

                    <div className="sm-feed-middle">
                      <span className="sm-feed-qty">
                        {feed.quantity} {feed.unit}
                      </span>
                      {feed.supplier && (
                        <span className="sm-feed-supplier">
                          📦 {feed.supplier}
                        </span>
                      )}
                      {feed.costPerUnit && (
                        <span className="sm-feed-cost">
                          USD {feed.costPerUnit}/
                          {feed.unit?.split("/")[1] || "unit"}
                        </span>
                      )}
                    </div>

                    <div className="sm-feed-stock">
                      {feed.stockLevel !== "" &&
                      feed.stockLevel !== undefined ? (
                        <>
                          <span
                            className={`sm-stock-level ${isLow ? "sm-stock-low" : ""}`}
                          >
                            {isLow ? "⚠️ " : "✅ "}
                            Stock: {feed.stockLevel} kg
                          </span>
                          {feed.minStockAlert && (
                            <span className="sm-stock-min">
                              Min: {feed.minStockAlert} kg
                            </span>
                          )}
                        </>
                      ) : null}
                    </div>

                    <div className="sm-feed-actions">
                      <button
                        className="sm-action-ghost"
                        onClick={() => openEditFeed(feed)}
                      >
                        ✏️
                      </button>
                      <button
                        className="sm-action-ghost sm-action-del"
                        onClick={() => deleteFeed(feed.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ PEN FORM MODAL ══ */}
      {showPenForm && (
        <div className="sm-overlay" onClick={() => setShowPenForm(false)}>
          <div className="sm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sm-modal-header">
              <h2>{editPen ? "✏️ Edit pen" : "🏠 Add pen / batch"}</h2>
              <button onClick={() => setShowPenForm(false)}>✕</button>
            </div>
            <div className="sm-modal-body">
              <div className="sm-form-grid">
                <div className="sm-fg sm-fg-full">
                  <label>Pen / batch name *</label>
                  <input
                    placeholder="e.g. Pen A – Brahman Bulls"
                    value={penForm.name}
                    onChange={(e) =>
                      setPenForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Animal category *</label>
                  <select
                    value={penForm.category}
                    onChange={(e) =>
                      setPenForm((p) => ({ ...p, category: e.target.value }))
                    }
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm-fg">
                  <label>Breed</label>
                  <input
                    placeholder="e.g. Brahman, Boer, Dorper"
                    value={penForm.breed}
                    onChange={(e) =>
                      setPenForm((p) => ({ ...p, breed: e.target.value }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Number of animals"
                    value={penForm.quantity}
                    onChange={(e) =>
                      setPenForm((p) => ({ ...p, quantity: e.target.value }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Avg weight (kg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={penForm.avgWeight}
                    onChange={(e) =>
                      setPenForm((p) => ({ ...p, avgWeight: e.target.value }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Age group</label>
                  <input
                    placeholder="e.g. 18–24 months"
                    value={penForm.ageGroup}
                    onChange={(e) =>
                      setPenForm((p) => ({ ...p, ageGroup: e.target.value }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Health status</label>
                  <select
                    value={penForm.healthStatus}
                    onChange={(e) =>
                      setPenForm((p) => ({
                        ...p,
                        healthStatus: e.target.value,
                      }))
                    }
                  >
                    {HEALTH_STATUS.map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm-fg">
                  <label>Location / paddock</label>
                  <input
                    placeholder="e.g. North paddock"
                    value={penForm.location}
                    onChange={(e) =>
                      setPenForm((p) => ({ ...p, location: e.target.value }))
                    }
                  />
                </div>

                <div className="sm-fg sm-fg-full">
                  <label>Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Vaccination history, last vet visit, special care…"
                    value={penForm.notes}
                    onChange={(e) =>
                      setPenForm((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="sm-modal-footer">
              <button
                className="sm-btn-cancel"
                onClick={() => setShowPenForm(false)}
              >
                Cancel
              </button>
              <button
                className="sm-btn-save"
                onClick={savePen}
                disabled={saving || !penForm.name || !penForm.quantity}
              >
                {saving ? "Saving…" : editPen ? "Save changes" : "Add pen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ FEED FORM MODAL ══ */}
      {showFeedForm && (
        <div className="sm-overlay" onClick={() => setShowFeedForm(false)}>
          <div className="sm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sm-modal-header">
              <h2>{editFeed ? "✏️ Edit feed" : "🌾 Add feed schedule"}</h2>
              <button onClick={() => setShowFeedForm(false)}>✕</button>
            </div>
            <div className="sm-modal-body">
              <div className="sm-form-grid">
                <div className="sm-fg sm-fg-full">
                  <label>Feed name *</label>
                  <input
                    placeholder="e.g. Morning hay ration"
                    value={feedForm.name}
                    onChange={(e) =>
                      setFeedForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Feed type *</label>
                  <input
                    placeholder="e.g. Rhodes Hay, Lucerne, Maize bran"
                    value={feedForm.feedType}
                    onChange={(e) =>
                      setFeedForm((p) => ({ ...p, feedType: e.target.value }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Linked pen</label>
                  <select
                    value={feedForm.penId}
                    onChange={(e) =>
                      setFeedForm((p) => ({ ...p, penId: e.target.value }))
                    }
                  >
                    <option value="">— All pens / unlinked —</option>
                    {pens.map((pen) => (
                      <option key={pen.id} value={pen.id}>
                        {pen.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm-fg">
                  <label>Daily quantity</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={feedForm.quantity}
                    onChange={(e) =>
                      setFeedForm((p) => ({ ...p, quantity: e.target.value }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Unit</label>
                  <select
                    value={feedForm.unit}
                    onChange={(e) =>
                      setFeedForm((p) => ({ ...p, unit: e.target.value }))
                    }
                  >
                    {FEED_UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="sm-fg">
                  <label>Supplier</label>
                  <input
                    placeholder="e.g. Agrifoods Ltd"
                    value={feedForm.supplier}
                    onChange={(e) =>
                      setFeedForm((p) => ({ ...p, supplier: e.target.value }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Cost per unit (USD)</label>
                  <input
                    type="number"
                    placeholder="e.g. 12"
                    value={feedForm.costPerUnit}
                    onChange={(e) =>
                      setFeedForm((p) => ({
                        ...p,
                        costPerUnit: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Current stock (kg)</label>
                  <input
                    type="number"
                    placeholder="How much you have now"
                    value={feedForm.stockLevel}
                    onChange={(e) =>
                      setFeedForm((p) => ({ ...p, stockLevel: e.target.value }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Low-stock alert threshold (kg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={feedForm.minStockAlert}
                    onChange={(e) =>
                      setFeedForm((p) => ({
                        ...p,
                        minStockAlert: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="sm-fg">
                  <label>Last restocked</label>
                  <input
                    type="date"
                    value={feedForm.lastRestocked}
                    onChange={(e) =>
                      setFeedForm((p) => ({
                        ...p,
                        lastRestocked: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="sm-fg sm-fg-full">
                  <label>Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Mixing instructions, schedule changes…"
                    value={feedForm.notes}
                    onChange={(e) =>
                      setFeedForm((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="sm-modal-footer">
              <button
                className="sm-btn-cancel"
                onClick={() => setShowFeedForm(false)}
              >
                Cancel
              </button>
              <button
                className="sm-btn-save"
                onClick={saveFeed}
                disabled={saving || !feedForm.name || !feedForm.feedType}
              >
                {saving ? "Saving…" : editFeed ? "Save changes" : "Add feed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
