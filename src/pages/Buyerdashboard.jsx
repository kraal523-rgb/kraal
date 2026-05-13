import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import logo from "../assets/kraal-logo.svg";
import useAuthStore from "../store/useAuthStore";
import "./Buyerdashboard.css";
import UserMenu from "../components/UserMenu";
// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const INITIAL_ORDERS = [
  {
    id: "KRL-5501",
    seller: "Takudzwa M.",
    sellerInitials: "TM",
    listing: "10× Brahman Bulls",
    qty: 2,
    amount: 2400,
    status: "confirmed",
    date: "Today",
    location: "Marondera",
  },
  {
    id: "KRL-5488",
    seller: "Sithembile N.",
    sellerInitials: "SN",
    listing: "200× Road Runners",
    qty: 50,
    amount: 400,
    status: "pending",
    date: "Yesterday",
    location: "Bulawayo",
  },
  {
    id: "KRL-5471",
    seller: "Farai C.",
    sellerInitials: "FC",
    listing: "25× Boer Goats",
    qty: 10,
    amount: 1750,
    status: "completed",
    date: "3 days ago",
    location: "Mutare",
  },
  {
    id: "KRL-5460",
    seller: "Joseph M.",
    sellerInitials: "JM",
    listing: "15× Merino Ewes",
    qty: 5,
    amount: 1100,
    status: "completed",
    date: "1 week ago",
    location: "Gweru",
  },
  {
    id: "KRL-5449",
    seller: "Rudo T.",
    sellerInitials: "RT",
    listing: "8× Duroc Piglets",
    qty: 4,
    amount: 380,
    status: "cancelled",
    date: "2 weeks ago",
    location: "Chinhoyi",
  },
];

