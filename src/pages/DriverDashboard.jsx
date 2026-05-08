import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import logo from "../assets/kraal-logo.svg";
import useAuthStore from "../store/useAuthStore";
import "./DriverDashboard.css";

// ─── STATUS META ──────────────────────────────────────────────────────────────
const STATUS_META = {
  open: { label: "Open", cls: "dd-status-open" },
  accepted: { label: "Accepted", cls: "dd-status-accepted" },
  in_transit: { label: "In Transit", cls: "dd-status-transit" },
  delivered: { label: "Delivered", cls: "dd-status-delivered" },
  cancelled: { label: "Cancelled", cls: "dd-status-cancelled" },
};

const TABS = ["Available Jobs", "My Deliveries", "Overview"];

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

function timeAgo(ts) {
  if (!ts) return "Just now";
  const diff = (Date.now() - ts.toMillis()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function DriverDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Available Jobs");
  const [openJobs, setOpenJobs] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [loadingOpen, setLoadingOpen] = useState(true);
  const [loadingMine, setLoadingMine] = useState(true);
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [accepting, setAccepting] = useState(null); // jobId being processed
  const [isAvailable, setIsAvailable] = useState(true);

  // ── Live feed of OPEN jobs (all drivers can see these)
  useEffect(() => {
    const q = query(
      collection(db, "transportRequests"),
      where("status", "==", "open"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setOpenJobs(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0),
          ),
      );
      setLoadingOpen(false);
    });
    return () => unsub();
  }, []);

  // ── This driver's own deliveries
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "transportRequests"),
      where("acceptedBy", "==", user.uid),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMyDeliveries(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0),
          ),
      );
      setLoadingMine(false);
    });
    return () => unsub();
  }, [user?.uid]);

  // ── Accept a job
  const acceptJob = async (job) => {
    if (accepting) return;
    setAccepting(job.id);
    try {
      await updateDoc(doc(db, "transportRequests", job.id), {
        status: "accepted",
        acceptedBy: user.uid,
        driverName: user.displayName || user.email,
        updatedAt: serverTimestamp(),
      });
      setActiveTab("My Deliveries");
    } catch (err) {
      console.error("Accept failed:", err);
    } finally {
      setAccepting(null);
    }
  };

  // ── Update delivery status
  const updateStatus = async (jobId, newStatus) => {
    await updateDoc(doc(db, "transportRequests", jobId), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  };

  // ── Toggle driver availability
  const toggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    if (user?.uid) {
      await updateDoc(doc(db, "users", user.uid), { available: next });
    }
  };

  // ── Stats
  const stats = useMemo(() => {
    const delivered = myDeliveries.filter((d) => d.status === "delivered");
    const inTransit = myDeliveries.filter((d) => d.status === "in_transit");
    const earnings = delivered.reduce((s, d) => s + (d.transportFee || 0), 0);
    return [
      {
        icon: "💰",
        label: "Total Earnings",
        value: earnings > 0 ? `USD ${earnings.toLocaleString()}` : "USD 0",
        sub: `${delivered.length} completed runs`,
        subType: earnings > 0 ? "up" : "neutral",
      },
      {
        icon: "🚚",
        label: "Active Deliveries",
        value: String(inTransit.length),
        sub: inTransit.length > 0 ? "On the road now" : "Nothing in transit",
        subType: inTransit.length > 0 ? "warn" : "neutral",
      },
      {
        icon: "📋",
        label: "Jobs Completed",
        value: String(delivered.length),
        sub: "Lifetime deliveries",
        subType: delivered.length > 0 ? "up" : "neutral",
      },
      {
        icon: "📡",
        label: "Open Jobs",
        value: String(openJobs.length),
        sub: openJobs.length > 0 ? "Available right now" : "Check back soon",
        subType: openJobs.length > 0 ? "up" : "neutral",
      },
    ];
  }, [myDeliveries, openJobs]);

  const filteredDeliveries = useMemo(
    () =>
      deliveryFilter === "all"
        ? myDeliveries
        : myDeliveries.filter((d) => d.status === deliveryFilter),
    [myDeliveries, deliveryFilter],
  );

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0] || "?").toUpperCase();

  return (
    <div className="dd">
      {/* ── TOP NAV ── */}
      <nav className="dd-nav">
        <button
          className="dd-nav-back"
          onClick={() => navigate("/marketplace")}
        >
          ← Back to Market
        </button>
        <div className="dd-nav-brand">
          <img src={logo} style={{ width: "140px" }} alt="Kraal" />
          <span className="dd-nav-sub">Driver Dashboard</span>
        </div>
        <div className="dd-nav-right">
          {/* Availability toggle */}
          <button
            className={`dd-availability-btn ${isAvailable ? "dd-avail-on" : "dd-avail-off"}`}
            onClick={toggleAvailability}
          >
            <span className="dd-avail-dot" />
            {isAvailable ? "Available" : "Off Duty"}
          </button>
          <div className="dd-nav-driver">
            <div className="dd-driver-avatar-sm">{initials}</div>
            <div className="dd-driver-meta-sm">
              <span className="dd-driver-name-sm">
                {user?.displayName || user?.email}
              </span>
              <span className="dd-verified-badge">🚚 Driver</span>
            </div>
            <button
              className="dd-logout-btn"
              onClick={async () => {
                await useAuthStore.getState().logout();
                navigate("/login", { replace: true });
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* ── PAGE HEADER ── */}
      <div className="dd-page-header">
        <div className="dd-page-header-inner">
          <div>
            <h1>Hey, {user?.displayName?.split(" ")[0] || "Driver"} 🚚</h1>
            <p>📍 {user?.email}</p>
          </div>
          <div className="dd-header-badge">
            <span className={`dd-pulse-dot ${isAvailable ? "active" : ""}`} />
            <span>
              {isAvailable
                ? `${openJobs.length} jobs available`
                : "You're off duty"}
            </span>
          </div>
        </div>

        <div className="dd-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`dd-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "Available Jobs" && openJobs.length > 0 && (
                <span className="dd-tab-badge">{openJobs.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="dd-body">
        {/* ══ AVAILABLE JOBS ══ */}
        {activeTab === "Available Jobs" && (
          <div className="dd-jobs-panel">
            {loadingOpen ? (
              <div className="dd-empty">
                <span className="dd-empty-emoji">⏳</span>
                <p>Loading available jobs…</p>
              </div>
            ) : openJobs.length === 0 ? (
              <div className="dd-empty">
                <span className="dd-empty-emoji">📡</span>
                <p>No transport jobs right now.</p>
                <span className="dd-empty-sub">
                  New jobs appear here instantly when buyers request transport.
                </span>
              </div>
            ) : (
              <div className="dd-jobs-grid">
                {openJobs.map((job) => (
                  <div key={job.id} className="dd-job-card">
                    <div className="dd-job-card-header">
                      <div className="dd-job-meta">
                        <span className="dd-job-emoji">
                          {getCategoryEmoji(job.categoryId)}
                        </span>
                        <div>
                          <h3 className="dd-job-title">{job.listing}</h3>
                          <span className="dd-job-time">
                            {timeAgo(job.createdAt)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`dd-status-pill ${STATUS_META.open.cls}`}
                      >
                        {STATUS_META.open.label}
                      </span>
                    </div>

                    <div className="dd-job-route">
                      <div className="dd-route-point dd-route-pickup">
                        <span className="dd-route-icon">📍</span>
                        <div>
                          <span className="dd-route-label">Pickup</span>
                          <span className="dd-route-loc">
                            {job.pickupLocation || "TBC"}
                          </span>
                        </div>
                      </div>
                      <div className="dd-route-line">
                        <span className="dd-route-arrow">→</span>
                      </div>
                      <div className="dd-route-point dd-route-dropoff">
                        <span className="dd-route-icon">🏁</span>
                        <div>
                          <span className="dd-route-label">Dropoff</span>
                          <span className="dd-route-loc">
                            {job.dropoffLocation || "TBC"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="dd-job-details">
                      {job.amount && (
                        <span className="dd-job-detail-pill">
                          💵 Order: USD {job.amount.toLocaleString()}
                        </span>
                      )}
                      {job.transportFee && (
                        <span className="dd-job-detail-pill dd-fee-pill">
                          🤝 Fee: USD {job.transportFee.toLocaleString()}
                        </span>
                      )}
                      {job.qty && (
                        <span className="dd-job-detail-pill">
                          📦 Qty: {job.qty}
                        </span>
                      )}
                    </div>

                    <div className="dd-job-footer">
                      <div className="dd-job-ids">
                        <span className="dd-job-id">
                          Order {job.orderId || "—"}
                        </span>
                      </div>
                      <button
                        className="dd-accept-btn"
                        disabled={accepting === job.id || !isAvailable}
                        onClick={() => acceptJob(job)}
                      >
                        {accepting === job.id ? "Accepting…" : "✅ Accept Job"}
                      </button>
                    </div>

                    {!isAvailable && (
                      <div className="dd-job-unavail">
                        Set yourself as Available to accept jobs
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ MY DELIVERIES ══ */}
        {activeTab === "My Deliveries" && (
          <div className="dd-deliveries-panel">
            <div className="dd-order-filters">
              {["all", "accepted", "in_transit", "delivered", "cancelled"].map(
                (f) => (
                  <button
                    key={f}
                    className={`dd-filter-btn ${deliveryFilter === f ? "active" : ""}`}
                    onClick={() => setDeliveryFilter(f)}
                  >
                    {f === "in_transit"
                      ? "In Transit"
                      : f.charAt(0).toUpperCase() + f.slice(1)}
                    <span className="dd-filter-count">
                      {f === "all"
                        ? myDeliveries.length
                        : myDeliveries.filter((d) => d.status === f).length}
                    </span>
                  </button>
                ),
              )}
            </div>

            {loadingMine ? (
              <div className="dd-empty">
                <span className="dd-empty-emoji">⏳</span>
                <p>Loading your deliveries…</p>
              </div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="dd-empty">
                <span className="dd-empty-emoji">📦</span>
                <p>
                  No {deliveryFilter === "all" ? "" : deliveryFilter} deliveries
                  yet.
                </p>
                <span className="dd-empty-sub">
                  Accept a job from Available Jobs to get started.
                </span>
              </div>
            ) : (
              <div className="dd-delivery-list">
                {filteredDeliveries.map((job) => (
                  <div key={job.id} className="dd-delivery-card">
                    <div className="dd-delivery-header">
                      <div className="dd-delivery-title-row">
                        <span className="dd-job-emoji">
                          {getCategoryEmoji(job.categoryId)}
                        </span>
                        <div>
                          <h3 className="dd-job-title">{job.listing}</h3>
                          <span className="dd-job-time">
                            Order {job.orderId || "—"} · Updated{" "}
                            {timeAgo(job.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`dd-status-pill ${STATUS_META[job.status]?.cls}`}
                      >
                        {STATUS_META[job.status]?.label}
                      </span>
                    </div>

                    <div className="dd-job-route">
                      <div className="dd-route-point dd-route-pickup">
                        <span className="dd-route-icon">📍</span>
                        <div>
                          <span className="dd-route-label">Pickup</span>
                          <span className="dd-route-loc">
                            {job.pickupLocation || "TBC"}
                          </span>
                        </div>
                      </div>
                      <div className="dd-route-line">
                        <span className="dd-route-arrow">→</span>
                      </div>
                      <div className="dd-route-point dd-route-dropoff">
                        <span className="dd-route-icon">🏁</span>
                        <div>
                          <span className="dd-route-label">Dropoff</span>
                          <span className="dd-route-loc">
                            {job.dropoffLocation || "TBC"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons based on status */}
                    <div className="dd-delivery-actions">
                      {job.status === "accepted" && (
                        <>
                          <button
                            className="dd-action-btn dd-action-transit"
                            onClick={() => updateStatus(job.id, "in_transit")}
                          >
                            🚚 Start Transit
                          </button>
                          <a
                            href={`https://wa.me/?text=Hi, I'm your driver for order ${job.orderId} (${job.listing}). I'll be picking up from ${job.pickupLocation} shortly.`}
                            target="_blank"
                            rel="noreferrer"
                            className="dd-wa-btn"
                          >
                            <WhatsAppIcon /> Contact Buyer
                          </a>
                        </>
                      )}
                      {job.status === "in_transit" && (
                        <>
                          <button
                            className="dd-action-btn dd-action-deliver"
                            onClick={() => updateStatus(job.id, "delivered")}
                          >
                            ✅ Mark Delivered
                          </button>
                          <a
                            href={`https://wa.me/?text=Hi, your order ${job.orderId} (${job.listing}) is on the way! ETA soon.`}
                            target="_blank"
                            rel="noreferrer"
                            className="dd-wa-btn"
                          >
                            <WhatsAppIcon /> Update Buyer
                          </a>
                        </>
                      )}
                      {job.status === "delivered" && (
                        <span className="dd-delivered-badge">
                          🎉 Delivery complete
                          {job.transportFee
                            ? ` · USD ${job.transportFee.toLocaleString()} earned`
                            : ""}
                        </span>
                      )}
                      {job.status === "cancelled" && (
                        <span className="dd-cancelled-text">
                          This job was cancelled.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ OVERVIEW ══ */}
        {activeTab === "Overview" && (
          <div className="dd-overview">
            <div className="dd-stats-grid">
              {stats.map((stat) => (
                <div key={stat.label} className="dd-stat-card">
                  <div className="dd-stat-icon">{stat.icon}</div>
                  <div className="dd-stat-info">
                    <span className="dd-stat-label">{stat.label}</span>
                    <span className="dd-stat-value">{stat.value}</span>
                    <span className={`dd-stat-sub dd-sub-${stat.subType}`}>
                      {stat.sub}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent deliveries preview */}
            <div className="dd-section">
              <div className="dd-section-header">
                <h2 className="dd-section-title">🚚 Recent Deliveries</h2>
                <button
                  className="dd-section-link"
                  onClick={() => setActiveTab("My Deliveries")}
                >
                  View all →
                </button>
              </div>
              {myDeliveries.length === 0 ? (
                <div className="dd-empty">
                  <span className="dd-empty-emoji">🚚</span>
                  <p>No deliveries yet. Accept your first job!</p>
                  <button
                    className="dd-accept-btn"
                    onClick={() => setActiveTab("Available Jobs")}
                  >
                    Browse Jobs
                  </button>
                </div>
              ) : (
                <div className="dd-mini-list">
                  {myDeliveries.slice(0, 4).map((job) => (
                    <div key={job.id} className="dd-mini-card">
                      <span className="dd-mini-emoji">
                        {getCategoryEmoji(job.categoryId)}
                      </span>
                      <div className="dd-mini-info">
                        <span className="dd-mini-title">{job.listing}</span>
                        <span className="dd-mini-route">
                          {job.pickupLocation} → {job.dropoffLocation}
                        </span>
                      </div>
                      <span
                        className={`dd-status-pill ${STATUS_META[job.status]?.cls}`}
                      >
                        {STATUS_META[job.status]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Open jobs preview */}
            <div className="dd-section">
              <div className="dd-section-header">
                <h2 className="dd-section-title">📡 Open Jobs Near You</h2>
                <button
                  className="dd-section-link"
                  onClick={() => setActiveTab("Available Jobs")}
                >
                  View all →
                </button>
              </div>
              {openJobs.length === 0 ? (
                <div className="dd-empty">
                  <span className="dd-empty-emoji">📡</span>
                  <p>No open jobs right now.</p>
                </div>
              ) : (
                <div className="dd-mini-list">
                  {openJobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="dd-mini-card">
                      <span className="dd-mini-emoji">
                        {getCategoryEmoji(job.categoryId)}
                      </span>
                      <div className="dd-mini-info">
                        <span className="dd-mini-title">{job.listing}</span>
                        <span className="dd-mini-route">
                          {job.pickupLocation} → {job.dropoffLocation}
                        </span>
                      </div>
                      <div className="dd-mini-right">
                        <span
                          className={`dd-status-pill ${STATUS_META.open.cls}`}
                        >
                          Open
                        </span>
                        <span className="dd-mini-time">
                          {timeAgo(job.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
