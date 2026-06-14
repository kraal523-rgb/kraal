import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import logo from "../assets/kraal-logo.svg";
import useAuthStore from "../store/useAuthStore";
import "./SellerDashboard.css";
import UserMenu from "../components/UserMenu";
import RequestTransportButton from "../components/RequestTransportButton";
import StockManager from "./StockManager";
import DocumentsPanel from "./DocumentsPanel";
import "./StockManager.css";
import { useVetRequest } from "../hooks/useVetRequest.jsx";
// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const INITIAL_ORDERS = [
  {
    id: "KRL-4421",
    buyer: "Farai C.",
    buyerInitials: "FC",
    listing: "10× Brahman Bulls",
    qty: 2,
    amount: 2400,
    status: "pending",
    date: "Today",
    location: "Gweru",
  },
  {
    id: "KRL-4418",
    buyer: "Rudo T.",
    buyerInitials: "RT",
    listing: "200× Road Runners",
    qty: 50,
    amount: 400,
    status: "confirmed",
    date: "Yesterday",
    location: "Masvingo",
  },
  {
    id: "KRL-4411",
    buyer: "Chipo M.",
    buyerInitials: "CM",
    listing: "30× Dorper Lambs",
    qty: 10,
    amount: 1200,
    status: "completed",
    date: "3 days ago",
    location: "Mutare",
  },
  {
    id: "KRL-4399",
    buyer: "Admire K.",
    buyerInitials: "AK",
    listing: "25× Boer Goats",
    qty: 25,
    amount: 4375,
    status: "completed",
    date: "5 days ago",
    location: "Beitbridge",
  },
  {
    id: "KRL-4388",
    buyer: "Joseph M.",
    buyerInitials: "JM",
    listing: "8× Duroc Piglets",
    qty: 4,
    amount: 380,
    status: "cancelled",
    date: "1 week ago",
    location: "Chinhoyi",
  },
];

const STATUS_META = {
  active: { label: "Active", cls: "sd-pill-active" },
  low_stock: { label: "Low Stock", cls: "sd-pill-low" },
  sold_out: { label: "Sold Out", cls: "sd-pill-sold" },
  pending: { label: "Pending", cls: "sd-pill-pending" },
  confirmed: { label: "Confirmed", cls: "sd-pill-confirmed" },
  completed: { label: "Completed", cls: "sd-pill-completed" },
  cancelled: { label: "Cancelled", cls: "sd-pill-cancelled" },
};

const TABS = [
  { id: "Overview", icon: "◈", label: "Overview" },
  { id: "My Listings", icon: "📋", label: "My Listings" },
  { id: "Orders", icon: "📦", label: "Orders" },
  { id: "Stock", icon: "🐾", label: "Stock" },
  { id: "Documents", icon: "🗂", label: "Documents" },
];

