import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import useAuthStore from "../store/useAuthStore";
import UserMenu from "../components/UserMenu";
import ProfileSheet from "../components/ProfileSheet";
import { TemplateSelector, CertificateViewerModal } from "../components/CertificateTemplates";
import "./VetDashboard.css";
// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

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

const ANIMAL_TYPES = [
  "Cattle",
  "Goats",
  "Sheep",
  "Pigs",
  "Chickens",
  "Horses",
  "Donkeys",
  "Other",
];

const CERT_TYPES = [
  { id: "movement", label: "Movement Permit", icon: "🚚" },
  { id: "health", label: "Health Certificate", icon: "💉" },
  { id: "vaccination", label: "Vaccination Record", icon: "🩺" },
  { id: "inspection", label: "Pre-Sale Inspection", icon: "🔍" },
  { id: "slaughter", label: "Fit-for-Slaughter", icon: "✅" },
];

const REQUEST_STATUS_META = {
  pending: { label: "Pending", cls: "vd-pill-pending", icon: "⏳" },
  scheduled: { label: "Scheduled", cls: "vd-pill-scheduled", icon: "📅" },
  completed: { label: "Completed", cls: "vd-pill-completed", icon: "✅" },
  rejected: { label: "Rejected", cls: "vd-pill-rejected", icon: "✕" },
};

