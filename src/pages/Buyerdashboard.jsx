import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import logo from "../assets/kraal-logo.svg";
import useAuthStore from "../store/useAuthStore";
import "./Buyerdashboard.css";
import UserMenu from "../components/UserMenu";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PROVINCES = [
  "Harare",
  "Bulawayo",
  "Manicaland",
  "Mashonaland Central",
  "Mashonaland East",
  "Mashonaland West",
  "Masvingo",
  "Matabeleland North",
  "Matabeleland South",
  "Midlands",
];

const STATUS_META = {
  pending: { label: "Pending", cls: "bd-pill-pending", icon: "⏳" },
  confirmed: { label: "Confirmed", cls: "bd-pill-confirmed", icon: "✅" },
  completed: { label: "Completed", cls: "bd-pill-completed", icon: "🎉" },
  cancelled: { label: "Cancelled", cls: "bd-pill-cancelled", icon: "✕" },
};

const TABS = [
  { id: "Overview", icon: "◈", label: "Overview" },
  { id: "Saved Listings", icon: "❤", label: "Saved" },
  { id: "My Orders", icon: "📦", label: "Orders" },
  { id: "Transport", icon: "🚛", label: "Transport" },
  { id: "Messages", icon: "💬", label: "Messages" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getCategoryEmoji(cat) {
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
  return map[cat?.toLowerCase()] || "🐾";
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-ZW", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-ZW", { hour: "2-digit", minute: "2-digit" });
}

function formatAmount(n) {
  return Number(n || 0).toLocaleString();
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function BuyerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("Overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [savedSearch, setSavedSearch] = useState("");
const [successArea, setSuccessArea] = useState("");
  // ── Data state ────────────────────────────────────────────────────────────
  const [savedListings, setSavedListings] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [transportOrders, setTransportOrders] = useState([]);
  const [transportLoading, setTransportLoading] = useState(true);

  // ── Messaging state ───────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [convoLoading, setConvoLoading] = useState(true);
  const [activeConvo, setActiveConvo] = useState(null);
  const [convoMessages, setConvoMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const msgBodyRef = useRef(null);
  const msgUnsubRef = useRef(null);

  // ── Transport modal state ─────────────────────────────────────────────────
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [transportForm, setTransportForm] = useState({
    animalType: "",
    quantity: "",
    pickupProvince: "",
    pickupTown: "",
    dropProvince: "",
    dropTown: "",
    preferredDate: "",
    notes: "",
    contactPhone: "",
  });
  const [transportSubmitting, setTransportSubmitting] = useState(false);
  const [transportSuccess, setTransportSuccess] = useState(false);

  // ── Fetch orders ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "orders"),
      where("buyerId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setOrdersLoading(false);
      },
      () => setOrdersLoading(false),
    );
  }, [user?.uid]);

  // ── Fetch saved listings ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const ids = snap.data()?.savedListings || [];
        if (!ids.length) {
          setSavedListings([]);
          setSavedLoading(false);
          return;
        }
        const results = await Promise.all(
          ids.map((id) => getDoc(doc(db, "listings", id))),
        );
        setSavedListings(
          results
            .filter((s) => s.exists())
            .map((s) => ({
              id: s.id,
              ...s.data(),
              emoji: getCategoryEmoji(s.data().categoryId),
            })),
        );
      } catch (err) {
        console.error(err);
      } finally {
        setSavedLoading(false);
      }
    })();
  }, [user?.uid]);


  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
  collection(db, "transport_requests"), 
  where("buyerId", "==", user.uid),
  orderBy("createdAt", "desc"),
);
    return onSnapshot(
      q,
      (snap) => {
        setTransportOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setTransportLoading(false);
      },
      () => setTransportLoading(false),
    );
  }, [user?.uid]);


  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setConvoLoading(false);
      },
      () => setConvoLoading(false),
    );
  }, [user?.uid]);

  // ── Listen to messages of active conversation ─────────────────────────────
  useEffect(() => {
    if (msgUnsubRef.current) {
      msgUnsubRef.current();
      msgUnsubRef.current = null;
    }
    if (!activeConvo?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConvoMessages([]);
      return;
    }

    const q = query(
      collection(db, "conversations", activeConvo.id, "messages"),
      orderBy("createdAt", "asc"),
    );
    msgUnsubRef.current = onSnapshot(q, (snap) => {
      setConvoMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Mark conversation as read for this user
    updateDoc(doc(db, "conversations", activeConvo.id), {
      [`unreadCount.${user.uid}`]: 0,
    }).catch(() => {});

    return () => {
      if (msgUnsubRef.current) msgUnsubRef.current();
    };
  }, [activeConvo?.id, user?.uid]);

  // ── Auto-scroll messages ──────────────────────────────────────────────────
  useEffect(() => {
    if (msgBodyRef.current)
      msgBodyRef.current.scrollTop = msgBodyRef.current.scrollHeight;
  }, [convoMessages]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    const pending = orders.filter((o) => o.status === "pending");
    const totalSpent = completed.reduce(
      (s, o) => s + Number(o.totalAmount || o.amount || 0),
      0,
    );
    const unreadMsgs = conversations.reduce(
      (n, c) => n + (c.unreadCount?.[user?.uid] || 0),
      0,
    );
    return [
      {
        label: "Total Spent",
        value: totalSpent > 0 ? `$${formatAmount(totalSpent)}` : "$0",
        sub: `${completed.length} completed order${completed.length !== 1 ? "s" : ""}`,
        type: totalSpent > 0 ? "up" : "neutral",
        icon: "💰",
      },
      {
        label: "Saved Listings",
        value: String(savedListings.length),
        sub: savedListings.length > 0 ? "Tap to view" : "None saved yet",
        type: savedListings.length > 0 ? "up" : "neutral",
        icon: "❤️",
      },
      {
        label: "Pending Orders",
        value: String(pending.length),
        sub:
          pending.length > 0
            ? `${pending.length} awaiting confirmation`
            : "All clear",
        type: pending.length > 0 ? "warn" : "neutral",
        icon: "📦",
      },
      {
        label: "Unread Messages",
        value: String(unreadMsgs),
        sub: unreadMsgs > 0 ? "New replies waiting" : "No new messages",
        type: unreadMsgs > 0 ? "warn" : "neutral",
        icon: "💬",
      },
    ];
  }, [savedListings, orders, conversations, user?.uid]);

  const totalUnread = useMemo(
    () =>
      conversations.reduce((n, c) => n + (c.unreadCount?.[user?.uid] || 0), 0),
    [conversations, user?.uid],
  );

  const filteredOrders = useMemo(
    () =>
      orderFilter === "all"
        ? orders
        : orders.filter((o) => o.status === orderFilter),
    [orders, orderFilter],
  );

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

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!msgInput.trim() || !activeConvo?.id || msgSending) return;
    const text = msgInput.trim();
    setMsgInput("");
    setMsgSending(true);
    try {
      // Add message to sub-collection
      await addDoc(
        collection(db, "conversations", activeConvo.id, "messages"),
        {
          text,
          senderId: user.uid,
          senderName: user.displayName || user.email,
          senderRole: "buyer",
          createdAt: serverTimestamp(),
        },
      );

      // Update conversation summary + bump unread for other participants
      const unreadUpdates = {};
      (activeConvo.participantIds || []).forEach((uid) => {
        if (uid !== user.uid)
          unreadUpdates[`unreadCount.${uid}`] =
            (activeConvo.unreadCount?.[uid] || 0) + 1;
      });
      await updateDoc(doc(db, "conversations", activeConvo.id), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        ...unreadUpdates,
      });
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setMsgSending(false);
    }
  }, [msgInput, activeConvo, user, msgSending]);

  // ── Create new conversation (e.g. from an order) ──────────────────────────
  const startConversation = useCallback(
    async (otherUid, otherName, otherRole, context = "") => {
      if (!user?.uid || !otherUid) return;

      // Check if conversation already exists
      const existingSnap = await getDocs(
        query(
          collection(db, "conversations"),
          where("participantIds", "array-contains", user.uid),
        ),
      );
      const existing = existingSnap.docs.find((d) => {
        const ids = d.data().participantIds || [];
        return ids.includes(otherUid) && ids.length === 2;
      });

      if (existing) {
        const convo = { id: existing.id, ...existing.data() };
        setActiveConvo(convo);
        setActiveTab("Messages");
        return;
      }

      // Create new conversation
      const newConvo = await addDoc(collection(db, "conversations"), {
        participantIds: [user.uid, otherUid],
        participantNames: {
          [user.uid]: user.displayName || user.email,
          [otherUid]: otherName,
        },
        participantRoles: { [user.uid]: "buyer", [otherUid]: otherRole },
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        context,
        unreadCount: { [user.uid]: 0, [otherUid]: 0 },
      });

      setActiveConvo({
        id: newConvo.id,
        participantIds: [user.uid, otherUid],
        participantNames: {
          [user.uid]: user.displayName || user.email,
          [otherUid]: otherName,
        },
        participantRoles: { [user.uid]: "buyer", [otherUid]: otherRole },
        context,
      });
      setActiveTab("Messages");
    },
    [user],
  );

  const unsaveListing = (id) =>
    setSavedListings((p) => p.filter((l) => l.id !== id));

  // ── Submit transport request ──────────────────────────────────────────────