function getCategoryEmoji(categoryId) {
  const map = {
    cattle: "🐄",
    goats: "🐐",
    sheep: "🐑",
    chicken: "🐓",
    guinea: "🦤",
    ducks: "🦆",
    rabbits: "🐇",
    turkey: "🦃",
    pigs: "🐖",
    horses: "🐴",
    donkeys: "🫏",
    other: "🐾",
  };
  return map[categoryId] || "🐾";
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function SellerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const WORKER_URL =
    import.meta.env.VITE_UPLOAD_WORKER_URL ||
    "https://kraal-upload.kraal523.workers.dev";
    const [userProfile, setUserProfile] = useState(null);
const { openVetRequest, vetRequestModal } = useVetRequest(user, userProfile)
  const [activeTab, setActiveTab] = useState("Overview");
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [orders] = useState(INITIAL_ORDERS);
  const [orderFilter, setOrderFilter] = useState("all");
  const [listingSearch, setListingSearch] = useState("");
  const [editListing, setEditListing] = useState(null);

  const [aiAssist, setAiAssist] = useState(null);
  const [aiAssistLoading, setAiAssistLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiOrders, setAiOrders] = useState(null);
  const [aiOrdersLoading, setAiOrdersLoading] = useState(false);

  // ── Firestore: real listings ──────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "listings"),
      where("sellerId", "==", user.uid),
    );
    return onSnapshot(q, (snapshot) => {
      setListings(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          emoji: getCategoryEmoji(d.data().categoryId),
          unit: d.data().pricePerHead ? "per head" : "per lot",
          qty: d.data().quantity,
          status: d.data().status || "active",
          views: d.data().views || 0,
          badge: d.data().vaccinated ? "Vaccinated" : d.data().condition,
          age: d.data().age || "",
          weight: d.data().weight || "",
        })),
      );
      setListingsLoading(false);
    });
  }, [user?.uid]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const activeListings = listings.filter((l) => l.status === "active");
    const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0);
    const totalRevenue = listings
      .filter((l) => l.status === "sold_out" || l.status === "completed")
      .reduce((s, l) => s + (l.price || 0) * (l.quantity || 1), 0);
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    return [
      {
        label: "Total Revenue",
        value: `USD ${totalRevenue.toLocaleString()}`,
        sub: "From completed sales",
        type: totalRevenue > 0 ? "up" : "neutral",
        icon: "💰",
        iconBg: "#eaf5ef",
      },
      {
        label: "Active Listings",
        value: String(activeListings.length),
        sub: listings.length > 0 ? `${listings.length} total` : "None yet",
        type: activeListings.length > 0 ? "up" : "neutral",
        icon: "📋",
        iconBg: "#e8f1fb",
      },
      {
        label: "Pending Orders",
        value: String(pendingOrders),
        sub: pendingOrders > 0 ? `${pendingOrders} need action` : "All clear",
        type: pendingOrders > 0 ? "warn" : "neutral",
        icon: "📦",
        iconBg: "#fef3c7",
      },
      {
        label: "Total Views",
        value: totalViews.toLocaleString(),
        sub:
          listings.length > 0
            ? `Across ${listings.length} listings`
            : "Post a listing",
        type: totalViews > 0 ? "up" : "neutral",
        icon: "👁",
        iconBg: "#f3e8ff",
      },
    ];
  }, [listings, orders]);

  const filteredOrders = useMemo(
    () =>
      orderFilter === "all"
        ? orders
        : orders.filter((o) => o.status === orderFilter),
    [orders, orderFilter],
  );