const TABS = [
  { id: "Overview", icon: "◈", label: "Overview" },
  { id: "Requests", icon: "📋", label: "Cert Requests" },
  { id: "Certificates", icon: "📜", label: "My Certs" },
  { id: "Schedule", icon: "📅", label: "Schedule" },
  { id: "Messages", icon: "💬", label: "Messages" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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

function getCertIcon(type) {
  return CERT_TYPES.find((c) => c.id === type)?.icon || "📄";
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function VetDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");
  const [profileOpen, setProfileOpen] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [certRequests, setCertRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [issuedCerts, setIssuedCerts] = useState([]);
  const [certsLoading, setCertsLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [convoLoading, setConvoLoading] = useState(true);
  const [activeConvo, setActiveConvo] = useState(null);
  const [convoMessages, setConvoMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const msgBodyRef = useRef(null);
  const msgUnsubRef = useRef(null);

  // ── Issue cert modal ──────────────────────────────────────────────────────
  const [issueModal, setIssueModal] = useState(null); // holds the request object
  const [issueForm, setIssueForm] = useState({
    notes: "",
    validUntil: "",
    certNumber: "",
  });
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // ── Schedule modal ────────────────────────────────────────────────────────
  const [schedModal, setSchedModal] = useState(null);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedSubmitting, setSchedSubmitting] = useState(false);
const [viewingCert, setViewingCert] = useState(null);
  // ── Firestore subscriptions ───────────────────────────────────────────────

  // Cert requests assigned to this vet (or all if admin-vet)
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "vet_requests"),
      where("vetId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setCertRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setRequestsLoading(false);
      },
      () => setRequestsLoading(false),
    );
  }, [user?.uid]);

  // Also pull unassigned requests in this vet's province
  const [openRequests, setOpenRequests] = useState([]);
  const [openLoading, setOpenLoading] = useState(true);
  const [vetProfile, setVetProfile] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setVetProfile(snap.data());
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!vetProfile?.province) {
      setOpenLoading(false);
      return;
    }
    const q = query(
      collection(db, "vet_requests"),
      where("province", "==", vetProfile.province),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        const unassigned = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => !r.vetId);
        setOpenRequests(unassigned);
        setOpenLoading(false);
      },
      () => setOpenLoading(false),
    );
  }, [vetProfile?.province]);

  // Issued certificates by this vet
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "vet_certificates"),
      where("vetId", "==", user.uid),
      orderBy("issuedAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setIssuedCerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCertsLoading(false);
      },
      () => setCertsLoading(false),
    );
  }, [user?.uid]);

  // Conversations
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

  // Active conversation messages
  useEffect(() => {
    if (msgUnsubRef.current) {
      msgUnsubRef.current();
      msgUnsubRef.current = null;
    }
    if (!activeConvo?.id) {
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
    updateDoc(doc(db, "conversations", activeConvo.id), {
      [`unreadCount.${user.uid}`]: 0,
    }).catch(() => {});
    return () => {
      if (msgUnsubRef.current) msgUnsubRef.current();
    };
  }, [activeConvo?.id, user?.uid]);

  useEffect(() => {
    if (msgBodyRef.current)
      msgBodyRef.current.scrollTop = msgBodyRef.current.scrollHeight;
  }, [convoMessages]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const pending = certRequests.filter((r) => r.status === "pending");
    const scheduled = certRequests.filter((r) => r.status === "scheduled");
    const completed = certRequests.filter((r) => r.status === "completed");
    const unread = conversations.reduce(
      (n, c) => n + (c.unreadCount?.[user?.uid] || 0),
      0,
    );
    return [
      {
        icon: "📋",
        label: "Pending Requests",
        value: String(pending.length + openRequests.length),
        sub:
          pending.length + openRequests.length > 0
            ? "Action required"
            : "All clear",
        type: pending.length + openRequests.length > 0 ? "warn" : "neutral",
        bg: "#fef3c7",
      },
      {
        icon: "📅",
        label: "Scheduled Today",
        value: String(scheduled.length),
        sub: "Upcoming inspections",
        type: scheduled.length > 0 ? "up" : "neutral",
        bg: "#e8f1fb",
      },
      {
        icon: "📜",
        label: "Certs Issued",
        value: String(issuedCerts.length),
        sub: `${completed.length} this month`,
        type: "up",
        bg: "#eaf5ef",
      },
      {
        icon: "💬",
        label: "Unread Messages",
        value: String(unread),
        sub: unread > 0 ? "New replies" : "All caught up",
        type: unread > 0 ? "warn" : "neutral",
        bg: "#fdecea",
      },
    ];
  }, [certRequests, openRequests, issuedCerts, conversations, user?.uid]);

  const totalUnread = useMemo(
    () =>
      conversations.reduce((n, c) => n + (c.unreadCount?.[user?.uid] || 0), 0),
    [conversations, user?.uid],
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const claimRequest = async (request) => {
    await updateDoc(doc(db, "vet_requests", request.id), {
      vetId: user.uid,
      vetName: user.displayName || user.email,
      status: "scheduled",
      updatedAt: serverTimestamp(),
    });
    // Notify the requester
    await addDoc(collection(db, "notifications"), {
      toUid: request.requesterId,
      type: "vet_assigned",
      vetRequestId: request.id,
      message: `A veterinarian has been assigned to your ${request.certType} request.`,
      createdAt: serverTimestamp(),
      read: false,
    });
  };

  const scheduleInspection = async () => {
    if (!schedModal || !schedDate) return;
    setSchedSubmitting(true);
    try {
      await updateDoc(doc(db, "vet_requests", schedModal.id), {
        scheduledDate: schedDate,
        scheduledTime: schedTime,
        status: "scheduled",
        vetId: user.uid,
        vetName: user.displayName || user.email,
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        toUid: schedModal.requesterId,
        type: "inspection_scheduled",
        vetRequestId: schedModal.id,
        message: `Your ${schedModal.certType} inspection is scheduled for ${schedDate}${schedTime ? " at " + schedTime : ""}.`,
        createdAt: serverTimestamp(),
        read: false,
      });
      setSchedModal(null);
      setSchedDate("");
      setSchedTime("");
    } finally {
      setSchedSubmitting(false);
    }
  };

  const issueCertificate = async () => {
    if (!issueModal) return;
    setIssueSubmitting(true);
    try {
      const certRef = await addDoc(collection(db, "vet_certificates"), {
        vetId: user.uid,
        vetName: user.displayName || user.email,
        requestId: issueModal.id,
        requesterId: issueModal.requesterId,
        requesterName: issueModal.requesterName,
        requesterRole: issueModal.requesterRole,
        certType: issueModal.certType,
        animalType: issueModal.animalType,
        quantity: issueModal.quantity,
        province: issueModal.province,
        notes: issueForm.notes,
        validUntil: issueForm.validUntil,
        certNumber:
          issueForm.certNumber ||
          `ZW-VET-${Date.now().toString(36).toUpperCase()}`,
        issuedAt: serverTimestamp(),
        status: "valid",
      });

      // Mark request as completed
      await updateDoc(doc(db, "vet_requests", issueModal.id), {
        status: "completed",
        certId: certRef.id,
        completedAt: serverTimestamp(),
      });

      // Notify requester
      await addDoc(collection(db, "notifications"), {
        toUid: issueModal.requesterId,
        type: "cert_issued",
        certId: certRef.id,
        vetRequestId: issueModal.id,
        message: `Your ${issueModal.certType} certificate has been issued by ${user.displayName || "your vet"}.`,
        createdAt: serverTimestamp(),
        read: false,
      });

      setIssueModal(null);
      setIssueForm({ notes: "", validUntil: "", certNumber: "" });
    } finally {
      setIssueSubmitting(false);
    }
  };

  const rejectRequest = async (request) => {
    await updateDoc(doc(db, "vet_requests", request.id), {
      status: "rejected",
      updatedAt: serverTimestamp(),
    });
    await addDoc(collection(db, "notifications"), {
      toUid: request.requesterId,
      type: "vet_rejected",
      vetRequestId: request.id,
      message: `Your ${request.certType} request could not be processed at this time. Please contact your local DVS office.`,
      createdAt: serverTimestamp(),
      read: false,
    });
  };

  const sendMessage = useCallback(async () => {
    if (!msgInput.trim() || !activeConvo?.id || msgSending) return;
    const text = msgInput.trim();
    setMsgInput("");
    setMsgSending(true);
    try {
      await addDoc(
        collection(db, "conversations", activeConvo.id, "messages"),
        {
          text,
          senderId: user.uid,
          senderName: user.displayName || user.email,
          senderRole: "vet",
          createdAt: serverTimestamp(),
        },
      );
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
      console.error(err);
    } finally {
      setMsgSending(false);
    }
  }, [msgInput, activeConvo, user, msgSending]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="vd">
      {/* ── TOPBAR ── */}
      <header className="vd-topbar">
        <div className="vd-topbar-brand">
          <div className="vd-topbar-brand-icon">🩺</div>
          <div>
            <div className="vd-topbar-brand-name">Kraal</div>
            <div className="vd-topbar-brand-sub">Vet Portal</div>
          </div>
        </div>

        <div className="vd-topbar-center">
          <span className="vd-topbar-greeting">
            Dr. {user?.displayName?.split(" ")[0] || "Veterinarian"} 👋
          </span>
          {vetProfile?.province && (
            <span className="vd-topbar-province">📍 {vetProfile.province}</span>
          )}
        </div>

        <div className="vd-topbar-right">
          {openRequests.length > 0 && (
            <button
              className="vd-topbar-btn vd-topbar-btn-warn"
              onClick={() => setActiveTab("Requests")}
            >
              📋 {openRequests.length} Open{" "}
              {openRequests.length === 1 ? "Request" : "Requests"}
            </button>
          )}
          {totalUnread > 0 && (
            <button
              className="vd-topbar-icon-btn"
              onClick={() => setActiveTab("Messages")}
            >
              💬
              <span className="vd-topbar-notif">{totalUnread}</span>
            </button>
          )}
          <div
            className="vd-topbar-avatar"
            onClick={() => setProfileOpen(true)}
            title="Profile"
          >
            {(user?.displayName || user?.email || "V").charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── SHELL ── */}
      <div className="vd-shell">
        {/* ── SIDEBAR ── */}
        <aside className="vd-sidebar">
          <div className="vd-sidebar-section">Main</div>
          {TABS.map((t) => {
            const badge =
              t.id === "Messages"
                ? totalUnread
                : t.id === "Requests"
                  ? openRequests.length +
                    certRequests.filter((r) => r.status === "pending").length
                  : 0;
            return (
              <button
                key={t.id}
                className={`vd-sidebar-item ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <i>{t.icon}</i>
                {t.label}
                {badge > 0 && <span className="vd-sidebar-badge">{badge}</span>}
              </button>
            );
          })}

          <div className="vd-sidebar-divider" />
          <div className="vd-sidebar-section">Quick Actions</div>
          <button
            className="vd-sidebar-item"
            onClick={() => navigate("/marketplace")}
          >
            <i>🏪</i> View Marketplace
          </button>

          <div className="vd-sidebar-bottom">
            <button
              className="vd-sidebar-item"
              onClick={() => setProfileOpen(true)}
            >
              <i>👤</i> Profile
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="vd-main">
          {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
          {activeTab === "Overview" && (
            <>
              <div className="vd-page-bar">
                <div>
                  <div className="vd-page-bar-title">Overview</div>
                  <div className="vd-page-bar-sub">
                    Your veterinary activity at a glance
                  </div>
                </div>
              </div>
              <div className="vd-content">
                {/* KPIs */}
                <div className="vd-kpi-row">
                  {kpis.map((k) => (
                    <div key={k.label} className="vd-kpi">
                      <div className="vd-kpi-icon" style={{ background: k.bg }}>
                        {k.icon}
                      </div>
                      <div>
                        <div className="vd-kpi-val">{k.value}</div>
                        <div className="vd-kpi-lbl">{k.label}</div>
                        <div className={`vd-kpi-sub vd-kpi-sub-${k.type}`}>
                          {k.sub}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Open / unassigned requests banner */}
                {openRequests.length > 0 && (
                  <div className="vd-alert-banner">
                    <span className="vd-alert-icon">📋</span>
                    <div>
                      <strong>
                        {openRequests.length} unassigned request
                        {openRequests.length > 1 ? "s" : ""} in your province
                      </strong>
                      <p>
                        Farmers and traders near you are waiting for vet
                        services.
                      </p>
                    </div>
                    <button
                      className="vd-topbar-btn vd-topbar-btn-primary"
                      onClick={() => setActiveTab("Requests")}
                    >
                      Review Now →
                    </button>
                  </div>
                )}

                {/* Two-col */}
                <div className="vd-two-col">
                  {/* Pending requests */}
                  <div className="vd-card">
                    <div className="vd-card-head">
                      <span className="vd-card-head-title">
                        <i>📋</i> Pending Requests
                      </span>
                      <button
                        className="vd-link"
                        onClick={() => setActiveTab("Requests")}
                      >
                        View all →
                      </button>
                    </div>
                    {requestsLoading ? (
                      <Spinner />
                    ) : certRequests.filter((r) => r.status === "pending")
                        .length === 0 ? (
                      <EmptyState emoji="📋" text="No pending requests." />
                    ) : (
                      <table className="vd-table">
                        <tbody>
                          {certRequests
                            .filter((r) => r.status === "pending")
                            .slice(0, 5)
                            .map((r) => (
                              <tr key={r.id}>
                                <td style={{ width: 28 }}>
                                  {getCertIcon(r.certType)}
                                </td>
                                <td>
                                  <div className="vd-table-title">
                                    {r.certType} — {r.animalType}
                                  </div>
                                  <div className="vd-table-sub">
                                    {r.requesterName} · {r.province}
                                  </div>
                                </td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  <span className="vd-pill vd-pill-pending">
                                    ⏳ Pending
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Recent certs */}
                  <div className="vd-card">
                    <div className="vd-card-head">
                      <span className="vd-card-head-title">
                        <i>📜</i> Recent Certificates
                      </span>
                      <button
                        className="vd-link"
                        onClick={() => setActiveTab("Certificates")}
                      >
                        View all →
                      </button>
                    </div>
                    {certsLoading ? (
                      <Spinner />
                    ) : issuedCerts.length === 0 ? (
                      <EmptyState
                        emoji="📜"
                        text="No certificates issued yet."
                      />
                    ) : (
                      <table className="vd-table">
                        <tbody>
                          {issuedCerts.slice(0, 5).map((c) => (
                            <tr key={c.id}>
                              <td style={{ width: 28 }}>
                                {getCertIcon(c.certType)}
                              </td>
                              <td>
                                <div className="vd-table-title">
                                  {c.certNumber}
                                </div>
                                <div className="vd-table-sub">
                                  {c.requesterName} · {c.certType}
                                </div>
                              </td>
                              <td
                                style={{
                                  whiteSpace: "nowrap",
                                  textAlign: "right",
                                }}
                              >
                                <span className="vd-pill vd-pill-completed">
                                  ✅ Valid
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Recent messages */}
                {conversations.length > 0 && (
                  <div className="vd-card">
                    <div className="vd-card-head">
                      <span className="vd-card-head-title">
                        <i>💬</i> Recent Messages
                      </span>
                      <button
                        className="vd-link"
                        onClick={() => setActiveTab("Messages")}
                      >
                        View all →
                      </button>
                    </div>
                    <div className="vd-activity">
                      {conversations.slice(0, 4).map((c) => {
                        const otherUid = c.participantIds?.find(
                          (id) => id !== user?.uid,
                        );
                        const otherName =
                          c.participantNames?.[otherUid] || "User";
                        const unread = c.unreadCount?.[user?.uid] || 0;
                        return (
                          <div
                            key={c.id}
                            className="vd-activity-row"
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              setActiveConvo(c);
                              setActiveTab("Messages");
                            }}
                          >
                            <div
                              className="vd-msg-avatar"
                              style={{ width: 30, height: 30, fontSize: 11 }}
                            >
                              {initials(otherName)}
                            </div>
                            <div className="vd-activity-info">
                              <div className="vd-activity-label">
                                {otherName}
                              </div>
                              <div className="vd-activity-sub">
                                {c.lastMessage || "No messages yet"}
                              </div>
                            </div>
                            {unread > 0 && (
                              <span
                                className="vd-sidebar-badge"
                                style={{ marginLeft: "auto" }}
                              >
                                {unread}
                              </span>
                            )}
                            <div className="vd-activity-time">
                              {formatDate(c.lastMessageAt)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══ REQUESTS ══════════════════════════════════════════════════ */}
          {activeTab === "Requests" && (
            <>
              <div className="vd-page-bar">
                <div>
                  <div className="vd-page-bar-title">
                    📋 Certificate Requests
                  </div>
                  <div className="vd-page-bar-sub">
                    {openRequests.length} open in your province ·{" "}
                    {certRequests.length} assigned to you
                  </div>
                </div>
              </div>
              <div className="vd-content">
                {/* Open / unassigned */}
                {(openLoading || openRequests.length > 0) && (
                  <div className="vd-card">
                    <div className="vd-card-head">
                      <span className="vd-card-head-title">
                        <i>📌</i> Open in Your Province
                      </span>
                    </div>
                    {openLoading ? (
                      <Spinner />
                    ) : openRequests.length === 0 ? (
                      <EmptyState
                        emoji="📌"
                        text="No unassigned requests in your area."
                      />
                    ) : (
                      <table className="vd-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Requester</th>
                            <th>Animal</th>
                            <th>Location</th>
                            <th>Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {openRequests.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <span style={{ fontSize: "1.2rem" }}>
                                  {getCertIcon(r.certType)}
                                </span>
                                <div
                                  className="vd-table-sub"
                                  style={{ marginTop: 2 }}
                                >
                                  {r.certType}
                                </div>
                              </td>
                              <td>
                                <div className="vd-table-title">
                                  {r.requesterName || "—"}
                                </div>
                                <div className="vd-table-sub">
                                  {r.requesterRole}
                                </div>
                              </td>
                              <td>
                                {r.quantity}× {r.animalType}
                              </td>
                              <td>
                                {r.town ? `${r.town}, ` : ""}
                                {r.province}
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                {formatDate(r.createdAt)}
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <button
                                  className="vd-btn-sm vd-btn-sm-primary"
                                  onClick={() => claimRequest(r)}
                                >
                                  ✋ Claim
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Assigned to me */}
                <div className="vd-card">
                  <div className="vd-card-head">
                    <span className="vd-card-head-title">
                      <i>📋</i> Assigned to Me
                    </span>
                  </div>
                  {requestsLoading ? (
                    <Spinner />
                  ) : certRequests.length === 0 ? (
                    <EmptyState emoji="📋" text="No requests assigned yet." />
                  ) : (
                    <table className="vd-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Requester</th>
                          <th>Animal</th>
                          <th>Location</th>
                          <th>Requested</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {certRequests.map((r) => {
                          const meta =
                            REQUEST_STATUS_META[r.status] ||
                            REQUEST_STATUS_META.pending;
                          return (
                            <tr key={r.id}>
                              <td>
                                <span style={{ fontSize: "1.1rem" }}>
                                  {getCertIcon(r.certType)}
                                </span>
                                <div
                                  className="vd-table-sub"
                                  style={{ marginTop: 2 }}
                                >
                                  {r.certType}
                                </div>
                              </td>
                              <td>
                                <div className="vd-table-title">
                                  {r.requesterName || "—"}
                                </div>
                                <div className="vd-table-sub">
                                  {r.requesterRole}
                                </div>
                              </td>
                              <td>
                                {r.quantity}× {r.animalType}
                              </td>
                              <td>
                                {r.town ? `${r.town}, ` : ""}
                                {r.province}
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                {formatDate(r.createdAt)}
                              </td>
                              <td>
                                <span className={`vd-pill ${meta.cls}`}>
                                  {meta.icon} {meta.label}
                                </span>
                                {r.scheduledDate && (
                                  <div className="vd-table-sub">
                                    📅 {r.scheduledDate}
                                    {r.scheduledTime
                                      ? ` @ ${r.scheduledTime}`
                                      : ""}
                                  </div>
                                )}
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                {r.status === "pending" && (
                                  <button
                                    className="vd-btn-sm vd-btn-sm-primary"
                                    style={{ marginRight: 4 }}
                                    onClick={() => setSchedModal(r)}
                                  >
                                    📅 Schedule
                                  </button>
                                )}
                                {(r.status === "pending" ||
                                  r.status === "scheduled") && (
                                  <button
                                    className="vd-btn-sm vd-btn-sm-green"
                                    style={{ marginRight: 4 }}
                                    onClick={() => {
                                      setIssueModal(r);
                                      setIssueForm({
                                        notes: "",
                                        validUntil: "",
                                        certNumber: "",
                                      });
                                    }}
                                  >
                                    📜 Issue Cert
                                  </button>
                                )}
                                {r.status !== "completed" &&
                                  r.status !== "rejected" && (
                                    <button
                                      className="vd-btn-sm vd-btn-sm-danger"
                                      onClick={() => rejectRequest(r)}
                                    >
                                      ✕ Reject
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

          {/* ══ CERTIFICATES ══════════════════════════════════════════════ */}
          {activeTab === "Certificates" && (
            <>
              <div className="vd-page-bar">
                <div>
                  <div className="vd-page-bar-title">
                    📜 Issued Certificates
                  </div>
                  <div className="vd-page-bar-sub">
                    {issuedCerts.length} certificate
                    {issuedCerts.length !== 1 ? "s" : ""} issued
                  </div>
                </div>
              </div>
              <div className="vd-content">
                <div className="vd-card">
                  {certsLoading ? (
                    <Spinner />
                  ) : issuedCerts.length === 0 ? (
                    <EmptyState
                      emoji="📜"
                      text="No certificates issued yet. Process your first request to get started."
                    />
                  ) : (
                    <table className="vd-table">
                      <thead>
                        <tr>
                          <th>Certificate No.</th>
                          <th>Type</th>
                          <th>Issued To</th>
                          <th>Animal</th>
                          <th>Issued</th>
                          <th>Valid Until</th>
                          <th>Status</th>
                           <th>Actions</th> 
                        </tr>
                      </thead>
                      <tbody>
                        {issuedCerts.map((c) => {
                          const isExpired =
                            c.validUntil && new Date(c.validUntil) < new Date();
                          return (
                            <tr key={c.id}>
                              <td>
                                <div
                                  className="vd-table-title"
                                  style={{ fontFamily: "monospace" }}
                                >
                                  {getCertIcon(c.certType)} {c.certNumber}
                                </div>
                              </td>
                              <td>{c.certType}</td>
                              <td>
                                <div className="vd-table-title">
                                  {c.requesterName}
                                </div>
                                <div className="vd-table-sub">
                                  {c.requesterRole}
                                </div>
                              </td>
                              <td>
                                {c.quantity}× {c.animalType}
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                {formatDate(c.issuedAt)}
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                {c.validUntil || "—"}
                              </td>
                              <td>
                                <span
                                  className={`vd-pill ${isExpired ? "vd-pill-rejected" : "vd-pill-completed"}`}
                                >
                                  {isExpired ? "⚠ Expired" : "✅ Valid"}
                                </span>
                              </td>
                              <td>
  <button className="vd-btn-sm vd-btn-sm-primary" onClick={() => setViewingCert(c)}>
    📜 View
  </button>
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

          {/* ══ SCHEDULE ══════════════════════════════════════════════════ */}
          {activeTab === "Schedule" && (
            <>
              <div className="vd-page-bar">
                <div>
                  <div className="vd-page-bar-title">📅 Schedule</div>
                  <div className="vd-page-bar-sub">
                    Your upcoming inspections
                  </div>
                </div>
              </div>
              <div className="vd-content">
                <div className="vd-card">
                  {requestsLoading ? (
                    <Spinner />
                  ) : certRequests.filter((r) => r.scheduledDate).length ===
                    0 ? (
                    <EmptyState
                      emoji="📅"
                      text="No scheduled inspections yet."
                    />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {certRequests
                        .filter((r) => r.scheduledDate)
                        .sort((a, b) =>
                          a.scheduledDate > b.scheduledDate ? 1 : -1,
                        )
                        .map((r) => {
                          const meta =
                            REQUEST_STATUS_META[r.status] ||
                            REQUEST_STATUS_META.pending;
                          return (
                            <div key={r.id} className="vd-sched-card">
                              <div className="vd-sched-date">
                                <div className="vd-sched-day">
                                  {new Date(r.scheduledDate).toLocaleDateString(
                                    "en-ZW",
                                    { day: "numeric" },
                                  )}
                                </div>
                                <div className="vd-sched-mon">
                                  {new Date(r.scheduledDate).toLocaleDateString(
                                    "en-ZW",
                                    { month: "short" },
                                  )}
                                </div>
                              </div>
                              <div className="vd-sched-info">
                                <div className="vd-sched-title">
                                  {getCertIcon(r.certType)} {r.certType} —{" "}
                                  {r.quantity}× {r.animalType}
                                </div>
                                <div className="vd-sched-sub">
                                  {r.requesterName} ·{" "}
                                  {r.town ? `${r.town}, ` : ""}
                                  {r.province}
                                  {r.scheduledTime
                                    ? ` · ⏰ ${r.scheduledTime}`
                                    : ""}
                                </div>
                                {r.notes && (
                                  <div className="vd-sched-notes">
                                    "{r.notes}"
                                  </div>
                                )}
                              </div>
                              <div className="vd-sched-actions">
                                <span className={`vd-pill ${meta.cls}`}>
                                  {meta.icon} {meta.label}
                                </span>
                                {r.status === "scheduled" && (
                                  <button
                                    className="vd-btn-sm vd-btn-sm-green"
                                    style={{ marginTop: 6 }}
                                    onClick={() => {
                                      setIssueModal(r);
                                      setIssueForm({
                                        notes: "",
                                        validUntil: "",
                                        certNumber: "",
                                      });
                                    }}
                                  >
                                    📜 Issue Cert
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══ MESSAGES ══════════════════════════════════════════════════ */}
          {activeTab === "Messages" && (
            <>
              <div className="vd-page-bar">
                <div>
                  <div className="vd-page-bar-title">💬 Messages</div>
                  <div className="vd-page-bar-sub">
                    {totalUnread > 0
                      ? `${totalUnread} unread`
                      : "All caught up"}
                  </div>
                </div>
              </div>
              <div className="vd-content" style={{ padding: "0 22px 80px" }}>
                <div className="vd-msg-layout">
                  {/* Conversation list */}
                  <div
                    className={`vd-msg-sidebar ${activeConvo ? "vd-msg-sidebar-hidden-mobile" : ""}`}
                  >
                    <div className="vd-msg-sidebar-head">
                      Conversations
                      {totalUnread > 0 && (
                        <span className="vd-sidebar-badge">{totalUnread}</span>
                      )}
                    </div>
                    {convoLoading ? (
                      <Spinner />
                    ) : conversations.length === 0 ? (
                      <div className="vd-msg-empty-sidebar">
                        <p>No conversations yet.</p>
                        <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                          Farmers will message you when their requests are
                          assigned.
                        </p>
                      </div>
                    ) : (
                      conversations.map((c) => {
                        const otherUid = c.participantIds?.find(
                          (id) => id !== user?.uid,
                        );
                        const otherName =
                          c.participantNames?.[otherUid] || "User";
                        const otherRole = c.participantRoles?.[otherUid] || "";
                        const unread = c.unreadCount?.[user?.uid] || 0;
                        const roleIcon =
                          otherRole === "buyer"
                            ? "🛒"
                            : otherRole === "seller"
                              ? "🏪"
                              : "👤";
                        return (
                          <div
                            key={c.id}
                            className={`vd-msg-thread ${activeConvo?.id === c.id ? "active" : ""}`}
                            onClick={() => setActiveConvo(c)}
                          >
                            <div className="vd-msg-avatar">
                              {initials(otherName)}
                            </div>
                            <div className="vd-msg-thread-info">
                              <div className="vd-msg-thread-name">
                                {roleIcon} {otherName}
                                {unread > 0 && (
                                  <span className="vd-sidebar-badge">
                                    {unread}
                                  </span>
                                )}
                              </div>
                              <div className="vd-msg-thread-preview">
                                {c.lastMessage || "No messages yet"}
                              </div>
                              <div className="vd-msg-thread-time">
                                {formatDate(c.lastMessageAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Chat pane */}
                  <div
                    className={`vd-msg-main ${!activeConvo ? "vd-msg-main-hidden-mobile" : ""}`}
                  >
                    {activeConvo ? (
                      <>
                        <div className="vd-msg-head">
                          <button
                            className="vd-msg-back"
                            onClick={() => setActiveConvo(null)}
                          >
                            ← Back
                          </button>
                          <div className="vd-msg-avatar vd-msg-avatar-lg">
                            {initials(
                              activeConvo.participantNames?.[
                                activeConvo.participantIds?.find(
                                  (id) => id !== user?.uid,
                                )
                              ] || "?",
                            )}
                          </div>
                          <div>
                            <div className="vd-msg-head-name">
                              {activeConvo.participantNames?.[
                                activeConvo.participantIds?.find(
                                  (id) => id !== user?.uid,
                                )
                              ] || "User"}
                            </div>
                            <div className="vd-msg-head-sub">
                              {activeConvo.context || "Direct message"}
                            </div>
                          </div>
                        </div>
                        <div className="vd-msg-body" ref={msgBodyRef}>
                          {convoMessages.length === 0 && (
                            <div className="vd-msg-empty">
                              Send the first message!
                            </div>
                          )}
                          {convoMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`vd-bubble ${msg.senderId === user?.uid ? "sent" : "recv"}`}
                            >
                              {msg.senderId !== user?.uid && (
                                <div className="vd-bubble-sender">
                                  {msg.senderName}
                                </div>
                              )}
                              {msg.text}
                              <div className="vd-bubble-time">
                                {formatTime(msg.createdAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="vd-msg-input-row">
                          <textarea
                            className="vd-msg-input"
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
                            className="vd-msg-send"
                            onClick={sendMessage}
                            disabled={msgSending}
                          >
                            {msgSending ? "…" : "↑"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="vd-msg-empty">
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

      {/* ══ SCHEDULE MODAL ════════════════════════════════════════════════ */}
      {schedModal && (
        <div
          className="vd-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSchedModal(null);
          }}
        >
          <div className="vd-modal">
            <div className="vd-modal-head">
              <div>
                <h2>📅 Schedule Inspection</h2>
                <p>
                  {schedModal.certType} for {schedModal.requesterName} —{" "}
                  {schedModal.quantity}× {schedModal.animalType}
                </p>
              </div>
              <button
                className="vd-modal-close"
                onClick={() => setSchedModal(null)}
              >
                ✕
              </button>
            </div>
            <div className="vd-form-row">
              <div className="vd-form-group">
                <label>Inspection Date *</label>
                <input
                  type="date"
                  required
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                />
              </div>
              <div className="vd-form-group">
                <label>Time (optional)</label>
                <input
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                />
              </div>
            </div>
            <div className="vd-modal-actions">
              <button
                className="vd-btn-cancel"
                onClick={() => setSchedModal(null)}
              >
                Cancel
              </button>
              <button
                className="vd-btn-submit"
                onClick={scheduleInspection}
                disabled={!schedDate || schedSubmitting}
              >
                {schedSubmitting ? "Saving…" : "📅 Confirm Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ISSUE CERT MODAL ══════════════════════════════════════════════ */}
      {issueModal && (
        <div
          className="vd-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIssueModal(null);
          }}
        >
          <div className="vd-modal">
            <div className="vd-modal-head">
              <div>
                <h2>📜 Issue Certificate</h2>
                <p>
                  {issueModal.certType} — {issueModal.quantity}×{" "}
                  {issueModal.animalType} for {issueModal.requesterName}
                </p>
              </div>
              <button
                className="vd-modal-close"
                onClick={() => setIssueModal(null)}
              >
                ✕
              </button>
            </div>

            {/* Summary box */}
            <div className="vd-cert-summary">
              <div className="vd-cs-row">
                <span>Certificate Type</span>
                <strong>{issueModal.certType}</strong>
              </div>
              <div className="vd-cs-row">
                <span>Animal</span>
                <strong>
                  {issueModal.quantity}× {issueModal.animalType}
                </strong>
              </div>
              <div className="vd-cs-row">
                <span>Location</span>
                <strong>
                  {issueModal.town ? `${issueModal.town}, ` : ""}
                  {issueModal.province}
                </strong>
              </div>
              <div className="vd-cs-row">
                <span>Issued to</span>
                <strong>
                  {issueModal.requesterName} ({issueModal.requesterRole})
                </strong>
              </div>
            </div>
{/* After </div> closing vd-cert-summary */}
<div>
  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#2C2A26", display: "block", marginBottom: 8 }}>
    Certificate Template
  </label>
  <TemplateSelector
    selectedId={issueModal.certType}
    onSelect={(id) => setIssueModal((m) => ({ ...m, certType: id }))}
  />
</div>
            <div className="vd-form-row">
              <div className="vd-form-group">
                <label>Certificate Number</label>
                <input
                  type="text"
                  placeholder="Auto-generated if blank"
                  value={issueForm.certNumber}
                  onChange={(e) =>
                    setIssueForm((f) => ({ ...f, certNumber: e.target.value }))
                  }
                />
              </div>
              <div className="vd-form-group">
                <label>Valid Until</label>
                <input
                  type="date"
                  value={issueForm.validUntil}
                  onChange={(e) =>
                    setIssueForm((f) => ({ ...f, validUntil: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="vd-form-group">
              <label>Veterinary Notes / Observations</label>
              <textarea
                rows={3}
                placeholder="e.g. Animals inspected, all clear of FMD, tick-free, vaccination confirmed…"
                value={issueForm.notes}
                onChange={(e) =>
                  setIssueForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>

            <div className="vd-modal-actions">
              <button
                className="vd-btn-cancel"
                onClick={() => setIssueModal(null)}
              >
                Cancel
              </button>
              <button
                className="vd-btn-submit"
                onClick={issueCertificate}
                disabled={issueSubmitting}
              >
                {issueSubmitting ? "Issuing…" : "📜 Issue Certificate"}
              </button>
            </div>
          </div>
        </div>
      )}
<CertificateViewerModal
  cert={viewingCert}
  onClose={() => setViewingCert(null)}
/>
      <ProfileSheet
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* Mobile bottom nav */}
      <nav className="vd-bottom-nav">
        <div className="vd-bottom-nav-inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`vd-bottom-nav-item ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <i>{t.icon}</i>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="vd-spinner-wrap">
      <div className="vd-spinner" />
    </div>
  );
}

function EmptyState({ emoji, text }) {
  return (
    <div className="vd-empty">
      <span className="vd-empty-emoji">{emoji}</span>
      <p>{text}</p>
    </div>
  );
}