const handleTransportSubmit = async (e) => {
  e.preventDefault();
  if (!transportForm.pickupProvince || !transportForm.animalType) return;
  setTransportSubmitting(true);
 
  // Capture display string BEFORE the form is cleared
  const pickupDisplay =
    transportForm.pickupTown || transportForm.pickupProvince;
 
  try {
    // 1. Write to transport_requests
    const reqRef = await addDoc(collection(db, "transport_requests"), {
      ...transportForm,
      buyerId: user.uid,
      buyerName: user.displayName || user.email,
      buyerEmail: user.email,
      status: "open",
      createdAt: serverTimestamp(),
    });
 
    // 2. Find drivers matching pickup province.
    //    Drivers can store their coverage as either:
    //      province: "Harare"           (single string)
    //      serviceProvinces: ["Harare", "Mashonaland East"]  (array)
    //    We run two queries and merge results.
    const [byProvince, byServiceArray] = await Promise.all([
      getDocs(
        query(
          collection(db, "users"),
          where("role", "==", "transporter"),
          where("province", "==", transportForm.pickupProvince),
        ),
      ),
      getDocs(
        query(
          collection(db, "users"),
          where("role", "==", "transporter"),
          where("serviceProvinces", "array-contains", transportForm.pickupProvince),
        ),
      ),
    ]);
 
    // Merge, de-duplicate by doc id
    const driverMap = new Map();
    [...byProvince.docs, ...byServiceArray.docs].forEach((d) =>
      driverMap.set(d.id, d),
    );
    const allDrivers = [...driverMap.values()];
 
    // Optional: further filter by town if provided
    const pickupTownNorm = transportForm.pickupTown?.trim().toLowerCase();
    const matchedDrivers = allDrivers.filter((d) => {
      if (!pickupTownNorm) return true;
      const driverTown = (d.data().town || d.data().city || "").toLowerCase();
      return (
        !driverTown ||
        driverTown.includes(pickupTownNorm) ||
        pickupTownNorm.includes(driverTown)
      );
    });
 
    // 3. Fan-out notifications
    await Promise.all(
      matchedDrivers.map((d) =>
        addDoc(collection(db, "notifications"), {
          toUid: d.id,
          type: "transport_request",
          transportRequestId: reqRef.id,
          message: `New job: ${transportForm.quantity}× ${transportForm.animalType} from ${transportForm.pickupTown || transportForm.pickupProvince} → ${transportForm.dropTown || transportForm.dropProvince || "TBD"}`,
          pickupProvince: transportForm.pickupProvince,
          pickupTown: transportForm.pickupTown,
          createdAt: serverTimestamp(),
          read: false,
        }),
      ),
    );
 
    // 4. Save display string, THEN clear the form
    setSuccessArea(pickupDisplay);
    setTransportSuccess(true);
    setTransportForm({
      animalType: "",
      quantity: "",
      pickupProvince: "",
      pickupTown: "",
      dropProvince: "",
      dropTown: "",
      preferredDate: "",
      notes: "",
      contactPhone: "",
    });
 
    setTimeout(() => {
      setTransportSuccess(false);
      setSuccessArea("");
      setShowTransportModal(false);
    }, 3000);
  } catch (err) {
    console.error("Transport request failed:", err);
  } finally {
    setTransportSubmitting(false);
  }
};

  const setTab = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bd">
      {/* ── NAV ── */}
      <nav className="bd-nav">
        <button
          className="bd-nav-back"
          onClick={() => navigate("/marketplace")}
        >
          <span>←</span> <span className="bd-nav-back-label">Market</span>
        </button>
        <div className="bd-nav-brand">
          <img src={logo} alt="Kraal" style={{ width: 110 }} />
          <span className="bd-nav-sub">Buyer Hub</span>
        </div>
        <div className="bd-nav-right">
          <button
            className="bd-hamburger"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <span />
            <span />
            <span />
          </button>
          <UserMenu />
        </div>
      </nav>

      {/* ── MOBILE MENU DRAWER ── */}
      {mobileMenuOpen && (
        <div className="bd-mobile-drawer">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`bd-mobile-drawer-item ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span>{t.icon}</span> {t.label}
              {t.id === "Messages" && totalUnread > 0 && (
                <span className="bd-badge">{totalUnread}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── HERO HEADER ── */}
      <div className="bd-hero">
        <div className="bd-hero-inner">
          <div className="bd-hero-left">
            <div className="bd-avatar">
              {(user?.displayName || user?.email || "B")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div>
              <h1 className="bd-hero-name">
                {user?.displayName?.split(" ")[0] || "Buyer"}
                <span className="bd-wave">👋</span>
              </h1>
              <p className="bd-hero-email">{user?.email}</p>
            </div>
          </div>
          <div className="bd-hero-actions">
            <button
              className="bd-hero-btn bd-hero-btn-transport"
              onClick={() => {
                setActiveTab("Transport");
                setShowTransportModal(true);
              }}
            >
              🚛 Request Transport
            </button>
            <button
              className="bd-hero-btn bd-hero-btn-browse"
              onClick={() => navigate("/marketplace")}
            >
              🐄 Browse
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="bd-stats-row">
          {stats.map((s) => (
            <div key={s.label} className={`bd-stat-chip bd-stat-${s.type}`}>
              <span className="bd-stat-chip-icon">{s.icon}</span>
              <div>
                <div className="bd-stat-chip-val">{s.value}</div>
                <div className="bd-stat-chip-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Tabs */}
        <div className="bd-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`bd-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="bd-tab-icon">{t.icon}</span>
              {t.label}
              {t.id === "Messages" && totalUnread > 0 && (
                <span className="bd-badge">{totalUnread}</span>
              )}
              {t.id === "Transport" &&
                transportOrders.some((r) => r.status === "quoted") && (
                  <span className="bd-badge">!</span>
                )}
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="bd-body">
        {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
        {activeTab === "Overview" && (
          <div className="bd-pane">
            <div className="bd-quick-actions">
              {[
                {
                  icon: "❤️",
                  label: "Saved\nListings",
                  tab: "Saved Listings",
                  highlight: false,
                },
                {
                  icon: "📦",
                  label: "My\nOrders",
                  tab: "My Orders",
                  highlight: false,
                },
                {
                  icon: "🚛",
                  label: "Request\nTransport",
                  tab: "Transport",
                  highlight: true,
                  modal: true,
                },
                {
                  icon: "💬",
                  label: "Messages",
                  tab: "Messages",
                  highlight: false,
                },
              ].map((qa) => (
                <button
                  key={qa.label}
                  className={`bd-qa-card ${qa.highlight ? "bd-qa-highlight" : ""}`}
                  onClick={() => {
                    setActiveTab(qa.tab);
                    if (qa.modal) setShowTransportModal(true);
                  }}
                >
                  <span className="bd-qa-icon">{qa.icon}</span>
                  <span style={{ whiteSpace: "pre-line" }}>{qa.label}</span>
                </button>
              ))}
            </div>

            <div className="bd-two-col">
              {/* Saved preview */}
              <section className="bd-card">
                <div className="bd-card-head">
                  <h2>❤️ Saved Listings</h2>
                  <button
                    className="bd-link"
                    onClick={() => setActiveTab("Saved Listings")}
                  >
                    View all →
                  </button>
                </div>
                {savedLoading ? (
                  <Spinner />
                ) : savedListings.length === 0 ? (
                  <EmptyState
                    emoji="🐾"
                    text="No saved listings yet."
                    cta="Browse Animals"
                    onCta={() => navigate("/marketplace")}
                  />
                ) : (
                  <div className="bd-mini-list">
                    {savedListings.slice(0, 4).map((l) => (
                      <div
                        key={l.id}
                        className="bd-mini-row"
                        onClick={() => navigate(`/listings/${l.id}`)}
                      >
                        <span className="bd-mini-emoji">{l.emoji}</span>
                        <div className="bd-mini-info">
                          <span className="bd-mini-title">{l.title}</span>
                          <span className="bd-mini-sub">
                            📍 {l.city || l.province || "Zimbabwe"}
                          </span>
                        </div>
                        <span className="bd-mini-price">
                          ${formatAmount(l.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent orders */}
              <section className="bd-card">
                <div className="bd-card-head">
                  <h2>📦 Recent Orders</h2>
                  <button
                    className="bd-link"
                    onClick={() => setActiveTab("My Orders")}
                  >
                    View all →
                  </button>
                </div>
                {ordersLoading ? (
                  <Spinner />
                ) : orders.length === 0 ? (
                  <EmptyState
                    emoji="📦"
                    text="No orders yet."
                    cta="Browse Animals"
                    onCta={() => navigate("/marketplace")}
                  />
                ) : (
                  <div className="bd-order-list">
                    {orders.slice(0, 4).map((o) => {
                      const meta = STATUS_META[o.status] || STATUS_META.pending;
                      return (
                        <div key={o.id} className="bd-order-row">
                          <div className="bd-order-row-left">
                            <span className="bd-order-icon">{meta.icon}</span>
                            <div>
                              <div className="bd-order-listing">
                                {o.listingTitle || o.listing || "Order"}
                              </div>
                              <div className="bd-order-meta">
                                {o.sellerName || o.seller || "Seller"} ·{" "}
                                {formatDate(o.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="bd-order-row-right">
                            <span className="bd-amount">
                              ${formatAmount(o.totalAmount || o.amount)}
                            </span>
                            <span className={`bd-pill ${meta.cls}`}>
                              {meta.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Transport preview */}
            {transportOrders.length > 0 && (
              <section className="bd-card bd-card-full">
                <div className="bd-card-head">
                  <h2>🚛 Transport Requests</h2>
                  <button
                    className="bd-link"
                    onClick={() => setActiveTab("Transport")}
                  >
                    View all →
                  </button>
                </div>
                <div className="bd-transport-mini">
                  {transportOrders.slice(0, 3).map((r) => (
                    <div key={r.id} className="bd-tr-chip">
                      <span className="bd-tr-emoji">🚛</span>
                      <div>
                        <div className="bd-tr-title">
                          {r.quantity}× {r.animalType}
                        </div>
                        <div className="bd-tr-route">
                          {r.pickupTown || r.pickupProvince} →{" "}
                          {r.dropTown || r.dropProvince}
                        </div>
                      </div>
                      <span
                        className={`bd-pill ${r.status === "quoted" ? "bd-pill-confirmed" : r.status === "completed" ? "bd-pill-completed" : "bd-pill-pending"}`}
                      >
                        {r.status === "quoted"
                          ? "Quoted ✉"
                          : r.status === "completed"
                            ? "Done ✅"
                            : "Seeking ⏳"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent messages */}
            {conversations.length > 0 && (
              <section className="bd-card bd-card-full">
                <div className="bd-card-head">
                  <h2>💬 Recent Messages</h2>
                  <button
                    className="bd-link"
                    onClick={() => setActiveTab("Messages")}
                  >
                    View all →
                  </button>
                </div>
                <div className="bd-mini-list">
                  {conversations.slice(0, 3).map((c) => {
                    const otherUid = c.participantIds?.find(
                      (id) => id !== user?.uid,
                    );
                    const otherName = c.participantNames?.[otherUid] || "User";
                    const unread = c.unreadCount?.[user?.uid] || 0;
                    return (
                      <div
                        key={c.id}
                        className="bd-mini-row"
                        onClick={() => {
                          setActiveConvo(c);
                          setActiveTab("Messages");
                        }}
                      >
                        <div
                          className="bd-msg-avatar"
                          style={{ flexShrink: 0 }}
                        >
                          {initials(otherName)}
                        </div>
                        <div className="bd-mini-info">
                          <span className="bd-mini-title">{otherName}</span>
                          <span className="bd-mini-sub">
                            {c.lastMessage || "No messages yet"}
                          </span>
                        </div>
                        {unread > 0 && (
                          <span className="bd-badge">{unread}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ══ SAVED LISTINGS ════════════════════════════════════════════════ */}
        {activeTab === "Saved Listings" && (
          <div className="bd-pane">
            <div className="bd-toolbar">
              <input
                className="bd-search"
                type="text"
                placeholder="🔍 Search saved listings…"
                value={savedSearch}
                onChange={(e) => setSavedSearch(e.target.value)}
              />
              <button
                className="bd-hero-btn bd-hero-btn-browse"
                onClick={() => navigate("/marketplace")}
              >
                + Find More
              </button>
            </div>
            {savedLoading ? (
              <Spinner />
            ) : filteredSaved.length === 0 ? (
              <EmptyState
                emoji="🐾"
                text={
                  savedSearch ? "No results found." : "No saved listings yet."
                }
                cta="Browse Animals"
                onCta={() => navigate("/marketplace")}
              />
            ) : (
              <div className="bd-saved-grid">
                {filteredSaved.map((l) => (
                  <div key={l.id} className="bd-saved-card">
                    <div className="bd-sc-thumb">
                      {l.photos?.[0]?.url ? (
                        <img src={l.photos[0].url} alt={l.title} />
                      ) : (
                        <span>{l.emoji}</span>
                      )}
                      <span
                        className={`bd-pill bd-sc-badge ${l.vaccinated ? "bd-pill-confirmed" : "bd-pill-pending"}`}
                      >
                        {l.vaccinated ? "Vaccinated" : l.condition || "Listed"}
                      </span>
                    </div>
                    <div className="bd-sc-info">
                      <h3>{l.title}</h3>
                      <div className="bd-sc-tags">
                        {l.breed && <span>🏷 {l.breed}</span>}
                        {l.age && <span>📅 {l.age}</span>}
                        {l.weight && <span>⚖️ {l.weight}</span>}
                      </div>
                      <div className="bd-sc-footer">
                        <div>
                          <strong className="bd-sc-price">
                            {l.currency || "USD"} {formatAmount(l.price)}
                          </strong>
                          <span className="bd-sc-unit">
                            {" "}
                            {l.pricePerHead ? "/ head" : "/ lot"}
                          </span>
                        </div>
                        <span className="bd-sc-loc">
                          📍 {l.city || l.province || "Zimbabwe"}
                        </span>
                      </div>
                    </div>
                    <div className="bd-sc-actions">
                      <button
                        className="bd-btn-view"
                        onClick={() => navigate(`/listings/${l.id}`)}
                      >
                        View
                      </button>
                      {l.sellerId && (
                        <button
                          className="bd-btn-view"
                          style={{ background: "#1a7a4a" }}
                          onClick={() =>
                            startConversation(
                              l.sellerId,
                              l.sellerName || "Seller",
                              "seller",
                              `Inquiry about ${l.title}`,
                            )
                          }
                        >
                          💬 Chat
                        </button>
                      )}
                      <button
                        className="bd-btn-unsave"
                        onClick={() => unsaveListing(l.id)}
                      >
                        🤍 Unsave
                      </button>
                      <button
                        className="bd-btn-transport"
                        onClick={() => {
                          setTransportForm((f) => ({
                            ...f,
                            animalType: l.categoryId || "",
                            quantity: "1",
                          }));
                          setActiveTab("Transport");
                          setShowTransportModal(true);
                        }}
                      >
                        🚛 Transport
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ MY ORDERS ══════════════════════════════════════════════════════ */}
        {activeTab === "My Orders" && (
          <div className="bd-pane">
            <div className="bd-order-filters">
              {["all", "pending", "confirmed", "completed", "cancelled"].map(
                (f) => (
                  <button
                    key={f}
                    className={`bd-filter-btn ${orderFilter === f ? "active" : ""}`}
                    onClick={() => setOrderFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    <span className="bd-filter-count">
                      {f === "all"
                        ? orders.length
                        : orders.filter((o) => o.status === f).length}
                    </span>
                  </button>
                ),
              )}
            </div>

            {ordersLoading ? (
              <Spinner />
            ) : filteredOrders.length === 0 ? (
              <EmptyState
                emoji="📦"
                text={`No ${orderFilter === "all" ? "" : orderFilter + " "}orders found.`}
              />
            ) : (
              <div className="bd-orders-list">
                {filteredOrders.map((order) => {
                  const meta = STATUS_META[order.status] || STATUS_META.pending;
                  return (
                    <div key={order.id} className="bd-order-card">
                      <div className="bd-order-card-head">
                        <div className="bd-order-id">
                          #{order.id?.slice(-8).toUpperCase()}
                        </div>
                        <span className={`bd-pill ${meta.cls}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <div className="bd-order-card-body">
                        {[
                          [
                            "Listing",
                            order.listingTitle || order.listing || "—",
                          ],
                          ["Seller", order.sellerName || order.seller || "—"],
                          ["Qty", order.qty || order.quantity || "—"],
                          [
                            "Location",
                            `📍 ${order.location || order.sellerCity || "—"}`,
                          ],
                          ["Date", formatDate(order.createdAt)],
                          [
                            "Amount",
                            `$${formatAmount(order.totalAmount || order.amount)}`,
                          ],
                        ].map(([label, val]) => (
                          <div key={label} className="bd-order-detail">
                            <span className="bd-detail-label">{label}</span>
                            <span className="bd-detail-val">{val}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bd-order-card-foot">
                        {order.sellerId && (
                          <button
                            className="bd-wa-btn"
                            style={{
                              textDecoration: "none",
                              cursor: "pointer",
                              border: "none",
                            }}
                            onClick={() =>
                              startConversation(
                                order.sellerId,
                                order.sellerName || "Seller",
                                "seller",
                                `Order #${order.id?.slice(-8).toUpperCase()}`,
                              )
                            }
                          >
                            💬 Message Seller
                          </button>
                        )}
                        {order.status === "confirmed" && (
                          <button
                            className="bd-btn-transport"
                            onClick={() => {
                              setTransportForm((f) => ({
                                ...f,
                                animalType: order.categoryId || "",
                                quantity: String(order.qty || 1),
                                pickupTown: order.location || "",
                              }));
                              setActiveTab("Transport");
                              setShowTransportModal(true);
                            }}
                          >
                            🚛 Arrange Transport
                          </button>
                        )}
                        {order.status === "completed" && (
                          <span className="bd-order-action-note">
                            ✅ Order complete
                          </span>
                        )}
                        {order.status === "cancelled" && (
                          <span className="bd-order-action-note">
                            ✕ Cancelled
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ TRANSPORT ══════════════════════════════════════════════════════ */}
        {activeTab === "Transport" && (
          <div className="bd-pane">
            <div className="bd-transport-header">
              <div>
                <h2 className="bd-section-title">🚛 Transport Requests</h2>
                <p className="bd-section-sub">
                  Drivers in your pickup province & town are notified instantly.
                </p>
              </div>
              <button
                className="bd-hero-btn bd-hero-btn-transport"
                onClick={() => setShowTransportModal(true)}
              >
                + New Request
              </button>
            </div>

            {transportLoading ? (
              <Spinner />
            ) : transportOrders.length === 0 ? (
              <div className="bd-transport-empty">
                <div className="bd-transport-empty-icon">🚛</div>
                <h3>No transport requests yet</h3>
                <p>
                  Request livestock transport and get quotes from verified
                  drivers nearby.
                </p>
                <button
                  className="bd-hero-btn bd-hero-btn-transport"
                  onClick={() => setShowTransportModal(true)}
                >
                  Request Transport Now
                </button>
              </div>
            ) : (
              <div className="bd-transport-list">
                {transportOrders.map((r) => (
                  <div key={r.id} className="bd-tr-card">
                    <div className="bd-tr-card-icon">🚛</div>
                    <div className="bd-tr-card-info">
                      <div className="bd-tr-card-title">
                        {r.quantity}× {r.animalType}
                      </div>
                      <div className="bd-tr-card-route">
                        <span>📍 {r.pickupTown || r.pickupProvince}</span>
                        <span className="bd-tr-arrow">→</span>
                        <span>📍 {r.dropTown || r.dropProvince || "TBD"}</span>
                      </div>
                      <div className="bd-tr-card-meta">
                        {r.preferredDate && <span>📅 {r.preferredDate}</span>}
                        {r.contactPhone && <span>📞 {r.contactPhone}</span>}
                      </div>
                      {r.notes && (
                        <div className="bd-tr-card-notes">"{r.notes}"</div>
                      )}
                    </div>
                    <div className="bd-tr-card-status">
                      <span
                        className={`bd-pill ${r.status === "quoted" ? "bd-pill-confirmed" : r.status === "completed" ? "bd-pill-completed" : "bd-pill-pending"}`}
                      >
                        {r.status === "quoted"
                          ? "✉ Quoted"
                          : r.status === "completed"
                            ? "✅ Done"
                            : "⏳ Seeking"}
                      </span>
                      <span className="bd-tr-card-date">
                        {formatDate(r.createdAt)}
                      </span>
                      {r.driverUid && (
                        <button
                          className="bd-btn-view"
                          style={{ marginTop: 6 }}
                          onClick={() =>
                            startConversation(
                              r.driverUid,
                              r.driverName || "Driver",
                              "transporter",
                              `Transport job: ${r.quantity}× ${r.animalType}`,
                            )
                          }
                        >
                          💬 Chat Driver
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ MESSAGES ══════════════════════════════════════════════════════ */}
        {activeTab === "Messages" && (
          <div className="bd-pane bd-pane-msg">
            <div className="bd-msg-layout">
              {/* Sidebar */}
              <div
                className={`bd-msg-sidebar ${activeConvo ? "bd-msg-sidebar-hidden-mobile" : ""}`}
              >
                <div className="bd-msg-sidebar-head">
                  Conversations
                  {totalUnread > 0 && (
                    <span className="bd-badge">{totalUnread}</span>
                  )}
                </div>

                {convoLoading ? (
                  <Spinner />
                ) : conversations.length === 0 ? (
                  <div className="bd-msg-empty-sidebar">
                    <p>No conversations yet.</p>
                    <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                      Start a chat from a listing or an order.
                    </p>
                  </div>
                ) : (
                  conversations.map((c) => {
                    const otherUid = c.participantIds?.find(
                      (id) => id !== user?.uid,
                    );
                    const otherName = c.participantNames?.[otherUid] || "User";
                    const otherRole = c.participantRoles?.[otherUid] || "";
                    const unread = c.unreadCount?.[user?.uid] || 0;
                    const roleIcon =
                      otherRole === "transporter"
                        ? "🚛"
                        : otherRole === "seller"
                          ? "🏪"
                          : "👤";
                    return (
                      <div
                        key={c.id}
                        className={`bd-msg-thread ${activeConvo?.id === c.id ? "active" : ""}`}
                        onClick={() => setActiveConvo(c)}
                      >
                        <div className="bd-msg-avatar">
                          {initials(otherName)}
                        </div>
                        <div className="bd-msg-thread-info">
                          <div className="bd-msg-thread-name">
                            {roleIcon} {otherName}
                            {unread > 0 && (
                              <span className="bd-badge">{unread}</span>
                            )}
                          </div>
                          <div className="bd-msg-thread-preview">
                            {c.lastMessage || "No messages yet"}
                          </div>
                          <div className="bd-msg-thread-time">
                            {formatDate(c.lastMessageAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Main chat panel */}
              <div
                className={`bd-msg-main ${!activeConvo ? "bd-msg-main-hidden-mobile" : ""}`}
              >
                {activeConvo ? (
                  <>
                    <div className="bd-msg-head">
                      {/* Back button on mobile */}
                      <button
                        className="bd-msg-back"
                        onClick={() => setActiveConvo(null)}
                      >
                        ← Back
                      </button>
                      <div className="bd-msg-avatar bd-msg-avatar-lg">
                        {initials(
                          activeConvo.participantNames?.[
                            activeConvo.participantIds?.find(
                              (id) => id !== user?.uid,
                            )
                          ] || "?",
                        )}
                      </div>
                      <div>
                        <div className="bd-msg-head-name">
                          {activeConvo.participantNames?.[
                            activeConvo.participantIds?.find(
                              (id) => id !== user?.uid,
                            )
                          ] || "User"}
                        </div>
                        <div className="bd-msg-head-sub">
                          {activeConvo.participantRoles?.[
                            activeConvo.participantIds?.find(
                              (id) => id !== user?.uid,
                            )
                          ] === "transporter"
                            ? "🚛 Transporter"
                            : "🏪 Seller"}
                          {activeConvo.context
                            ? ` · ${activeConvo.context}`
                            : ""}
                        </div>
                      </div>
                    </div>

                    <div className="bd-msg-body" ref={msgBodyRef}>
                      {convoMessages.length === 0 && (
                        <div className="bd-msg-empty">
                          Send the first message!
                        </div>
                      )}
                      {convoMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`bd-bubble ${msg.senderId === user?.uid ? "sent" : "recv"}`}
                        >
                          {msg.senderId !== user?.uid && (
                            <div className="bd-bubble-sender">
                              {msg.senderName}
                            </div>
                          )}
                          {msg.text}
                          <div className="bd-bubble-time">
                            {formatTime(msg.createdAt)}
                          </div>
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
                      <button
                        className="bd-msg-send"
                        onClick={sendMessage}
                        disabled={msgSending}
                      >
                        {msgSending ? "…" : "↑"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bd-msg-empty">
                    <div style={{ fontSize: "2.5rem" }}>💬</div>
                    <p>Select a conversation to start messaging.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ TRANSPORT MODAL ════════════════════════════════════════════════ */}
      {showTransportModal && (
        <div
          className="bd-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTransportModal(false);
          }}
        >
          <div className="bd-modal">
            <div className="bd-modal-head">
              <div>
                <h2>🚛 Request Livestock Transport</h2>
                <p>
                  Drivers matching your pickup location will be notified
                  immediately.
                </p>
              </div>
              <button
                className="bd-modal-close"
                onClick={() => setShowTransportModal(false)}
              >
                ✕
              </button>
            </div>

            {transportSuccess ? (
              <div className="bd-transport-success">
                <div className="bd-ts-icon">✅</div>
                <h3>Request Sent!</h3>
                <p>

   Transport providers near{" "}

   <strong>{successArea || "your pickup area"}</strong>{" "}

   have been notified. You'll receive quotes shortly.

 </p>
              </div>
            ) : (
              <form
                className="bd-transport-form"
                onSubmit={handleTransportSubmit}
              >
                <div className="bd-form-section">
                  <div className="bd-form-label-section">Animal Details</div>
                  <div className="bd-form-row">
                    <div className="bd-form-group">
                      <label>Animal Type *</label>
                      <select
                        required
                        value={transportForm.animalType}
                        onChange={(e) =>
                          setTransportForm((f) => ({
                            ...f,
                            animalType: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select type…</option>
                        {[
                          "Cattle",
                          "Goats",
                          "Sheep",
                          "Pigs",
                          "Chickens",
                          "Ducks",
                          "Horses",
                          "Other",
                        ].map((a) => (
                          <option key={a} value={a.toLowerCase()}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bd-form-group">
                      <label>Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 10"
                        value={transportForm.quantity}
                        onChange={(e) =>
                          setTransportForm((f) => ({
                            ...f,
                            quantity: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="bd-form-section">
                  <div className="bd-form-label-section">
                    📍 Pickup Location *
                  </div>
                  <div className="bd-form-row">
                    <div className="bd-form-group">
                      <label>Province *</label>
                      <select
                        required
                        value={transportForm.pickupProvince}
                        onChange={(e) =>
                          setTransportForm((f) => ({
                            ...f,
                            pickupProvince: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select province…</option>
                        {PROVINCES.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="bd-form-group">
                      <label>Town / Farm</label>
                      <input
                        type="text"
                        placeholder="e.g. Marondera"
                        value={transportForm.pickupTown}
                        onChange={(e) =>
                          setTransportForm((f) => ({
                            ...f,
                            pickupTown: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="bd-form-section">
                  <div className="bd-form-label-section">
                    📍 Drop-off Location
                  </div>
                  <div className="bd-form-row">
                    <div className="bd-form-group">
                      <label>Province</label>
                      <select
                        value={transportForm.dropProvince}
                        onChange={(e) =>
                          setTransportForm((f) => ({
                            ...f,
                            dropProvince: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select province…</option>
                        {PROVINCES.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="bd-form-group">
                      <label>Town / Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Harare CBD"
                        value={transportForm.dropTown}
                        onChange={(e) =>
                          setTransportForm((f) => ({
                            ...f,
                            dropTown: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="bd-form-row">
                  <div className="bd-form-group">
                    <label>Preferred Date</label>
                    <input
                      type="date"
                      value={transportForm.preferredDate}
                      onChange={(e) =>
                        setTransportForm((f) => ({
                          ...f,
                          preferredDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="bd-form-group">
                    <label>Contact Phone</label>
                    <input
                      type="tel"
                      placeholder="+263 7X XXX XXXX"
                      value={transportForm.contactPhone}
                      onChange={(e) =>
                        setTransportForm((f) => ({
                          ...f,
                          contactPhone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="bd-form-group">
                  <label>Additional Notes</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Animals need water stops, fragile livestock, special crates needed…"
                    value={transportForm.notes}
                    onChange={(e) =>
                      setTransportForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>

                <div className="bd-modal-actions">
                  <button
                    type="button"
                    className="bd-btn-cancel"
                    onClick={() => setShowTransportModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bd-btn-submit"
                    disabled={transportSubmitting}
                  >
                    {transportSubmitting
                      ? "Sending…"
                      : "🚛 Send to Nearby Drivers"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="bd-spinner-wrap">
      <div className="bd-spinner" />
    </div>
  );
}

function EmptyState({ emoji, text, cta, onCta }) {
  return (
    <div className="bd-empty">
      <span className="bd-empty-emoji">{emoji}</span>
      <p>{text}</p>
      {cta && (
        <button className="bd-hero-btn bd-hero-btn-browse" onClick={onCta}>
          {cta}
        </button>
      )}
    </div>
  );
}