useEffect(() => {
  if (!user?.uid) return;
  getDoc(doc(db, "users", user.uid)).then((snap) => {
    if (snap.exists()) setUserProfile(snap.data());
  });
}, [user?.uid]);
  const filteredListings = useMemo(
    () =>
      listingSearch.trim()
        ? listings.filter((l) =>
            l.title.toLowerCase().includes(listingSearch.toLowerCase()),
          )
        : listings,
    [listings, listingSearch],
  );

  // ── Listing actions ───────────────────────────────────────────────────────
  const toggleListingStatus = async (id) => {
    const listing = listings.find((l) => l.id === id);
    await updateDoc(doc(db, "listings", id), {
      status: listing.status === "active" ? "pending" : "active",
    });
  };

  const removeListing = async (id) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    await deleteDoc(doc(db, "listings", id));
  };

  // ── Auth token helper ─────────────────────────────────────────────────────
  async function getIdToken() {
    const { getAuth } = await import("firebase/auth");
    return getAuth().currentUser?.getIdToken();
  }

  // ── AI helpers ────────────────────────────────────────────────────────────
  async function runAIAssist() {
    if (!editListing) return;
    setAiAssistLoading(true);
    setAiAssist(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`${WORKER_URL}/api/ai/listing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editListing.title,
          category: editListing.categoryId || "livestock",
          quantity: editListing.qty,
          weight: editListing.weight,
          age: editListing.age,
          price: editListing.price,
          location: user?.location || "Zimbabwe",
        }),
      });
      if (!res.ok) throw new Error();
      setAiAssist(await res.json());
    } catch {
      setAiAssist({ error: "Could not load AI suggestions. Try again." });
    } finally {
      setAiAssistLoading(false);
    }
  }

  async function loadAIInsights() {
    if (aiInsight || aiInsightLoading) return;
    setAiInsightLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`${WORKER_URL}/api/ai/insights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listings, orders }),
      });
      if (!res.ok) throw new Error();
      setAiInsight(await res.json());
    } catch {
      setAiInsight({ error: "Could not load insights." });
    } finally {
      setAiInsightLoading(false);
    }
  }

  async function loadAIOrders() {
    if (aiOrders || aiOrdersLoading) return;
    setAiOrdersLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`${WORKER_URL}/api/ai/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orders }),
      });
      if (!res.ok) throw new Error();
      setAiOrders(await res.json());
    } catch {
      setAiOrders({ error: "Could not summarise orders." });
    } finally {
      setAiOrdersLoading(false);
    }
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="sd">
      {/* ── TOPBAR ── */}
      <header className="sd-topbar">
        <div className="sd-topbar-logo">
          <div className="sd-topbar-logo-icon">K</div>
          <div>
            <div className="sd-topbar-logo-text">Kraal</div>
            <div className="sd-topbar-logo-sub">Seller Hub</div>
          </div>
        </div>

        <div className="sd-topbar-left">
          <span className="sd-topbar-title">
            Welcome, {user?.displayName?.split(" ")[0] || "Seller"} 👋
          </span>
        </div>

        <div className="sd-topbar-right">
          <button
            className="sd-topbar-btn sd-topbar-btn-ghost"
            onClick={() => navigate("/marketplace")}
          >
            🏪 Marketplace
          </button>
          <button
            className="sd-topbar-btn sd-topbar-btn-primary"
            onClick={() => navigate("/sell")}
          >
            + New Listing
          </button>
           <button onClick={() => openVetRequest()}>🩺 Request Vet Certificate</button>
          {pendingCount > 0 && (
            <button
              className="sd-topbar-icon-btn"
              onClick={() => setActiveTab("Orders")}
              title={`${pendingCount} pending orders`}
            >
              📦
              <span className="sd-topbar-notif">{pendingCount}</span>
            </button>
          )}
          <UserMenu />
        </div>
      </header>

      {/* ── SHELL ── */}
      <div className="sd-shell">
        {/* ── SIDEBAR ── */}
        <aside className="sd-sidebar">
          <div className="sd-sidebar-section">Main</div>
          {TABS.map((t) => {
            const badge = t.id === "Orders" ? pendingCount : 0;
            return (
              <button
                key={t.id}
                className={`sd-sidebar-item ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <i>{t.icon}</i>
                {t.label}
                {badge > 0 && (
                  <span className="sd-sidebar-badge sd-sidebar-badge-warn">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="sd-sidebar-divider" />
          <div className="sd-sidebar-section">Quick Actions</div>
          <button className="sd-sidebar-item" onClick={() => navigate("/sell")}>
            <i>➕</i> Post Listing
          </button>
          <button
            className="sd-sidebar-item"
            onClick={() => navigate("/marketplace")}
          >
            <i>🏪</i> Marketplace
          </button>

          <div className="sd-sidebar-bottom">
            <button
              className="sd-sidebar-item"
              onClick={() => navigate("/marketplace")}
            >
              <i>←</i> Back to Market
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="sd-main">
          {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
          {activeTab === "Overview" && (
            <>
              <div className="sd-page-bar">
                <div>
                  <div className="sd-page-bar-title">Overview</div>
                  <div className="sd-page-bar-sub">
                    Your sales dashboard at a glance
                  </div>
                </div>
                <div className="sd-page-bar-actions">
                  {!aiInsight && !aiInsightLoading && (
                    <button
                      className="sd-topbar-btn sd-topbar-btn-ghost"
                      onClick={loadAIInsights}
                    >
                      ✨ AI Insights
                    </button>
                  )}
                  {aiInsightLoading && (
                    <span className="sd-ai-loading-inline">✨ Analysing…</span>
                  )}
                </div>
              </div>
              <div className="sd-content">
                {/* KPI row */}
                <div className="sd-kpi-row">
                  {kpis.map((k) => (
                    <div key={k.label} className="sd-kpi">
                      <div
                        className="sd-kpi-icon"
                        style={{ background: k.iconBg }}
                      >
                        {k.icon}
                      </div>
                      <div>
                        <div className="sd-kpi-val">{k.value}</div>
                        <div className="sd-kpi-lbl">{k.label}</div>
                        <div className={`sd-kpi-delta sd-kpi-delta-${k.type}`}>
                          {k.sub}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Insight banner */}
                {aiInsight && (
                  <div
                    className={`sd-insight-banner ${aiInsight.error ? "sd-insight-error" : ""}`}
                  >
                    <div className="sd-insight-icon">✨</div>
                    <div style={{ flex: 1 }}>
                      {aiInsight.error ? (
                        <div
                          className="sd-insight-text"
                          style={{ color: "var(--z-red)" }}
                        >
                          {aiInsight.error}
                        </div>
                      ) : (
                        <>
                          <div className="sd-insight-title">
                            AI Business Insight
                            <span className="sd-insight-ai-tag">
                              Score: {aiInsight.score}/10
                            </span>
                          </div>
                          <div className="sd-insight-text">
                            <strong>{aiInsight.headline}</strong> —{" "}
                            {aiInsight.insight}
                          </div>
                          {aiInsight.action && (
                            <div className="sd-insight-chips">
                              <span className="sd-insight-chip">
                                👉 {aiInsight.action}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Two-col: active listings + recent orders */}
                <div className="sd-two-col">
                  {/* Active listings */}
                  <div className="sd-card">
                    <div className="sd-card-head">
                      <span className="sd-card-head-title">
                        <i>📋</i> Active Listings
                      </span>
                      <button
                        className="sd-link"
                        onClick={() => setActiveTab("My Listings")}
                      >
                        View all →
                      </button>
                    </div>
                    {listingsLoading ? (
                      <Spinner />
                    ) : listings.filter((l) => l.status === "active").length ===
                      0 ? (
                      <EmptyState
                        emoji="📋"
                        text="No active listings yet."
                        cta="+ Post First Listing"
                        onCta={() => navigate("/sell")}
                      />
                    ) : (
                      <table className="sd-table">
                        <tbody>
                          {listings
                            .filter((l) => l.status === "active")
                            .slice(0, 5)
                            .map((l) => (
                              <tr key={l.id}>
                                <td style={{ width: 28 }}>{l.emoji}</td>
                                <td>
                                  <div className="sd-table-title">
                                    {l.title}
                                  </div>
                                  <div className="sd-table-sub">
                                    {l.currency || "USD"}{" "}
                                    {l.price?.toLocaleString()} {l.unit}
                                  </div>
                                </td>
                                <td
                                  style={{
                                    textAlign: "right",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <span className="sd-table-sub">
                                    👁 {l.views || 0}
                                  </span>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <span
                                    className={`sd-pill ${STATUS_META[l.status]?.cls}`}
                                  >
                                    {STATUS_META[l.status]?.label}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Recent orders */}
                  <div className="sd-card">
                    <div className="sd-card-head">
                      <span className="sd-card-head-title">
                        <i>📦</i> Recent Orders
                      </span>
                      <button
                        className="sd-link"
                        onClick={() => setActiveTab("Orders")}
                      >
                        View all →
                      </button>
                    </div>
                    <table className="sd-table">
                      <tbody>
                        {orders.slice(0, 5).map((o) => (
                          <tr key={o.id}>
                            <td>
                              <div className="sd-table-title">{o.listing}</div>
                              <div className="sd-table-sub">
                                {o.buyer} · {o.date}
                              </div>
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span
                                className="sd-amount"
                                style={{ marginRight: 8 }}
                              >
                                ${o.amount.toLocaleString()}
                              </span>
                              <span
                                className={`sd-pill ${STATUS_META[o.status]?.cls}`}
                              >
                                {STATUS_META[o.status]?.label}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══ MY LISTINGS ═════════════════════════════════════════════════ */}
          {activeTab === "My Listings" && (
            <>
              <div className="sd-page-bar">
                <div>
                  <div className="sd-page-bar-title">📋 My Listings</div>
                  <div className="sd-page-bar-sub">
                    {listings.length} listing{listings.length !== 1 ? "s" : ""}{" "}
                    total
                  </div>
                </div>
                <div className="sd-page-bar-actions">
                  <button
                    className="sd-topbar-btn sd-topbar-btn-primary"
                    onClick={() => navigate("/sell")}
                  >
                    + New Listing
                  </button>
                </div>
              </div>
              <div className="sd-content">
                <div className="sd-card">
                  <div className="sd-toolbar">
                    <input
                      className="sd-search-input"
                      type="text"
                      placeholder="🔍 Search your listings…"
                      value={listingSearch}
                      onChange={(e) => setListingSearch(e.target.value)}
                    />
                  </div>

                  {listingsLoading ? (
                    <Spinner />
                  ) : filteredListings.length === 0 ? (
                    <EmptyState
                      emoji="🐾"
                      text="No listings found. Post your first animal to get started."
                      cta="+ Post First Listing"
                      onCta={() => navigate("/sell")}
                    />
                  ) : (
                    <div className="sd-listings-grid" style={{ padding: 14 }}>
                      {filteredListings.map((listing) => (
                        <div key={listing.id} className="sd-listing-card">
                          <div className="sd-lc-thumb">
                            {listing.photos?.[0]?.url ? (
                              <img
                                src={listing.photos[0].url}
                                alt={listing.title}
                              />
                            ) : (
                              <span className="sd-lc-emoji">
                                {listing.emoji}
                              </span>
                            )}
                            <span
                              className={`sd-pill sd-lc-badge ${STATUS_META[listing.status]?.cls || STATUS_META.active.cls}`}
                            >
                              {STATUS_META[listing.status]?.label || "Active"}
                            </span>
                          </div>
                          <div className="sd-lc-info">
                            <h3 className="sd-lc-title">{listing.title}</h3>
                            <div className="sd-lc-tags">
                              {listing.badge && <span>🏷 {listing.badge}</span>}
                              {listing.weight && (
                                <span>⚖️ {listing.weight}</span>
                              )}
                              {listing.age && <span>📅 {listing.age}</span>}
                            </div>
                            <div className="sd-lc-footer">
                              <div>
                                <strong className="sd-lc-price">
                                  {listing.currency || "USD"}{" "}
                                  {listing.price?.toLocaleString()}
                                </strong>
                                <span className="sd-lc-unit">
                                  {" "}
                                  {listing.unit}
                                </span>
                              </div>
                              <span className="sd-lc-stats">
                                👁 {listing.views || 0} · 📦 {listing.qty}
                              </span>
                            </div>
                          </div>
                          <div className="sd-lc-actions">
                            <button
                              className="sd-btn-sm sd-btn-sm-primary"
                              onClick={() => setEditListing(listing)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="sd-btn-sm sd-btn-sm-amber"
                              onClick={() => toggleListingStatus(listing.id)}
                            >
                              {listing.status === "active"
                                ? "⏸ Pause"
                                : "▶ Activate"}
                            </button>
                            <button
                              className="sd-btn-sm sd-btn-sm-danger"
                              onClick={() => removeListing(listing.id)}
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══ ORDERS ══════════════════════════════════════════════════════ */}
          {activeTab === "Orders" && (
            <>
              <div className="sd-page-bar">
                <div>
                  <div className="sd-page-bar-title">📦 Orders</div>
                  <div className="sd-page-bar-sub">
                    {orders.length} order{orders.length !== 1 ? "s" : ""} total
                  </div>
                </div>
                <div className="sd-page-bar-actions">
                  {!aiOrders && !aiOrdersLoading && (
                    <button
                      className="sd-topbar-btn sd-topbar-btn-ghost"
                      onClick={loadAIOrders}
                    >
                      🤖 AI Summary
                    </button>
                  )}
                  {aiOrdersLoading && (
                    <span className="sd-ai-loading-inline">🤖 Analysing…</span>
                  )}
                </div>
              </div>
              <div className="sd-content">
                {/* AI Orders banner */}
                {aiOrders && (
                  <div
                    className={`sd-insight-banner ${aiOrders.error ? "sd-insight-error" : ""}`}
                  >
                    <div className="sd-insight-icon">🤖</div>
                    <div style={{ flex: 1 }}>
                      {aiOrders.error ? (
                        <div
                          className="sd-insight-text"
                          style={{ color: "var(--z-red)" }}
                        >
                          {aiOrders.error}
                        </div>
                      ) : (
                        <>
                          <div className="sd-insight-title">
                            AI Order Summary{" "}
                            <span className="sd-insight-ai-tag">AI</span>
                          </div>
                          <div className="sd-insight-text">
                            {aiOrders.summary}
                          </div>
                          <div className="sd-insight-chips">
                            {aiOrders.urgentActions?.map((a, i) => (
                              <span key={i} className="sd-insight-chip">
                                ⚡ {a}
                              </span>
                            ))}
                            {aiOrders.bestBuyerLocation && (
                              <span className="sd-insight-chip">
                                📍 Top region:{" "}
                                <strong>{aiOrders.bestBuyerLocation}</strong>
                              </span>
                            )}
                            {aiOrders.totalPotentialRevenue != null && (
                              <span className="sd-insight-chip">
                                💵 Potential:{" "}
                                <strong>
                                  USD{" "}
                                  {aiOrders.totalPotentialRevenue.toLocaleString()}
                                </strong>
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="sd-card">
                  <div className="sd-filter-tabs">
                    {[
                      "all",
                      "pending",
                      "confirmed",
                      "completed",
                      "cancelled",
                    ].map((f) => (
                      <button
                        key={f}
                        className={`sd-filter-tab ${orderFilter === f ? "active" : ""}`}
                        onClick={() => setOrderFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        <span className="sd-filter-count">
                          {f === "all"
                            ? orders.length
                            : orders.filter((o) => o.status === f).length}
                        </span>
                      </button>
                    ))}
                  </div>

                  {filteredOrders.length === 0 ? (
                    <EmptyState
                      emoji="📦"
                      text={`No ${orderFilter} orders found.`}
                    />
                  ) : (
                    <table className="sd-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Buyer</th>
                          <th>Listing</th>
                          <th>Qty</th>
                          <th>Amount</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order.id}>
                            <td>
                              <span className="sd-order-id">{order.id}</span>
                            </td>
                            <td>
                              <div className="sd-buyer-cell">
                                <div className="sd-buyer-avatar">
                                  {order.buyerInitials}
                                </div>
                                <div>
                                  <div className="sd-table-title">
                                    {order.buyer}
                                  </div>
                                  <div className="sd-table-sub">
                                    📍 {order.location}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="sd-table-title">{order.listing}</td>
                            <td>{order.qty}</td>
                            <td>
                              <span className="sd-amount">
                                ${order.amount.toLocaleString()}
                              </span>
                            </td>
                            <td>
                              <span className="sd-table-sub">{order.date}</span>
                            </td>
                            <td>
                              <span
                                className={`sd-pill ${STATUS_META[order.status]?.cls}`}
                              >
                                {STATUS_META[order.status]?.label}
                              </span>
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {order.status === "pending" && (
                                <a
                                  href={`https://wa.me/?text=Hi ${order.buyer}, your order ${order.id} for ${order.listing} has been confirmed!`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="sd-wa-btn"
                                >
                                  <WhatsAppIcon /> Confirm
                                </a>
                              )}
                              {order.status === "confirmed" && (
                                <>
                                  <span
                                    className="sd-table-sub"
                                    style={{ marginRight: 6 }}
                                  >
                                    Awaiting delivery
                                  </span>
                                  <RequestTransportButton order={order} />
                                </>
                              )}
                              {(order.status === "completed" ||
                                order.status === "cancelled") && (
                                <span className="sd-table-sub">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══ STOCK ════════════════════════════════════════════════════════ */}
          {activeTab === "Stock" && (
            <>
              <div className="sd-page-bar">
                <div>
                  <div className="sd-page-bar-title">🐾 Stock Manager</div>
                  <div className="sd-page-bar-sub">
                    Track and manage your livestock inventory
                  </div>
                </div>
              </div>
              <div className="sd-content">
                <div className="sd-card" style={{ overflow: "visible" }}>
                  <StockManager />
                </div>
              </div>
            </>
          )}

          {/* ══ DOCUMENTS ════════════════════════════════════════════════════ */}
          {activeTab === "Documents" && (
            <>
              <div className="sd-page-bar">
                <div>
                  <div className="sd-page-bar-title">🗂 Documents</div>
                  <div className="sd-page-bar-sub">
                    Certificates, permits, and compliance records
                  </div>
                </div>
              </div>
              <div className="sd-content">
                <div className="sd-card" style={{ overflow: "visible" }}>
                  <DocumentsPanel />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
 {vetRequestModal}
      {/* ══ EDIT LISTING MODAL ═════════════════════════════════════════════ */}
      {editListing && (
        <div className="sd-modal-overlay" onClick={() => setEditListing(null)}>
          <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-head">
              <div>
                <h2>✏️ Edit Listing</h2>
                <p>
                  Update details for <strong>{editListing.title}</strong>
                </p>
              </div>
              <button
                className="sd-modal-close"
                onClick={() => setEditListing(null)}
              >
                ✕
              </button>
            </div>

            <div className="sd-modal-body">
              {/* AI Assist strip */}
              <div className="sd-ai-assist-strip">
                <button
                  className="sd-topbar-btn sd-topbar-btn-ghost"
                  onClick={runAIAssist}
                  disabled={aiAssistLoading}
                >
                  {aiAssistLoading
                    ? "✨ Generating…"
                    : "✨ AI Assist — description & price advice"}
                </button>
              </div>

              {aiAssist && !aiAssist.error && (
                <div className="sd-ai-assist-result">
                  <div className="sd-ai-result-row">
                    <label>Suggested description</label>
                    <p className="sd-ai-desc-text">{aiAssist.description}</p>
                    <button
                      className="sd-btn-sm sd-btn-sm-primary"
                      onClick={() =>
                        navigator.clipboard.writeText(aiAssist.description)
                      }
                    >
                      Copy
                    </button>
                  </div>
                  {aiAssist.priceAdvice && (
                    <div className="sd-ai-result-row">
                      <label>Price advice</label>
                      <p>{aiAssist.priceAdvice}</p>
                      {aiAssist.suggestedPrice && (
                        <button
                          className="sd-btn-sm sd-btn-sm-amber"
                          onClick={() =>
                            setEditListing((prev) => ({
                              ...prev,
                              price: aiAssist.suggestedPrice,
                            }))
                          }
                        >
                          Apply: USD {aiAssist.suggestedPrice}
                        </button>
                      )}
                    </div>
                  )}
                  {aiAssist.strengths?.length > 0 && (
                    <div className="sd-ai-result-row">
                      <label>Selling strengths</label>
                      <div className="sd-ai-tags">
                        {aiAssist.strengths.map((s, i) => (
                          <span key={i} className="sd-pill sd-pill-completed">
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiAssist.tips?.length > 0 && (
                    <div className="sd-ai-result-row">
                      <label>Quick tip</label>
                      <p className="sd-ai-tip">💡 {aiAssist.tips[0]}</p>
                    </div>
                  )}
                </div>
              )}
              {aiAssist?.error && (
                <p className="sd-ai-error">{aiAssist.error}</p>
              )}

              {/* Form fields */}
              <div className="sd-form-grid">
                <div className="sd-form-group sd-form-full">
                  <label>Listing Title</label>
                  <input
                    type="text"
                    value={editListing.title}
                    onChange={(e) =>
                      setEditListing((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div className="sd-form-group">
                  <label>Price (USD)</label>
                  <input
                    type="number"
                    value={editListing.price}
                    onChange={(e) =>
                      setEditListing((p) => ({ ...p, price: e.target.value }))
                    }
                  />
                </div>
                <div className="sd-form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={editListing.qty}
                    onChange={(e) =>
                      setEditListing((p) => ({ ...p, qty: e.target.value }))
                    }
                  />
                </div>
                <div className="sd-form-group">
                  <label>Age</label>
                  <input
                    type="text"
                    value={editListing.age}
                    onChange={(e) =>
                      setEditListing((p) => ({ ...p, age: e.target.value }))
                    }
                  />
                </div>
                <div className="sd-form-group">
                  <label>Weight</label>
                  <input
                    type="text"
                    value={editListing.weight}
                    onChange={(e) =>
                      setEditListing((p) => ({ ...p, weight: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="sd-modal-foot">
              <button
                className="sd-btn-cancel"
                onClick={() => setEditListing(null)}
              >
                Cancel
              </button>
              <button
                className="sd-btn-submit"
                onClick={async () => {
                  await updateDoc(doc(db, "listings", editListing.id), {
                    title: editListing.title,
                    price: Number(editListing.price),
                    quantity: Number(editListing.qty),
                    age: editListing.age,
                    weight: editListing.weight,
                  });
                  setEditListing(null);
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="sd-bottom-nav">
        <div className="sd-bottom-nav-inner">
          <button
            className={`sd-bottom-nav-item ${activeTab === "Overview" ? "active" : ""}`}
            onClick={() => setActiveTab("Overview")}
          >
            <i>◈</i>
            <span>Overview</span>
          </button>
          <button
            className={`sd-bottom-nav-item ${activeTab === "My Listings" ? "active" : ""}`}
            onClick={() => setActiveTab("My Listings")}
          >
            <i>📋</i>
            <span>Listings</span>
          </button>
          <button
            className="sd-bottom-nav-post"
            onClick={() => navigate("/sell")}
          >
            +
          </button>
          <button
            className={`sd-bottom-nav-item ${activeTab === "Orders" ? "active" : ""}`}
            onClick={() => setActiveTab("Orders")}
          >
            <i>📦</i>
            <span>Orders</span>
          </button>
          <button
            className={`sd-bottom-nav-item ${activeTab === "Stock" ? "active" : ""}`}
            onClick={() => setActiveTab("Stock")}
          >
            <i>🐾</i>
            <span>Stock</span>
          </button>
          <button
            className={`sd-bottom-nav-item ${activeTab === "Documents" ? "active" : ""}`}
            onClick={() => setActiveTab("Documents")}
          >
            <i>🗂</i>
            <span>Docs</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="sd-spinner-wrap">
      <div className="sd-spinner" />
    </div>
  );
}

function EmptyState({ emoji, text, cta, onCta }) {
  return (
    <div className="sd-empty">
      <span className="sd-empty-emoji">{emoji}</span>
      <p>{text}</p>
      {cta && (
        <button
          className="sd-topbar-btn sd-topbar-btn-primary"
          onClick={onCta}
          style={{ marginTop: 8 }}
        >
          {cta}
        </button>
      )}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
