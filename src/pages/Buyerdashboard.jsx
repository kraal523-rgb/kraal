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
import ProfileSheet from "../components/ProfileSheet";
import { useVetRequest } from "../hooks/useVetRequest.jsx";
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
  pending:   { label: "Pending",   cls: "bd-pill-pending",   icon: "⏳" },
  confirmed: { label: "Confirmed", cls: "bd-pill-confirmed", icon: "✅" },
  completed: { label: "Completed", cls: "bd-pill-completed", icon: "🎉" },
  cancelled: { label: "Cancelled", cls: "bd-pill-cancelled", icon: "✕"  },
};

const TABS = [
  { id: "Overview",       icon: "◈",  label: "Overview"        },
  { id: "Saved Listings", icon: "❤",  label: "Saved"           },
  { id: "My Orders",      icon: "📦", label: "Orders"          },
  { id: "Transport",      icon: "🚛", label: "Transport"       },
  { id: "Messages",       icon: "💬", label: "Messages"        },
  { id: "Invoices",       icon: "📄", label: "Invoices & Quotes" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getCategoryEmoji(cat) {
  const map = {
    cattle: "🐄", goats: "🐐", sheep: "🐑", chicken: "🐓",
    guinea: "🦤", ducks: "🦆", rabbits: "🐇", turkey: "🦃",
    pigs: "🐖", horses: "🐴", donkeys: "🫏", other: "🐾",
  };
  return map[cat?.toLowerCase()] || "🐾";
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-ZW", { day: "numeric", month: "short", year: "numeric" });
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
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

async function addDocWithRetry(collectionRef, data, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await addDoc(collectionRef, data);
    } catch (err) {
      const isInternalError =
        err?.message?.includes("INTERNAL ASSERTION FAILED") || err?.code === undefined;
      if (isInternalError && i < retries) {
        console.warn(`🔄 Firestore internal error, retrying (${i + 1})…`);
        await new Promise((res) => setTimeout(res, 500 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

export default function BuyerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const WORKER_URL = import.meta.env.VITE_UPLOAD_WORKER_URL || "https://kraal-upload.kraal523.workers.dev";
  const [activeTab, setActiveTab] = useState("Overview");
  const [orderFilter, setOrderFilter] = useState("all");
  const [savedSearch, setSavedSearch] = useState("");
  const [successArea, setSuccessArea] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const { openVetRequest, vetRequestModal } = useVetRequest(user, userProfile)
  // ── Data state ──────────────────────────────────────────────────────────
  const [savedListings, setSavedListings] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [transportOrders, setTransportOrders] = useState([]);
  const [transportLoading, setTransportLoading] = useState(true);
  const [buyerInsights, setBuyerInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [transportEstimate, setTransportEstimate] = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [replySuggestions, setReplySuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [convoLoading, setConvoLoading] = useState(true);
  const [activeConvo, setActiveConvo] = useState(null);
  const [convoMessages, setConvoMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const msgBodyRef = useRef(null);
  const msgUnsubRef = useRef(null);
  const [priceChecks, setPriceChecks] = useState({});
  const [priceCheckLoading, setPriceCheckLoading] = useState({});
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [transportQuotes, setTransportQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [transportForm, setTransportForm] = useState({
    animalType: "", quantity: "", pickupProvince: "", pickupTown: "",
    dropProvince: "", dropTown: "", preferredDate: "", notes: "", contactPhone: "",
  });
  const [transportSubmitting, setTransportSubmitting] = useState(false);
  const [transportSuccess, setTransportSuccess] = useState(false);

  // ── Derived / memos ──────────────────────────────────────────────────────
  const overdueInvoices = useMemo(
    () => invoices.filter((inv) => {
      if (inv.status === "paid") return false;
      if (!inv.dueDate) return false;
      const due = inv.dueDate.toDate ? inv.dueDate.toDate() : new Date(inv.dueDate);
      return due < new Date();
    }),
    [invoices],
  );

  const outstandingTotal = useMemo(
    () => invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount || 0), 0),
    [invoices],
  );

  const filteredInvoiceItems = useMemo(() => {
    const combined = [
      ...invoices.map((i) => ({ ...i, _kind: "invoice" })),
      ...transportQuotes.map((q) => ({ ...q, _kind: "quote" })),
    ];
    return combined.filter((item) => {
      if (invoiceFilter === "invoice" && item._kind !== "invoice") return false;
      if (invoiceFilter === "quote"   && item._kind !== "quote")   return false;
      if (invoiceFilter === "overdue" && item.status !== "overdue") return false;
      if (invoiceFilter === "paid"    && item.status !== "paid")    return false;
      if (invoiceSearch.trim()) {
        const hay = [item.title, item.sellerName, item.driverName, item.animalType]
          .join(" ").toLowerCase();
        if (!hay.includes(invoiceSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [invoices, transportQuotes, invoiceFilter, invoiceSearch]);

  // ── Firestore subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "orders"), where("buyerId", "==", user.uid), orderBy("createdAt", "desc"));
    return onSnapshot(q,
      (snap) => { setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setOrdersLoading(false); },
      () => setOrdersLoading(false),
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const ids = snap.data()?.savedListings || [];
        if (!ids.length) { setSavedListings([]); setSavedLoading(false); return; }
        const results = await Promise.all(ids.map((id) => getDoc(doc(db, "listings", id))));
        setSavedListings(
          results.filter((s) => s.exists()).map((s) => ({
            id: s.id, ...s.data(), emoji: getCategoryEmoji(s.data().categoryId),
          })),
        );
      } catch (err) { console.error(err); }
      finally { setSavedLoading(false); }
    })();
  }, [user?.uid]);
useEffect(() => {
  if (!user?.uid) return;
  getDoc(doc(db, "users", user.uid)).then((snap) => {
    if (snap.exists()) setUserProfile(snap.data());
  });
}, [user?.uid]);
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "invoices"), where("buyerId", "==", user.uid), orderBy("createdAt", "desc"));
    return onSnapshot(q,
      (snap) => { setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setInvoicesLoading(false); },
      () => setInvoicesLoading(false),
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "transport_quotes"), where("buyerId", "==", user.uid), orderBy("createdAt", "desc"));
    return onSnapshot(q,
      (snap) => { setTransportQuotes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setQuotesLoading(false); },
      () => setQuotesLoading(false),
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "transport_requests"), where("buyerId", "==", user.uid), orderBy("createdAt", "desc"));
    return onSnapshot(q,
      (snap) => { setTransportOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setTransportLoading(false); },
      () => setTransportLoading(false),
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "conversations"), where("participantIds", "array-contains", user.uid), orderBy("lastMessageAt", "desc"));
    return onSnapshot(q,
      (snap) => { setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setConvoLoading(false); },
      () => setConvoLoading(false),
    );
  }, [user?.uid]);

  // ── AI effects ───────────────────────────────────────────────────────────
  async function getIdToken() {
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    return auth.currentUser?.getIdToken();
  }

  useEffect(() => {
    if (ordersLoading || savedLoading || transportLoading) return;
    if (buyerInsights) return;
    setInsightsLoading(true);
    (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`${WORKER_URL}/api/ai/buyer/insights`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orders, savedListings, transportOrders }),
        });
        const data = await res.json();
        setBuyerInsights(data);
      } catch {}
      finally { setInsightsLoading(false); }
    })();
  }, [ordersLoading, savedLoading, transportLoading]); // eslint-disable-line

  useEffect(() => {
    if (!showTransportModal) return;
    if (!transportForm.pickupProvince || !transportForm.animalType) return;
    setEstimateLoading(true);
    setTransportEstimate(null);
    const timer = setTimeout(async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`${WORKER_URL}/api/ai/buyer/transport-estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            animalType: transportForm.animalType, quantity: transportForm.quantity,
            pickupProvince: transportForm.pickupProvince, pickupTown: transportForm.pickupTown,
            dropProvince: transportForm.dropProvince, dropTown: transportForm.dropTown,
          }),
        });
        const data = await res.json();
        setTransportEstimate(data);
      } catch {}
      finally { setEstimateLoading(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [transportForm.animalType, transportForm.pickupProvince, transportForm.pickupTown, transportForm.dropProvince, transportForm.dropTown, transportForm.quantity, showTransportModal, WORKER_URL]);

  useEffect(() => {
    if (!activeConvo?.id || convoMessages.length === 0) { setReplySuggestions([]); return; }
    const lastMsg = convoMessages[convoMessages.length - 1];
    if (lastMsg.senderId === user?.uid) { setReplySuggestions([]); return; }
    (async () => {
      setSuggestionsLoading(true);
      try {
        const token = await getIdToken();
        const res = await fetch(`${WORKER_URL}/api/ai/buyer/reply-suggestions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            lastMessage: lastMsg.text, context: activeConvo.context || "",
            otherRole: activeConvo.participantRoles?.[activeConvo.participantIds?.find((id) => id !== user?.uid)] || "seller",
          }),
        });
        const data = await res.json();
        setReplySuggestions(data.suggestions || []);
      } catch {}
      finally { setSuggestionsLoading(false); }
    })();
  }, [convoMessages.length, activeConvo?.id]); // eslint-disable-line

  // ── Active conversation messages ─────────────────────────────────────────
  useEffect(() => {
    if (msgUnsubRef.current) { msgUnsubRef.current(); msgUnsubRef.current = null; }
    if (!activeConvo?.id) { setConvoMessages([]); return; }
    const q = query(collection(db, "conversations", activeConvo.id, "messages"), orderBy("createdAt", "asc"));
    msgUnsubRef.current = onSnapshot(q, (snap) => {
      setConvoMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    updateDoc(doc(db, "conversations", activeConvo.id), { [`unreadCount.${user.uid}`]: 0 }).catch(() => {});
    return () => { if (msgUnsubRef.current) msgUnsubRef.current(); };
  }, [activeConvo?.id, user?.uid]);

  useEffect(() => {
    if (msgBodyRef.current) msgBodyRef.current.scrollTop = msgBodyRef.current.scrollHeight;
  }, [convoMessages]);

  // ── Price checks ─────────────────────────────────────────────────────────
  const fetchPriceCheck = useCallback(async (listing) => {
    if (priceChecks[listing.id] || priceCheckLoading[listing.id]) return;
    setPriceCheckLoading((p) => ({ ...p, [listing.id]: true }));
    try {
      const token = await getIdToken();
      const res = await fetch(`${WORKER_URL}/api/ai/buyer/price-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: listing.title, category: listing.categoryId, price: listing.price,
          breed: listing.breed, age: listing.age, weight: listing.weight,
          vaccinated: listing.vaccinated, quantity: listing.quantity,
          location: listing.province || listing.city,
        }),
      });
      const data = await res.json();
      setPriceChecks((p) => ({ ...p, [listing.id]: data }));
    } catch {}
    finally { setPriceCheckLoading((p) => ({ ...p, [listing.id]: false })); }
  }, [priceChecks, priceCheckLoading]); // eslint-disable-line

  useEffect(() => { savedListings.forEach((l) => fetchPriceCheck(l)); }, [savedListings]); // eslint-disable-line

  // ── Stats / KPIs ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    const pending   = orders.filter((o) => o.status === "pending");
    const totalSpent = completed.reduce((s, o) => s + Number(o.totalAmount || o.amount || 0), 0);
    const unreadMsgs = conversations.reduce((n, c) => n + (c.unreadCount?.[user?.uid] || 0), 0);
    return [
      {
        label: "Total Spent", value: `$${formatAmount(totalSpent)}`,
        sub: `${completed.length} completed order${completed.length !== 1 ? "s" : ""}`,
        type: totalSpent > 0 ? "up" : "neutral", icon: "💰", iconBg: "#eaf5ef",
      },
      {
        label: "Saved Listings", value: String(savedListings.length),
        sub: savedListings.length > 0 ? "Tap to view" : "None saved yet",
        type: savedListings.length > 0 ? "up" : "neutral", icon: "❤️", iconBg: "#fdecea",
      },
      {
        label: "Pending Orders", value: String(pending.length),
        sub: pending.length > 0 ? `${pending.length} awaiting confirmation` : "All clear",
        type: pending.length > 0 ? "warn" : "neutral", icon: "📦", iconBg: "#fef3c7",
      },
      {
        label: "Unread Messages", value: String(unreadMsgs),
        sub: unreadMsgs > 0 ? "New replies waiting" : "No new messages",
        type: unreadMsgs > 0 ? "warn" : "neutral", icon: "💬", iconBg: "#e8f1fb",
      },
    ];
  }, [savedListings, orders, conversations, user?.uid]);

  const totalUnread = useMemo(
    () => conversations.reduce((n, c) => n + (c.unreadCount?.[user?.uid] || 0), 0),
    [conversations, user?.uid],
  );

  const filteredOrders = useMemo(
    () => orderFilter === "all" ? orders : orders.filter((o) => o.status === orderFilter),
    [orders, orderFilter],
  );

  const filteredSaved = useMemo(
    () => savedSearch.trim()
      ? savedListings.filter((l) =>
          [l.title, l.breed, l.city, l.province].join(" ").toLowerCase().includes(savedSearch.toLowerCase()))
      : savedListings,
    [savedListings, savedSearch],
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!msgInput.trim() || !activeConvo?.id || msgSending) return;
    const text = msgInput.trim();
    setMsgInput("");
    setMsgSending(true);
    try {
      await addDoc(collection(db, "conversations", activeConvo.id, "messages"), {
        text, senderId: user.uid, senderName: user.displayName || user.email,
        senderRole: "buyer", createdAt: serverTimestamp(),
      });
      const unreadUpdates = {};
      (activeConvo.participantIds || []).forEach((uid) => {
        if (uid !== user.uid) unreadUpdates[`unreadCount.${uid}`] = (activeConvo.unreadCount?.[uid] || 0) + 1;
      });
      await updateDoc(doc(db, "conversations", activeConvo.id), {
        lastMessage: text, lastMessageAt: serverTimestamp(), ...unreadUpdates,
      });
    } catch (err) { console.error("Send message error:", err); }
    finally { setMsgSending(false); }
  }, [msgInput, activeConvo, user, msgSending]);

  const startConversation = useCallback(async (otherUid, otherName, otherRole, context = "") => {
    if (!user?.uid || !otherUid) return;
    const existingSnap = await getDocs(query(collection(db, "conversations"), where("participantIds", "array-contains", user.uid)));
    const existing = existingSnap.docs.find((d) => {
      const ids = d.data().participantIds || [];
      return ids.includes(otherUid) && ids.length === 2;
    });
    if (existing) { setActiveConvo({ id: existing.id, ...existing.data() }); setActiveTab("Messages"); return; }
    const newConvo = await addDoc(collection(db, "conversations"), {
      participantIds: [user.uid, otherUid],
      participantNames: { [user.uid]: user.displayName || user.email, [otherUid]: otherName },
      participantRoles: { [user.uid]: "buyer", [otherUid]: otherRole },
      lastMessage: "", lastMessageAt: serverTimestamp(), context,
      unreadCount: { [user.uid]: 0, [otherUid]: 0 },
    });
    setActiveConvo({
      id: newConvo.id, participantIds: [user.uid, otherUid],
      participantNames: { [user.uid]: user.displayName || user.email, [otherUid]: otherName },
      participantRoles: { [user.uid]: "buyer", [otherUid]: otherRole }, context,
    });
    setActiveTab("Messages");
  }, [user]);

  const unsaveListing = (id) => setSavedListings((p) => p.filter((l) => l.id !== id));

  const handleTransportSubmit = async (e) => {
    e.preventDefault();
    if (!transportForm.pickupProvince || !transportForm.animalType) return;
    setTransportSubmitting(true);
    const pickupDisplay = transportForm.pickupTown || transportForm.pickupProvince;
    try {
      const reqRef = await addDocWithRetry(collection(db, "transport_requests"), {
        ...transportForm, buyerId: user.uid, buyerName: user.displayName || user.email,
        buyerEmail: user.email, status: "open", createdAt: serverTimestamp(),
      });
      const [byProvince, byServiceArray] = await Promise.all([
        getDocs(query(collection(db, "transporters"), where("province", "==", transportForm.pickupProvince))),
        getDocs(query(collection(db, "transporters"), where("serviceProvinces", "array-contains", transportForm.pickupProvince))),
      ]);
      const driverMap = new Map();
      [...byProvince.docs, ...byServiceArray.docs].forEach((d) => driverMap.set(d.id, d));
      const allDrivers = [...driverMap.values()];
      const pickupTownNorm = transportForm.pickupTown?.trim().toLowerCase();
      const matchedDrivers = allDrivers.filter((d) => {
        if (!pickupTownNorm) return true;
        const driverTown = (d.data().town || d.data().city || "").toLowerCase();
        return !driverTown || driverTown.includes(pickupTownNorm) || pickupTownNorm.includes(driverTown);
      });
      await Promise.all(matchedDrivers.map((d) =>
        addDocWithRetry(collection(db, "notifications"), {
          toUid: d.id, type: "transport_request", transportRequestId: reqRef.id,
          message: `New job: ${transportForm.quantity}× ${transportForm.animalType} from ${transportForm.pickupTown || transportForm.pickupProvince} → ${transportForm.dropTown || transportForm.dropProvince || "TBD"}`,
          pickupProvince: transportForm.pickupProvince, pickupTown: transportForm.pickupTown,
          createdAt: serverTimestamp(), read: false,
        }),
      ));
      setSuccessArea(pickupDisplay);
      setTransportSuccess(true);
      setTransportForm({ animalType: "", quantity: "", pickupProvince: "", pickupTown: "", dropProvince: "", dropTown: "", preferredDate: "", notes: "", contactPhone: "" });
      setTimeout(() => { setTransportSuccess(false); setSuccessArea(""); setShowTransportModal(false); }, 3000);
    } catch (err) { console.error("Transport request failed:", err.code, err.message); }
    finally { setTransportSubmitting(false); }
  };

  const setTab = (id) => setActiveTab(id);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bd">

      {/* ── TOPBAR ── */}
      <header className="bd-topbar">
        <div className="bd-topbar-logo">
         
          <div>
            <img src={logo} width={100} alt="" />
          </div>
        </div>

        <div className="bd-topbar-left">
          <span className="bd-topbar-title">
            Welcome, {user?.displayName?.split(" ")[0] || "Buyer"} 👋
          </span>
          <div className="bd-topbar-search">
            <span>🔍</span>
            <input placeholder="Search…" readOnly onClick={() => setTab("Saved Listings")} />
          </div>
        </div>

        <div className="bd-topbar-right">
          <button onClick={() => openVetRequest()}>🩺 Request Vet Certificate</button>
          <button
            className="bd-topbar-btn bd-topbar-btn-ghost"
            onClick={() => navigate("/marketplace")}
          >
            🐄 Browse Market
          </button>
          <button
            className="bd-topbar-btn bd-topbar-btn-primary"
            onClick={() => { setTab("Transport"); setShowTransportModal(true); }}
          >
            🚛 Request Transport
          </button>
          {totalUnread > 0 && (
            <button
              className="bd-topbar-icon-btn"
              onClick={() => setTab("Messages")}
            >
              💬
              <span className="bd-topbar-notif">{totalUnread}</span>
            </button>
          )}
          <div
            className="bd-topbar-avatar"
            onClick={() => setProfileOpen(true)}
            title="Profile"
          >
            {(user?.displayName || user?.email || "B").charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── SHELL: sidebar + main ── */}
      <div className="bd-shell">

        {/* ── SIDEBAR ── */}
        <aside className="bd-sidebar">
          <div className="bd-sidebar-section">Main</div>
          {TABS.map((t) => {
            const badgeCount =
              t.id === "Messages" ? totalUnread
              : t.id === "Transport" && transportOrders.some((r) => r.status === "quoted") ? 1
              : t.id === "Invoices" ? overdueInvoices.length + transportQuotes.filter((q) => q.status === "new").length
              : 0;
            return (
              <button
                key={t.id}
                className={`bd-sidebar-item ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <i>{t.icon}</i>
                {t.label}
                {badgeCount > 0 && (
                  <span className={`bd-sidebar-badge ${t.id === "Transport" ? "bd-sidebar-badge-warn" : ""}`}>
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}

          <div className="bd-sidebar-divider" />
          <div className="bd-sidebar-section">Quick Actions</div>
          <button className="bd-sidebar-item" onClick={() => navigate("/marketplace")}>
            <i>🏪</i> Marketplace
          </button>
          <button className="bd-sidebar-item" onClick={() => { setTab("Transport"); setShowTransportModal(true); }}>
            <i>🚛</i> New Transport
          </button>

          <div className="bd-sidebar-bottom">
            <button className="bd-sidebar-item" onClick={() => setProfileOpen(true)}>
              <i>👤</i> Profile
            </button>
            <button className="bd-sidebar-item" onClick={() => navigate("/marketplace")}>
              <i>←</i> Back to Market
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="bd-main">

          {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
          {activeTab === "Overview" && (
            <>
              <div className="bd-page-bar">
                <div>
                  <div className="bd-page-bar-title">Overview</div>
                  <div className="bd-page-bar-sub">Your activity at a glance</div>
                </div>
              </div>
              <div className="bd-content">

                {/* KPI row */}
                <div className="bd-kpi-row">
                  {kpis.map((k) => (
                    <div key={k.label} className="bd-kpi">
                      <div className="bd-kpi-icon" style={{ background: k.iconBg }}>
                        {k.icon}
                      </div>
                      <div>
                        <div className="bd-kpi-val">{k.value}</div>
                        <div className="bd-kpi-lbl">{k.label}</div>
                        <div className={`bd-kpi-delta bd-kpi-delta-${k.type}`}>{k.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Insight banner */}
                <div className="bd-insight-banner">
                  <div className="bd-insight-icon">🤖</div>
                  <div style={{ flex: 1 }}>
                    <div className="bd-insight-title">
                      AI Market Briefing
                      <span className="bd-insight-ai-tag">Powered by AI</span>
                    </div>
                    {insightsLoading ? (
                      <div className="bd-insight-loading">
                        <Spinner /> Analysing your activity…
                      </div>
                    ) : buyerInsights ? (
                      <>
                        <div className="bd-insight-text">
                          <strong>{buyerInsights.headline}</strong> — {buyerInsights.insight}
                        </div>
                        <div className="bd-insight-chips">
                          {buyerInsights.marketTip && (
                            <span className="bd-insight-chip">💡 {buyerInsights.marketTip}</span>
                          )}
                          {buyerInsights.bestTimeToBuy && (
                            <span className="bd-insight-chip">📅 {buyerInsights.bestTimeToBuy}</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="bd-insight-text" style={{ color: "var(--z-gray-500)" }}>
                        Insight will appear once your data loads.
                      </div>
                    )}
                  </div>
                </div>

                {/* Two-col: saved + recent orders */}
                <div className="bd-two-col">
                  {/* Saved listings */}
                  <div className="bd-card">
                    <div className="bd-card-head">
                      <span className="bd-card-head-title"><i>❤️</i> Saved Listings</span>
                      <button className="bd-link" onClick={() => setTab("Saved Listings")}>View all →</button>
                    </div>
                    {savedLoading ? <Spinner /> : savedListings.length === 0 ? (
                      <EmptyState emoji="🐾" text="No saved listings yet." cta="Browse Animals" onCta={() => navigate("/marketplace")} />
                    ) : (
                      <table className="bd-table">
                        <tbody>
                          {savedListings.slice(0, 5).map((l) => (
                            <tr key={l.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/listings/${l.id}`)}>
                              <td style={{ width: 32 }}>{l.emoji}</td>
                              <td>
                                <div className="bd-table-title">{l.title}</div>
                                <div className="bd-table-sub">📍 {l.city || l.province || "Zimbabwe"}</div>
                              </td>
                              <td className="bd-amount" style={{ textAlign: "right" }}>
                                ${formatAmount(l.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Recent orders */}
                  <div className="bd-card">
                    <div className="bd-card-head">
                      <span className="bd-card-head-title"><i>📦</i> Recent Orders</span>
                      <button className="bd-link" onClick={() => setTab("My Orders")}>View all →</button>
                    </div>
                    {ordersLoading ? <Spinner /> : orders.length === 0 ? (
                      <EmptyState emoji="📦" text="No orders yet." cta="Browse Animals" onCta={() => navigate("/marketplace")} />
                    ) : (
                      <table className="bd-table">
                        <tbody>
                          {orders.slice(0, 5).map((o) => {
                            const meta = STATUS_META[o.status] || STATUS_META.pending;
                            return (
                              <tr key={o.id}>
                                <td>
                                  <div className="bd-table-title">{o.listingTitle || o.listing || "Order"}</div>
                                  <div className="bd-table-sub">{o.sellerName || "Seller"} · {formatDate(o.createdAt)}</div>
                                </td>
                                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                  <span className="bd-amount" style={{ marginRight: 8 }}>
                                    ${formatAmount(o.totalAmount || o.amount)}
                                  </span>
                                  <span className={`bd-pill ${meta.cls}`}>{meta.icon} {meta.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Transport preview */}
                {transportOrders.length > 0 && (
                  <div className="bd-card">
                    <div className="bd-card-head">
                      <span className="bd-card-head-title"><i>🚛</i> Transport Requests</span>
                      <button className="bd-link" onClick={() => setTab("Transport")}>View all →</button>
                    </div>
                    <table className="bd-table">
                      <tbody>
                        {transportOrders.slice(0, 3).map((r) => (
                          <tr key={r.id}>
                            <td style={{ width: 32 }}>🚛</td>
                            <td>
                              <div className="bd-table-title">{r.quantity}× {r.animalType}</div>
                              <div className="bd-table-sub">
                                {r.pickupTown || r.pickupProvince} → {r.dropTown || r.dropProvince || "TBD"}
                              </div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <span className={`bd-pill ${r.status === "quoted" ? "bd-pill-confirmed" : r.status === "completed" ? "bd-pill-completed" : "bd-pill-pending"}`}>
                                {r.status === "quoted" ? "Quoted ✉" : r.status === "completed" ? "Done ✅" : "Seeking ⏳"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Recent messages */}
                {conversations.length > 0 && (
                  <div className="bd-card">
                    <div className="bd-card-head">
                      <span className="bd-card-head-title"><i>💬</i> Recent Messages</span>
                      <button className="bd-link" onClick={() => setTab("Messages")}>View all →</button>
                    </div>
                    <div className="bd-activity">
                      {conversations.slice(0, 4).map((c) => {
                        const otherUid  = c.participantIds?.find((id) => id !== user?.uid);
                        const otherName = c.participantNames?.[otherUid] || "User";
                        const unread    = c.unreadCount?.[user?.uid] || 0;
                        return (
                          <div
                            key={c.id}
                            className="bd-activity-row"
                            style={{ cursor: "pointer" }}
                            onClick={() => { setActiveConvo(c); setTab("Messages"); }}
                          >
                            <div className="bd-msg-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                              {initials(otherName)}
                            </div>
                            <div className="bd-activity-info">
                              <div className="bd-activity-label">{otherName}</div>
                              <div className="bd-activity-sub">{c.lastMessage || "No messages yet"}</div>
                            </div>
                            {unread > 0 && (
                              <span className="bd-sidebar-badge" style={{ marginLeft: "auto" }}>{unread}</span>
                            )}
                            <div className="bd-activity-time">{formatDate(c.lastMessageAt)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══ SAVED LISTINGS ══════════════════════════════════════════════ */}
          {activeTab === "Saved Listings" && (
            <>
              <div className="bd-page-bar">
                <div>
                  <div className="bd-page-bar-title">❤️ Saved Listings</div>
                  <div className="bd-page-bar-sub">{savedListings.length} listing{savedListings.length !== 1 ? "s" : ""} saved</div>
                </div>
                <div className="bd-page-bar-actions">
                  <button className="bd-topbar-btn bd-topbar-btn-primary" onClick={() => navigate("/marketplace")}>
                    + Find More
                  </button>
                </div>
              </div>
              <div className="bd-content">
                <div className="bd-card">
                  <div className="bd-toolbar">
                    <input
                      className="bd-search-input"
                      type="text"
                      placeholder="🔍 Search saved listings…"
                      value={savedSearch}
                      onChange={(e) => setSavedSearch(e.target.value)}
                    />
                  </div>
                  {savedLoading ? <Spinner /> : filteredSaved.length === 0 ? (
                    <EmptyState emoji="🐾" text={savedSearch ? "No results found." : "No saved listings yet."} cta="Browse Animals" onCta={() => navigate("/marketplace")} />
                  ) : (
                    <div className="bd-saved-grid" style={{ padding: 14 }}>
                      {filteredSaved.map((l) => (
                        <div key={l.id} className="bd-saved-card">
                          <div className="bd-sc-thumb">
                            {l.photos?.[0]?.url ? (
                              <img src={l.photos[0].url} alt={l.title} />
                            ) : (
                              <span>{l.emoji}</span>
                            )}
                            <span className={`bd-pill bd-sc-badge ${l.vaccinated ? "bd-pill-confirmed" : "bd-pill-pending"}`}>
                              {l.vaccinated ? "Vaccinated" : l.condition || "Listed"}
                            </span>
                          </div>
                          <div className="bd-sc-info">
                            <h3>{l.title}</h3>
                            <div className="bd-sc-tags">
                              {l.breed  && <span>🏷 {l.breed}</span>}
                              {l.age    && <span>📅 {l.age}</span>}
                              {l.weight && <span>⚖️ {l.weight}</span>}
                            </div>
                            {/* AI Price Badge */}
                            {priceCheckLoading[l.id] ? (
                              <div className="bd-ai-price-loading">🤖 Checking price…</div>
                            ) : priceChecks[l.id] ? (
                              <div className={`bd-ai-price-badge bd-ai-price-${priceChecks[l.id].verdict}`}>
                                <span style={{ fontWeight: 700, fontSize: 15 }}>
                                  {priceChecks[l.id].verdict === "good_deal" ? "↓" : priceChecks[l.id].verdict === "overpriced" ? "↑" : "→"}
                                </span>
                                <div>
                                  <div className="bd-ai-price-verdict">
                                    {priceChecks[l.id].verdict === "good_deal" ? "Great Deal" : priceChecks[l.id].verdict === "overpriced" ? "Overpriced" : "Fair Price"}
                                  </div>
                                  <div className="bd-ai-price-explanation">{priceChecks[l.id].explanation}</div>
                                  <div className="bd-ai-price-range">Market: {priceChecks[l.id].marketRange}</div>
                                </div>
                              </div>
                            ) : null}
                            <div className="bd-sc-footer">
                              <div>
                                <strong className="bd-sc-price">{l.currency || "USD"} {formatAmount(l.price)}</strong>
                                <span className="bd-sc-unit"> {l.pricePerHead ? "/ head" : "/ lot"}</span>
                              </div>
                              <span className="bd-sc-loc">📍 {l.city || l.province || "Zimbabwe"}</span>
                            </div>
                          </div>
                          <div className="bd-sc-actions">
                            <button className="bd-btn-sm bd-btn-sm-primary" onClick={() => navigate(`/listings/${l.id}`)}>
                              View
                            </button>
                            {l.sellerId && (
                              <button className="bd-btn-sm bd-btn-sm-primary" style={{ background: "var(--z-green-light)", color: "var(--z-green-text)" }}
                                onClick={() => startConversation(l.sellerId, l.sellerName || "Seller", "seller", `Inquiry about ${l.title}`)}>
                                💬 Chat
                              </button>
                            )}
                            <button className="bd-btn-sm bd-btn-sm-danger" onClick={() => unsaveListing(l.id)}>🤍 Unsave</button>
                            <button className="bd-btn-sm bd-btn-sm-amber"
                              onClick={() => {
                                setTransportForm((f) => ({ ...f, animalType: l.categoryId || "", quantity: "1" }));
                                setTab("Transport"); setShowTransportModal(true);
                              }}>
                              🚛
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

          {/* ══ MY ORDERS ══════════════════════════════════════════════════ */}
          {activeTab === "My Orders" && (
            <>
              <div className="bd-page-bar">
                <div>
                  <div className="bd-page-bar-title">📦 My Orders</div>
                  <div className="bd-page-bar-sub">{orders.length} order{orders.length !== 1 ? "s" : ""} total</div>
                </div>
              </div>
              <div className="bd-content">
                <div className="bd-card">
                  <div className="bd-filter-tabs">
                    {["all", "pending", "confirmed", "completed", "cancelled"].map((f) => (
                      <button
                        key={f}
                        className={`bd-filter-tab ${orderFilter === f ? "active" : ""}`}
                        onClick={() => setOrderFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        <span className="bd-filter-count">
                          {f === "all" ? orders.length : orders.filter((o) => o.status === f).length}
                        </span>
                      </button>
                    ))}
                  </div>

                  {ordersLoading ? <Spinner /> : filteredOrders.length === 0 ? (
                    <EmptyState emoji="📦" text={`No ${orderFilter === "all" ? "" : orderFilter + " "}orders found.`} />
                  ) : (
                    <table className="bd-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Seller</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => {
                          const meta = STATUS_META[order.status] || STATUS_META.pending;
                          return (
                            <tr key={order.id}>
                              <td>
                                <div className="bd-table-title">{order.listingTitle || order.listing || "Order"}</div>
                                <div className="bd-table-sub">#{order.id?.slice(-8).toUpperCase()} · Qty: {order.qty || order.quantity || "—"}</div>
                              </td>
                              <td>
                                <div className="bd-table-title">{order.sellerName || order.seller || "—"}</div>
                                <div className="bd-table-sub">📍 {order.location || order.sellerCity || "—"}</div>
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>{formatDate(order.createdAt)}</td>
                              <td><span className="bd-amount">${formatAmount(order.totalAmount || order.amount)}</span></td>
                              <td><span className={`bd-pill ${meta.cls}`}>{meta.icon} {meta.label}</span></td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                {order.sellerId && (
                                  <button
                                    className="bd-btn-sm bd-btn-sm-primary"
                                    onClick={() => startConversation(order.sellerId, order.sellerName || "Seller", "seller", `Order #${order.id?.slice(-8).toUpperCase()}`)}
                                  >
                                    💬 Message
                                  </button>
                                )}
                                {order.status === "confirmed" && (
                                  <button
                                    className="bd-btn-sm bd-btn-sm-amber"
                                    style={{ marginLeft: 4 }}
                                    onClick={() => {
                                      setTransportForm((f) => ({ ...f, animalType: order.categoryId || "", quantity: String(order.qty || 1), pickupTown: order.location || "" }));
                                      setTab("Transport"); setShowTransportModal(true);
                                    }}
                                  >
                                    🚛 Transport
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══ TRANSPORT ══════════════════════════════════════════════════ */}
          {activeTab === "Transport" && (
            <>
              <div className="bd-page-bar">
                <div>
                  <div className="bd-page-bar-title">🚛 Transport Requests</div>
                  <div className="bd-page-bar-sub">Drivers in your pickup province are notified instantly</div>
                </div>
                <div className="bd-page-bar-actions">
                  <button className="bd-topbar-btn bd-topbar-btn-primary" onClick={() => setShowTransportModal(true)}>
                    + New Request
                  </button>
                </div>
              </div>
              <div className="bd-content">
                {transportLoading ? <Spinner /> : transportOrders.length === 0 ? (
                  <div className="bd-transport-empty">
                    <div className="bd-transport-empty-icon">🚛</div>
                    <h3>No transport requests yet</h3>
                    <p>Request livestock transport and get quotes from verified drivers nearby.</p>
                    <button className="bd-topbar-btn bd-topbar-btn-primary" onClick={() => setShowTransportModal(true)}>
                      Request Transport Now
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {transportOrders.map((r) => (
                      <div key={r.id} className="bd-tr-card">
                        <div className="bd-tr-icon">🚛</div>
                        <div className="bd-tr-info">
                          <div className="bd-tr-title">{r.quantity}× {r.animalType}</div>
                          <div className="bd-tr-route">
                            <span>📍 {r.pickupTown || r.pickupProvince}</span>
                            <span className="bd-tr-arrow">→</span>
                            <span>📍 {r.dropTown || r.dropProvince || "TBD"}</span>
                          </div>
                          <div className="bd-tr-meta">
                            {r.preferredDate && <span>📅 {r.preferredDate}</span>}
                            {r.contactPhone  && <span>📞 {r.contactPhone}</span>}
                          </div>
                          {r.notes && <div className="bd-tr-notes">"{r.notes}"</div>}
                        </div>
                        <div className="bd-tr-side">
                          <span className={`bd-pill ${r.status === "quoted" ? "bd-pill-confirmed" : r.status === "completed" ? "bd-pill-completed" : "bd-pill-pending"}`}>
                            {r.status === "quoted" ? "✉ Quoted" : r.status === "completed" ? "✅ Done" : "⏳ Seeking"}
                          </span>
                          <span className="bd-tr-date">{formatDate(r.createdAt)}</span>
                          {r.driverUid && (
                            <button
                              className="bd-btn-sm bd-btn-sm-primary"
                              onClick={() => startConversation(r.driverUid, r.driverName || "Driver", "transporter", `Transport job: ${r.quantity}× ${r.animalType}`)}
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
            </>
          )}

          {/* ══ INVOICES ════════════════════════════════════════════════════ */}
          {activeTab === "Invoices" && (
            <>
              <div className="bd-page-bar">
                <div>
                  <div className="bd-page-bar-title">📄 Invoices & Quotes</div>
                  <div className="bd-page-bar-sub">Track payments and transport quotes</div>
                </div>
              </div>
              <div className="bd-content">

                {/* Summary KPI row */}
                <div className="bd-kpi-row">
                  {[
                    { icon: "📄", label: "Outstanding",  value: `$${formatAmount(outstandingTotal)}`, iconBg: "#fef3c7" },
                    { icon: "🚛", label: "New Quotes",   value: String(transportQuotes.filter((q) => q.status === "new").length), iconBg: "#e8f1fb" },
                    { icon: "⚠️", label: "Overdue",      value: String(overdueInvoices.length), iconBg: "#fdecea" },
                    { icon: "✅", label: "Paid to Date", value: `$${formatAmount(invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0))}`, iconBg: "#eaf5ef" },
                  ].map((k) => (
                    <div key={k.label} className="bd-kpi">
                      <div className="bd-kpi-icon" style={{ background: k.iconBg }}>{k.icon}</div>
                      <div>
                        <div className="bd-kpi-val">{k.value}</div>
                        <div className="bd-kpi-lbl">{k.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI overdue alert */}
                {overdueInvoices.length > 0 && (
                  <div className="bd-insight-banner" style={{ borderColor: "#f5c6c2", background: "linear-gradient(135deg,#fdecea,#fff5f4)" }}>
                    <div className="bd-insight-icon">⚠️</div>
                    <div>
                      <div className="bd-insight-title">Payment Reminder <span className="bd-insight-ai-tag">AI</span></div>
                      <div className="bd-insight-text">
                        You have {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""} totalling{" "}
                        ${formatAmount(overdueInvoices.reduce((s, i) => s + Number(i.amount || 0), 0))}.
                        Late payments may affect your seller relationships.
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter bar */}
                <div className="bd-card">
                  <div className="bd-toolbar">
                    <input
                      className="bd-search-input"
                      placeholder="🔍 Search invoices and quotes…"
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                    />
                  </div>
                  <div className="bd-filter-tabs">
                    {["all", "invoice", "quote", "overdue", "paid"].map((f) => (
                      <button
                        key={f}
                        className={`bd-filter-tab ${invoiceFilter === f ? "active" : ""}`}
                        onClick={() => setInvoiceFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>

                  {invoicesLoading || quotesLoading ? <Spinner /> : filteredInvoiceItems.length === 0 ? (
                    <EmptyState emoji="📄" text="No invoices or quotes yet." />
                  ) : (
                    <table className="bd-table">
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>From</th>
                          <th>Details</th>
                          <th>Due / Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvoiceItems.map((item) =>
                          item._kind === "invoice" ? (
                            <InvoiceRow
                              key={item.id}
                              invoice={item}
                              onChat={() => startConversation(item.sellerId, item.sellerName || "Seller", "seller", `Invoice ${item.invoiceNumber}`)}
                            />
                          ) : (
                            <QuoteRow
                              key={item.id}
                              quote={item}
                              onChat={() => startConversation(item.driverUid, item.driverName || "Driver", "transporter", "Transport quote")}
                              onAccept={async () => {
                                await updateDoc(doc(db, "transport_quotes", item.id), { status: "accepted" });
                              }}
                            />
                          )
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══ MESSAGES ════════════════════════════════════════════════════ */}
          {activeTab === "Messages" && (
            <>
              <div className="bd-page-bar">
                <div>
                  <div className="bd-page-bar-title">💬 Messages</div>
                  <div className="bd-page-bar-sub">{totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}</div>
                </div>
              </div>
              <div className="bd-content bd-pane-msg" style={{ padding: "0 22px 80px" }}>
                <div className="bd-msg-layout">
                  {/* Sidebar */}
                  <div className={`bd-msg-sidebar ${activeConvo ? "bd-msg-sidebar-hidden-mobile" : ""}`}>
                    <div className="bd-msg-sidebar-head">
                      Conversations
                      {totalUnread > 0 && <span className="bd-sidebar-badge">{totalUnread}</span>}
                    </div>
                    {convoLoading ? <Spinner /> : conversations.length === 0 ? (
                      <div className="bd-msg-empty-sidebar">
                        <p>No conversations yet.</p>
                        <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>Start a chat from a listing or an order.</p>
                      </div>
                    ) : conversations.map((c) => {
                      const otherUid  = c.participantIds?.find((id) => id !== user?.uid);
                      const otherName = c.participantNames?.[otherUid] || "User";
                      const otherRole = c.participantRoles?.[otherUid] || "";
                      const unread    = c.unreadCount?.[user?.uid] || 0;
                      const roleIcon  = otherRole === "transporter" ? "🚛" : otherRole === "seller" ? "🏪" : "👤";
                      return (
                        <div
                          key={c.id}
                          className={`bd-msg-thread ${activeConvo?.id === c.id ? "active" : ""}`}
                          onClick={() => setActiveConvo(c)}
                        >
                          <div className="bd-msg-avatar">{initials(otherName)}</div>
                          <div className="bd-msg-thread-info">
                            <div className="bd-msg-thread-name">
                              {roleIcon} {otherName}
                              {unread > 0 && <span className="bd-sidebar-badge">{unread}</span>}
                            </div>
                            <div className="bd-msg-thread-preview">{c.lastMessage || "No messages yet"}</div>
                            <div className="bd-msg-thread-time">{formatDate(c.lastMessageAt)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chat panel */}
                  <div className={`bd-msg-main ${!activeConvo ? "bd-msg-main-hidden-mobile" : ""}`}>
                    {activeConvo ? (
                      <>
                        <div className="bd-msg-head">
                          <button className="bd-msg-back" onClick={() => setActiveConvo(null)}>← Back</button>
                          <div className="bd-msg-avatar bd-msg-avatar-lg">
                            {initials(activeConvo.participantNames?.[activeConvo.participantIds?.find((id) => id !== user?.uid)] || "?")}
                          </div>
                          <div>
                            <div className="bd-msg-head-name">
                              {activeConvo.participantNames?.[activeConvo.participantIds?.find((id) => id !== user?.uid)] || "User"}
                            </div>
                            <div className="bd-msg-head-sub">
                              {activeConvo.participantRoles?.[activeConvo.participantIds?.find((id) => id !== user?.uid)] === "transporter"
                                ? "🚛 Transporter" : "🏪 Seller"}
                              {activeConvo.context ? ` · ${activeConvo.context}` : ""}
                            </div>
                          </div>
                        </div>

                        <div className="bd-msg-body" ref={msgBodyRef}>
                          {convoMessages.length === 0 && <div className="bd-msg-empty">Send the first message!</div>}
                          {convoMessages.map((msg) => (
                            <div key={msg.id} className={`bd-bubble ${msg.senderId === user?.uid ? "sent" : "recv"}`}>
                              {msg.senderId !== user?.uid && <div className="bd-bubble-sender">{msg.senderName}</div>}
                              {msg.text}
                              <div className="bd-bubble-time">{formatTime(msg.createdAt)}</div>
                            </div>
                          ))}
                        </div>

                        {(suggestionsLoading || replySuggestions.length > 0) && (
                          <div className="bd-reply-suggestions">
                            {suggestionsLoading ? (
                              <span className="bd-rs-loading">🤖 Thinking…</span>
                            ) : (
                              replySuggestions.map((s, i) => (
                                <button key={i} className="bd-rs-chip" onClick={() => { setMsgInput(s); setReplySuggestions([]); }}>
                                  {s}
                                </button>
                              ))
                            )}
                          </div>
                        )}

                        <div className="bd-msg-input-row">
                          <textarea
                            className="bd-msg-input"
                            rows={1}
                            placeholder="Type a message…"
                            value={msgInput}
                            onChange={(e) => setMsgInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          />
                          <button className="bd-msg-send" onClick={sendMessage} disabled={msgSending}>
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
            </>
          )}

        </main>
      </div>
    {vetRequestModal}
      {/* ══ TRANSPORT MODAL ════════════════════════════════════════════════ */}
      {showTransportModal && (
        <div
          className="bd-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowTransportModal(false); }}
        >
          <div className="bd-modal">
            <div className="bd-modal-head">
              <div>
                <h2>🚛 Request Livestock Transport</h2>
                <p>Drivers matching your pickup location will be notified immediately.</p>
              </div>
              <button className="bd-modal-close" onClick={() => setShowTransportModal(false)}>✕</button>
            </div>

            {transportSuccess ? (
              <div className="bd-transport-success">
                <div className="bd-ts-icon">✅</div>
                <h3>Request Sent!</h3>
                <p>
                  Transport providers near <strong>{successArea || "your pickup area"}</strong> have been notified. You'll receive quotes shortly.
                </p>
              </div>
            ) : (
              <form className="bd-transport-form" onSubmit={handleTransportSubmit}>
                <div className="bd-form-section">
                  <div className="bd-form-section-label">Animal Details</div>
                  <div className="bd-form-row">
                    <div className="bd-form-group">
                      <label>Animal Type *</label>
                      <select required value={transportForm.animalType}
                        onChange={(e) => setTransportForm((f) => ({ ...f, animalType: e.target.value }))}>
                        <option value="">Select type…</option>
                        {["Cattle", "Goats", "Sheep", "Pigs", "Chickens", "Ducks", "Horses", "Other"].map((a) => (
                          <option key={a} value={a.toLowerCase()}>{a}</option>
                        ))}
                      </select>
                    </div>
                    <div className="bd-form-group">
                      <label>Quantity *</label>
                      <input type="number" min="1" required placeholder="e.g. 10"
                        value={transportForm.quantity}
                        onChange={(e) => setTransportForm((f) => ({ ...f, quantity: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="bd-form-section">
                  <div className="bd-form-section-label">📍 Pickup Location *</div>
                  <div className="bd-form-row">
                    <div className="bd-form-group">
                      <label>Province *</label>
                      <select required value={transportForm.pickupProvince}
                        onChange={(e) => setTransportForm((f) => ({ ...f, pickupProvince: e.target.value }))}>
                        <option value="">Select province…</option>
                        {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="bd-form-group">
                      <label>Town / Farm</label>
                      <input type="text" placeholder="e.g. Marondera" value={transportForm.pickupTown}
                        onChange={(e) => setTransportForm((f) => ({ ...f, pickupTown: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="bd-form-section">
                  <div className="bd-form-section-label">📍 Drop-off Location</div>
                  <div className="bd-form-row">
                    <div className="bd-form-group">
                      <label>Province</label>
                      <select value={transportForm.dropProvince}
                        onChange={(e) => setTransportForm((f) => ({ ...f, dropProvince: e.target.value }))}>
                        <option value="">Select province…</option>
                        {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="bd-form-group">
                      <label>Town / Address</label>
                      <input type="text" placeholder="e.g. Harare CBD" value={transportForm.dropTown}
                        onChange={(e) => setTransportForm((f) => ({ ...f, dropTown: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="bd-form-row">
                  <div className="bd-form-group">
                    <label>Preferred Date</label>
                    <input type="date" value={transportForm.preferredDate}
                      onChange={(e) => setTransportForm((f) => ({ ...f, preferredDate: e.target.value }))} />
                  </div>
                  <div className="bd-form-group">
                    <label>Contact Phone</label>
                    <input type="tel" placeholder="+263 7X XXX XXXX" value={transportForm.contactPhone}
                      onChange={(e) => setTransportForm((f) => ({ ...f, contactPhone: e.target.value }))} />
                  </div>
                </div>

                <div className="bd-form-group">
                  <label>Additional Notes</label>
                  <textarea rows={3}
                    placeholder="e.g. Animals need water stops, fragile livestock, special crates needed…"
                    value={transportForm.notes}
                    onChange={(e) => setTransportForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>

                {(estimateLoading || transportEstimate) && (
                  <div className="bd-transport-estimate">
                    {estimateLoading ? (
                      <div className="bd-te-loading">🤖 Estimating cost…</div>
                    ) : transportEstimate ? (
                      <>
                        <div className="bd-te-header">
                          <span>🤖 AI Cost Estimate</span>
                          <strong className="bd-te-range">
                            {transportEstimate.currency} {transportEstimate.estimateLow}–{transportEstimate.estimateHigh}
                          </strong>
                        </div>
                        <p className="bd-te-basis">{transportEstimate.basis}</p>
                        {transportEstimate.tips?.map((tip, i) => (
                          <div key={i} className="bd-te-tip">💡 {tip}</div>
                        ))}
                      </>
                    ) : null}
                  </div>
                )}

                <div className="bd-modal-actions">
                  <button type="button" className="bd-btn-cancel" onClick={() => setShowTransportModal(false)}>Cancel</button>
                  <button type="submit" className="bd-btn-submit" disabled={transportSubmitting}>
                    {transportSubmitting ? "Sending…" : "🚛 Send to Nearby Drivers"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ProfileSheet isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="bd-bottom-nav">
        <div className="bd-bottom-nav-inner">
          <button
            className={`bd-bottom-nav-item ${activeTab === "Overview" ? "active" : ""}`}
            onClick={() => setTab("Overview")}
          >
            <i>◈</i><span>Overview</span>
          </button>
          <button
            className={`bd-bottom-nav-item ${activeTab === "My Orders" ? "active" : ""}`}
            onClick={() => setTab("My Orders")}
          >
            <i>📦</i><span>Orders</span>
          </button>
          <button className="bd-bottom-nav-post" onClick={() => navigate("/marketplace")}>+</button>
          <button
            className={`bd-bottom-nav-item ${activeTab === "Messages" ? "active" : ""}`}
            onClick={() => setTab("Messages")}
          >
            <i>💬</i><span>Messages</span>
          </button>
          <button className="bd-bottom-nav-item" onClick={() => setProfileOpen(true)}>
            <i>👤</i><span>Profile</span>
          </button>
        </div>
      </nav>
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

function InvoiceRow({ invoice, onChat }) {
  const isOverdue = invoice.status !== "paid" && invoice.dueDate &&
    (invoice.dueDate.toDate?.() ?? new Date(invoice.dueDate)) < new Date();
  const displayStatus = isOverdue ? "overdue" : invoice.status;
  const meta = {
    overdue: { label: "Overdue", cls: "bd-pill-cancelled", icon: "⚠" },
    pending: { label: "Pending", cls: "bd-pill-pending",   icon: "⏳" },
    paid:    { label: "Paid",    cls: "bd-pill-completed", icon: "✅" },
  };
  const s = meta[displayStatus] || meta.pending;
  return (
    <tr>
      <td>
        <div className="bd-table-title" style={{ fontFamily: "monospace" }}>
          📄 {invoice.invoiceNumber || `INV-${invoice.id?.slice(-6).toUpperCase()}`}
        </div>
      </td>
      <td>{invoice.sellerName || "—"}</td>
      <td>{invoice.title || invoice.description || "—"}</td>
      <td style={{ whiteSpace: "nowrap" }}>{formatDate(invoice.dueDate)}</td>
      <td><span className="bd-amount">${formatAmount(invoice.amount)}</span></td>
      <td><span className={`bd-pill ${s.cls}`}>{s.icon} {s.label}</span></td>
      <td style={{ whiteSpace: "nowrap" }}>
        {invoice.status !== "paid" && (
          <button className="bd-btn-sm bd-btn-sm-primary" style={{ marginRight: 4 }}>💳 Pay</button>
        )}
        <button className="bd-btn-sm" onClick={onChat}>💬</button>
        {invoice.pdfUrl && (
          <a className="bd-btn-sm" href={invoice.pdfUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 4, display: "inline-block" }}>⬇</a>
        )}
      </td>
    </tr>
  );
}

function QuoteRow({ quote, onChat, onAccept }) {
  return (
    <tr>
      <td>
        <div className="bd-table-title">🚛 Transport Quote</div>
        <div className="bd-table-sub">{quote.driverName || "—"}</div>
      </td>
      <td>{quote.driverName || "—"}</td>
      <td>
        <div className="bd-table-sub">
          {quote.pickupTown || quote.pickupProvince} → {quote.dropTown || quote.dropProvince || "TBD"}
        </div>
        <div className="bd-table-sub">{quote.quantity}× {quote.animalType}</div>
      </td>
      <td style={{ whiteSpace: "nowrap" }}>{formatDate(quote.createdAt)}</td>
      <td><span className="bd-amount">${formatAmount(quote.amount)}</span></td>
      <td>
        <span className={`bd-pill ${quote.status === "accepted" ? "bd-pill-completed" : "bd-pill-confirmed"}`}>
          {quote.status === "accepted" ? "✅ Accepted" : "✉ New Quote"}
        </span>
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        {quote.status !== "accepted" && (
          <button className="bd-btn-sm bd-btn-sm-primary" style={{ marginRight: 4 }} onClick={onAccept}>✅ Accept</button>
        )}
        <button className="bd-btn-sm" onClick={onChat}>💬</button>
      </td>
    </tr>
  );
}

function EmptyState({ emoji, text, cta, onCta }) {
  return (
    <div className="bd-empty">
      <span className="bd-empty-emoji">{emoji}</span>
      <p>{text}</p>
      {cta && (
        <button className="bd-topbar-btn bd-topbar-btn-primary" onClick={onCta} style={{ marginTop: 8 }}>
          {cta}
        </button>
      )}
    </div>
  );
}