const MOCK_MESSAGES = [
  {
    id: 1,
    name: "Takudzwa M.",
    listing: "Brahman Bulls",
    preview: "The bulls are ready for collection.",
    time: "10:42 AM",
    unread: 2,
    messages: [
      {
        from: "them",
        text: "Hello, are you still interested in the bulls?",
        time: "10:30 AM",
      },
      { from: "me", text: "Yes! When can I come view them?", time: "10:35 AM" },
      {
        from: "them",
        text: "The bulls are ready for collection.",
        time: "10:42 AM",
      },
    ],
  },
  {
    id: 2,
    name: "Farai C.",
    listing: "Boer Goats",
    preview: "I can do USD 170 per head for bulk.",
    time: "Yesterday",
    unread: 0,
    messages: [
      {
        from: "me",
        text: "Hi, I saw your Boer Goat listing. Is the price negotiable?",
        time: "Yesterday",
      },
      {
        from: "them",
        text: "I can do USD 170 per head for bulk.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: 3,
    name: "Sithembile N.",
    listing: "Road Runners",
    preview: "They are 16 weeks old and healthy.",
    time: "2 days ago",
    unread: 0,
    messages: [
      {
        from: "me",
        text: "What age are the road runners?",
        time: "2 days ago",
      },
      {
        from: "them",
        text: "They are 16 weeks old and healthy.",
        time: "2 days ago",
      },
    ],
  },
];

const STATUS_META = {
  pending: { label: "Pending", cls: "bd-status-pending" },
  confirmed: { label: "Confirmed", cls: "bd-status-confirmed" },
  completed: { label: "Completed", cls: "bd-status-completed" },
  cancelled: { label: "Cancelled", cls: "bd-status-cancelled" },
};

const TABS = ["Overview", "Saved Listings", "My Orders", "Messages"];

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

export default function BuyerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Overview");
  const [savedListings, setSavedListings] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [orders] = useState(INITIAL_ORDERS);
  const [orderFilter, setOrderFilter] = useState("all");
  const [savedSearch, setSavedSearch] = useState("");
  const [activeThread, setActiveThread] = useState(MOCK_MESSAGES[0]);
  const [msgInput, setMsgInput] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  // ── Fetch saved listings from Firestore ──
  useEffect(() => {
    if (!user?.uid) return;

    // Assumes saved listing IDs are stored on the user doc under savedListings[]
    const fetchSaved = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const savedIds = userSnap.data()?.savedListings || [];

        if (savedIds.length === 0) {
          setSavedListings([]);
          setSavedLoading(false);
          return;
        }

        // Fetch each saved listing doc
        const results = await Promise.all(
          savedIds.map((id) => getDoc(doc(db, "listings", id))),
        );

        const data = results
          .filter((snap) => snap.exists())
          .map((snap) => ({
            id: snap.id,
            ...snap.data(),
            emoji: getCategoryEmoji(snap.data().categoryId),
          }));

        setSavedListings(data);
      } catch (err) {
        console.error("Failed to fetch saved listings:", err);
      } finally {
        setSavedLoading(false);
      }
    };

    fetchSaved();
  }, [user?.uid]);

  // ── Stats ──
  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    const pending = orders.filter((o) => o.status === "pending");
    const totalSpent = completed.reduce((sum, o) => sum + o.amount, 0);

    return [
      {
        label: "Total Spent",
        value: totalSpent > 0 ? `USD ${totalSpent.toLocaleString()}` : "USD 0",
        sub: `${completed.length} completed order${completed.length !== 1 ? "s" : ""}`,
        subType: totalSpent > 0 ? "up" : "neutral",
        icon: "💰",
      },
      {
        label: "Saved Listings",
        value: String(savedListings.length),
        sub: savedListings.length > 0 ? "Tap to view" : "None saved yet",
        subType: savedListings.length > 0 ? "up" : "neutral",
        icon: "❤️",
      },
      {
        label: "Pending Orders",
        value: String(pending.length),
        sub:
          pending.length > 0
            ? `${pending.length} awaiting confirmation`
            : "No pending orders",
        subType: pending.length > 0 ? "warn" : "neutral",
        icon: "📦",
      },
      {
        label: "Messages",
        value: String(messages.reduce((n, t) => n + t.unread, 0)),
        sub: "Unread conversations",
        subType: messages.some((t) => t.unread > 0) ? "warn" : "neutral",
        icon: "💬",
      },
    ];
  }, [savedListings, orders, messages]);

  // ── Filtered orders ──
  const filteredOrders = useMemo(
    () =>
      orderFilter === "all"
        ? orders
        : orders.filter((o) => o.status === orderFilter),
    [orders, orderFilter],
  );

  // ── Filtered saved listings ──
  const filteredSaved = useMemo(
    () =>
      savedSearch.trim()
        ? savedListings.filter((l) =>
            [l.title, l.breed, l.city, l.province]
              .join(" ")
              .toLowerCase()
              .includes(savedSearch.toLowerCase()),
          )
        : savedListings,
    [savedListings, savedSearch],
  );

  // ── Send message (local mock) ──
  const sendMessage = () => {
    if (!msgInput.trim()) return;
    const updated = messages.map((t) =>
      t.id === activeThread.id
        ? {
            ...t,
            messages: [
              ...t.messages,
              { from: "me", text: msgInput.trim(), time: "Just now" },
            ],
            preview: msgInput.trim(),
          }
        : t,
    );
    setMessages(updated);
    setActiveThread(updated.find((t) => t.id === activeThread.id));
    setMsgInput("");
  };

  const unsaveListing = (id) => {
    setSavedListings((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="bd">
      {/* ── TOP NAV ── */}
      <nav className="bd-nav">
        <button
          className="bd-nav-back"
          onClick={() => navigate("/marketplace")}
        >
          ← Back to Market
        </button>
        <div className="bd-nav-brand">
          <img src={logo} style={{ width: "140px" }} alt="Kraal" />
          <span className="bd-nav-sub">Buyer Dashboard</span>
        </div>
          <UserMenu />
      </nav>

      {/* ── PAGE HEADER ── */}
      <div className="bd-page-header">
        <div className="bd-page-header-inner">
          <div>
            <h1>
              Welcome back, {user?.displayName?.split(" ")[0] || "Buyer"} 👋
            </h1>
            <p>📍 {user?.email}</p>
          </div>
          <button
            className="bd-browse-btn"
            onClick={() => navigate("/marketplace")}
          >
            🐄 Browse Animals
          </button>
        </div>

        {/* Tabs */}
        <div className="bd-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`bd-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "Messages" && messages.some((t) => t.unread > 0) && (
                <span className="bd-msg-unread">
                  {messages.reduce((n, t) => n + t.unread, 0)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="bd-body">
        {/* ══ OVERVIEW ══ */}
        {activeTab === "Overview" && (
          <div className="bd-overview">
            {/* Stats */}
            <div className="bd-stats-grid">
              {stats.map((stat) => (
                <div key={stat.label} className="bd-stat-card">
                  <div className="bd-stat-icon">{stat.icon}</div>
                  <div className="bd-stat-info">
                    <span className="bd-stat-label">{stat.label}</span>
                    <span className="bd-stat-value">{stat.value}</span>
                    <span className={`bd-stat-sub bd-sub-${stat.subType}`}>
                      {stat.sub}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Saved listings preview */}
            <div className="bd-section">
              <div className="bd-section-header">
                <h2 className="bd-section-title">❤️ Saved Listings</h2>
                <button
                  className="bd-section-link"
                  onClick={() => setActiveTab("Saved Listings")}
                >
                  View all →
                </button>
              </div>
              <div className="bd-mini-listings">
                {savedLoading ? (
                  <div className="bd-empty">
                    <span className="bd-empty-emoji">⏳</span>
                    <p>Loading…</p>
                  </div>
                ) : savedListings.length === 0 ? (
                  <div className="bd-empty">
                    <span className="bd-empty-emoji">❤️</span>
                    <p>
                      No saved listings yet. Browse animals and tap 🤍 to save.
                    </p>
                    <button
                      className="bd-browse-btn"
                      onClick={() => navigate("/marketplace")}
                    >
                      Browse Animals
                    </button>
                  </div>
                ) : (
                  savedListings.slice(0, 3).map((l) => (
                    <div
                      key={l.id}
                      className="bd-mini-card"
                      onClick={() => navigate(`/listings/${l.id}`)}
                    >
                      <span className="bd-mini-emoji">{l.emoji}</span>
                      <div className="bd-mini-info">
                        <span className="bd-mini-title">{l.title}</span>
                        <span className="bd-mini-price">
                          {l.currency || "USD"} {l.price?.toLocaleString()}{" "}
                          {l.pricePerHead ? "per head" : "per lot"}
                        </span>
                      </div>
                      <div className="bd-mini-right">
                        <span className="bd-mini-location">
                          📍 {l.city || l.province || "Zimbabwe"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent orders preview */}
            <div className="bd-section">
              <div className="bd-section-header">
                <h2 className="bd-section-title">📦 Recent Orders</h2>
                <button
                  className="bd-section-link"
                  onClick={() => setActiveTab("My Orders")}
                >
                  View all →
                </button>
              </div>
              <div className="bd-order-table-wrap">
                <table className="bd-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Seller</th>
                      <th>Listing</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 4).map((order) => (
                      <tr key={order.id}>
                        <td className="bd-order-id">{order.id}</td>
                        <td>
                          <div className="bd-seller-cell">
                            <div className="bd-seller-avatar">
                              {order.sellerInitials}
                            </div>
                            <span>{order.seller}</span>
                          </div>
                        </td>
                        <td className="bd-order-listing">{order.listing}</td>
                        <td className="bd-order-amount">
                          ${order.amount.toLocaleString()}
                        </td>
                        <td>
                          <span
                            className={`bd-status-pill ${STATUS_META[order.status]?.cls}`}
                          >
                            {STATUS_META[order.status]?.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ SAVED LISTINGS ══ */}
        {activeTab === "Saved Listings" && (
          <div className="bd-saved-panel">
            <div className="bd-panel-toolbar">
              <input
                className="bd-search-input"
                type="text"
                placeholder="🔍 Search saved listings…"
                value={savedSearch}
                onChange={(e) => setSavedSearch(e.target.value)}
              />
              <button
                className="bd-browse-btn"
                onClick={() => navigate("/marketplace")}
              >
                + Find More Animals
              </button>
            </div>

            {savedLoading ? (
              <div className="bd-empty">
                <span className="bd-empty-emoji">⏳</span>
                <p>Loading your saved listings…</p>
              </div>
            ) : filteredSaved.length === 0 ? (
              <div className="bd-empty">
                <span className="bd-empty-emoji">🐾</span>
                <p>
                  {savedSearch
                    ? "No results match your search."
                    : "No saved listings yet."}
                </p>
                <button
                  className="bd-browse-btn"
                  onClick={() => navigate("/marketplace")}
                >
                  Browse Animals
                </button>
              </div>
            ) : (
              <div className="bd-saved-grid">
                {filteredSaved.map((l) => (
                  <div key={l.id} className="bd-saved-card">
                    <div className="bd-sc-media">
                      {l.photos?.[0]?.url ? (
                        <img
                          src={l.photos[0].url}
                          alt={l.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 46 }}>{l.emoji}</span>
                      )}
                      <span className="bd-sc-badge">
                        <span
                          className={`bd-status-pill ${l.vaccinated ? "bd-status-confirmed" : "bd-status-active"}`}
                        >
                          {l.vaccinated
                            ? "Vaccinated"
                            : l.condition || "Listed"}
                        </span>
                      </span>
                    </div>
                    <div className="bd-sc-body">
                      <h3 className="bd-sc-title">{l.title}</h3>
                      <div className="bd-sc-meta">
                        {l.breed && <span>🏷 {l.breed}</span>}
                        {l.age && <span>📅 {l.age}</span>}
                        {l.weight && <span>⚖️ {l.weight}</span>}
                      </div>
                      <div className="bd-sc-footer">
                        <div className="bd-sc-price">
                          <strong>
                            {l.currency || "USD"} {l.price?.toLocaleString()}
                          </strong>
                          <span>{l.pricePerHead ? "per head" : "per lot"}</span>
                        </div>
                        <span className="bd-sc-loc">
                          📍 {l.city || l.province || "Zimbabwe"}
                        </span>
                      </div>
                    </div>
                    <div className="bd-sc-actions">
                      <button
                        className="bd-action-btn bd-action-view"
                        onClick={() => navigate(`/listings/${l.id}`)}
                      >
                        View Listing
                      </button>
                      <button
                        className="bd-action-btn bd-action-unsave"
                        onClick={() => unsaveListing(l.id)}
                      >
                        🤍 Unsave
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ MY ORDERS ══ */}
        {activeTab === "My Orders" && (
          <div className="bd-orders-panel">
            <div className="bd-order-filters">
              {["all", "pending", "confirmed", "completed", "cancelled"].map(
                (f) => (
                  <button
                    key={f}
                    className={`bd-order-filter-btn ${orderFilter === f ? "active" : ""}`}
                    onClick={() => setOrderFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    <span className="bd-ofilter-count">
                      {f === "all"
                        ? orders.length
                        : orders.filter((o) => o.status === f).length}
                    </span>
                  </button>
                ),
              )}
            </div>

            <div className="bd-order-table-wrap">
              <table className="bd-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Seller</th>
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
                      <td className="bd-order-id">{order.id}</td>
                      <td>
                        <div className="bd-seller-cell">
                          <div className="bd-seller-avatar">
                            {order.sellerInitials}
                          </div>
                          <div>
                            <div>{order.seller}</div>
                            <div className="bd-order-loc">
                              📍 {order.location}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="bd-order-listing">{order.listing}</td>
                      <td>{order.qty}</td>
                      <td className="bd-order-amount">
                        ${order.amount.toLocaleString()}
                      </td>
                      <td className="bd-order-date">{order.date}</td>
                      <td>
                        <span
                          className={`bd-status-pill ${STATUS_META[order.status]?.cls}`}
                        >
                          {STATUS_META[order.status]?.label}
                        </span>
                      </td>
                      <td>
                        {order.status === "pending" && (
                          <a
                            href={`https://wa.me/?text=Hi ${order.seller}, I'm following up on order ${order.id} for ${order.listing}.`}
                            target="_blank"
                            rel="noreferrer"
                            className="bd-wa-btn"
                          >
                            <WhatsAppIcon /> Follow Up
                          </a>
                        )}
                        {order.status === "confirmed" && (
                          <span className="bd-order-action-text">
                            Awaiting delivery
                          </span>
                        )}
                        {(order.status === "completed" ||
                          order.status === "cancelled") && (
                          <span className="bd-order-action-text">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <div className="bd-empty">
                  <span className="bd-empty-emoji">📦</span>
                  <p>No {orderFilter} orders found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ MESSAGES ══ */}
        {activeTab === "Messages" && (
          <div className="bd-messages-panel">
            {/* Thread list */}
            <div className="bd-msg-list">
              <div className="bd-msg-list-header">Conversations</div>
              {messages.map((thread) => (
                <div
                  key={thread.id}
                  className={`bd-msg-thread ${activeThread?.id === thread.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveThread(thread);
                    // Mark as read
                    setMessages((prev) =>
                      prev.map((t) =>
                        t.id === thread.id ? { ...t, unread: 0 } : t,
                      ),
                    );
                  }}
                >
                  <div className="bd-msg-thread-name">
                    {thread.name}
                    {thread.unread > 0 && (
                      <span className="bd-msg-unread">{thread.unread}</span>
                    )}
                  </div>
                  <div className="bd-msg-thread-preview">{thread.preview}</div>
                  <div className="bd-msg-thread-time">{thread.time}</div>
                </div>
              ))}
            </div>

            {/* Message window */}
            {activeThread ? (
              <div className="bd-msg-window">
                <div className="bd-msg-window-header">
                  <div
                    className="bd-seller-avatar"
                    style={{ width: 36, height: 36 }}
                  >
                    {activeThread.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div className="bd-msg-window-name">
                      {activeThread.name}
                    </div>
                    <div className="bd-msg-window-sub">
                      Re: {activeThread.listing}
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/?text=Hi ${activeThread.name}, regarding your ${activeThread.listing} listing on Kraal.`}
                    target="_blank"
                    rel="noreferrer"
                    className="bd-wa-btn"
                    style={{ marginLeft: "auto" }}
                  >
                    <WhatsAppIcon /> WhatsApp
                  </a>
                </div>

                <div className="bd-msg-body">
                  {activeThread.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`bd-msg-bubble ${msg.from === "me" ? "sent" : "recv"}`}
                    >
                      {msg.text}
                      <div className="bd-msg-time">{msg.time}</div>
                    </div>
                  ))}
                </div>

                <div className="bd-msg-input-row">
                  <textarea
                    className="bd-msg-input"
                    rows={1}
                    placeholder="Type a message…"
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button className="bd-msg-send-btn" onClick={sendMessage}>
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="bd-msg-window">
                <div className="bd-msg-empty">
                  Select a conversation to start messaging.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
