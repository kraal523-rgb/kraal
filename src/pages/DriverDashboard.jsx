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
} from "firebase/firestore";
import { db } from "../lib/firebase";
import logo from "../assets/kraal-logo.svg";
import useAuthStore from "../store/useAuthStore";
import "./DriverDashboard.css";
import UserMenu from "../components/UserMenu";
import ProfileSheet from "../components/ProfileSheet";

// ─── STATUS META ──────────────────────────────────────────────────────────────
const STATUS_META = {
  open: { label: "Open", cls: "dd-status-open" },
  quoted: { label: "Quoted", cls: "dd-status-accepted" },
  accepted: { label: "Accepted", cls: "dd-status-accepted" },
  in_transit: { label: "In Transit", cls: "dd-status-transit" },
  delivered: { label: "Delivered", cls: "dd-status-delivered" },
  cancelled: { label: "Cancelled", cls: "dd-status-cancelled" },
};

const TABS = ["Available Jobs", "My Deliveries", "Overview"];

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

function timeAgo(ts) {
  if (!ts) return "Just now";
  const diff = (Date.now() - ts.toMillis()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** How long since transit started, shown on in-transit cards */
function transitDuration(ts) {
  if (!ts) return null;
  const diff = (Date.now() - ts.toMillis()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m in transit`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h in transit`;
  return `${Math.floor(diff / 86400)}d in transit`;
}

function formatLocation(town, province) {
  if (town && province) return `${town}, ${province}`;
  return town || province || "TBC";
}

/**
 * Suggest a vehicle type based on animal category + quantity.
 * Returns { label, icon } — purely indicative, no external API needed.
 */
function suggestVehicle(animalType, quantity) {
  const type = animalType?.toLowerCase() || "";
  const qty = Number(quantity) || 1;

  if (["cattle", "horses", "donkeys"].includes(type)) {
    return qty <= 4
      ? { label: "Livestock trailer (small)", icon: "🚛" }
      : { label: "Livestock truck (large)", icon: "🚚" };
  }
  if (["pigs"].includes(type)) {
    return qty <= 10
      ? { label: "Enclosed bakkie / van", icon: "🚐" }
      : { label: "Livestock truck (medium)", icon: "🚚" };
  }
  if (["goats", "sheep"].includes(type)) {
    return qty <= 20
      ? { label: "Livestock trailer (small)", icon: "🚛" }
      : { label: "Livestock truck (medium)", icon: "🚚" };
  }
  // Poultry / small animals
  return qty <= 100
    ? { label: "Bakkie / van", icon: "🚐" }
    : { label: "Enclosed truck (large)", icon: "🚚" };
}

/**
 * Estimate a transport fee range based on distance category embedded in
 * province names. Real implementations would call a maps API; here we give a
 * sensible ballpark drivers can use as a floor when quoting.
 *
 * pickup/drop province names are already stored by the buyer.
 * Same province = short haul, different = long haul.
 */
function estimateFee(pickupProvince, dropProvince, animalType, quantity) {
  const qty = Number(quantity) || 1;
  const sameRoute =
    (pickupProvince || "").toLowerCase() === (dropProvince || "").toLowerCase();
  const isLarge = ["cattle", "horses", "donkeys"].includes(
    animalType?.toLowerCase(),
  );

  const baseShort = isLarge ? 80 : 40;
  const baseLong = isLarge ? 220 : 110;
  const perHead = isLarge ? 18 : 4;

  const base = sameRoute ? baseShort : baseLong;
  const low = base + Math.floor(qty * perHead * 0.8);
  const high = base + Math.floor(qty * perHead * 1.3);
  return { low, high, haul: sameRoute ? "Short haul" : "Long haul" };
}

/** Jobs posted < 2 h ago are "urgent" — highlight them */
function isUrgent(ts) {
  if (!ts) return false;
  return (Date.now() - ts.toMillis()) / 1000 < 7200;
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
  const [accepting, setAccepting] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [driverProvince, setDriverProvince] = useState(null);

  // ── Load driver profile ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    import("firebase/firestore").then(({ getDoc, doc: firestoreDoc }) => {
      getDoc(firestoreDoc(db, "transporters", user.uid)).then((snap) => {
        if (snap.exists()) {
          setDriverProvince(snap.data().province || null);
          setIsAvailable(snap.data().available ?? true);
        }
      });
    });
  }, [user?.uid]);

  // ── Live open jobs ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!driverProvince) return;
    const q = query(
      collection(db, "transport_requests"),
      where("status", "==", "open"),
      where("pickupProvince", "==", driverProvince),
    );
    return onSnapshot(q, (snap) => {
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
  }, [driverProvince]);

  // ── My deliveries ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "transport_requests"),
      where("driverUid", "==", user.uid),
    );
    return onSnapshot(q, (snap) => {
      setMyDeliveries(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.updatedAt?.toMillis() || b.createdAt?.toMillis() || 0) -
              (a.updatedAt?.toMillis() || a.createdAt?.toMillis() || 0),
          ),
      );
      setLoadingMine(false);
    });
  }, [user?.uid]);

  // ── Accept job ────────────────────────────────────────────────────────────
  const acceptJob = async (job) => {
    if (accepting) return;
    setAccepting(job.id);
    try {
      await updateDoc(doc(db, "transport_requests", job.id), {
        status: "quoted",
        driverUid: user.uid,
        driverName: user.displayName || user.email,
        quotedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveTab("My Deliveries");
    } catch (err) {
      console.error("Accept failed:", err);
    } finally {
      setAccepting(null);
    }
  };

  const updateStatus = async (jobId, newStatus) => {
    await updateDoc(doc(db, "transport_requests", jobId), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  };

  const toggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    if (user?.uid) {
      await updateDoc(doc(db, "transporters", user.uid), { available: next });
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const delivered = myDeliveries.filter((d) => d.status === "delivered");
    const inTransit = myDeliveries.filter((d) => d.status === "in_transit");
    const earnings = delivered.reduce((s, d) => s + (d.transportFee || 0), 0);
    return [
      {
        icon: "💰",
        label: "Total Earnings",
        value: earnings > 0 ? `USD ${earnings.toLocaleString()}` : "USD 0",
        sub: `${delivered.length} completed run${delivered.length !== 1 ? "s" : ""}`,
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

  // Earnings from filtered deliveries — shown in the My Deliveries filter bar
  const deliveryEarnings = useMemo(() => {
    return myDeliveries
      .filter((d) => d.status === "delivered")
      .reduce((s, d) => s + (d.transportFee || 0), 0);
  }, [myDeliveries]);

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

  // ── RENDER ────────────────────────────────────────────────────────────────
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
          <button
            className={`dd-availability-btn ${isAvailable ? "dd-avail-on" : "dd-avail-off"}`}
            onClick={toggleAvailability}
          >
            <span className="dd-avail-dot" />
            {isAvailable ? "Available" : "Off Duty"}
          </button>
          <UserMenu />
        </div>
      </nav>

      {/* ── PAGE HEADER ── */}
      <div className="dd-page-header">
        <div className="dd-page-header-inner">
          <div>
            <h1>Hey, {user?.displayName?.split(" ")[0] || "Driver"} 🚚</h1>
            <p>📍 {driverProvince || user?.email}</p>
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
              {tab === "My Deliveries" &&
                myDeliveries.filter((d) => d.status === "in_transit").length >
                  0 && (
                  <span className="dd-tab-badge dd-tab-badge-amber">
                    {
                      myDeliveries.filter((d) => d.status === "in_transit")
                        .length
                    }
                  </span>
                )}
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="dd-body">
        {/* ══ AVAILABLE JOBS ══════════════════════════════════════════════ */}
        {activeTab === "Available Jobs" && (
          <div className="dd-jobs-panel">
            {loadingOpen ? (
              <EmptyState emoji="⏳" text="Loading available jobs…" />
            ) : openJobs.length === 0 ? (
              <EmptyState
                emoji="📡"
                text={`No transport jobs in ${driverProvince || "your area"} right now.`}
                sub="New jobs appear here instantly when buyers request transport."
              />
            ) : (
              <div className="dd-jobs-grid">
                {openJobs.map((job) => {
                  const vehicle = suggestVehicle(job.animalType, job.quantity);
                  const fee = estimateFee(
                    job.pickupProvince,
                    job.dropProvince,
                    job.animalType,
                    job.quantity,
                  );
                  const urgent = isUrgent(job.createdAt);

                  return (
                    <div
                      key={job.id}
                      className={`dd-job-card ${urgent ? "dd-job-card-urgent" : ""}`}
                    >
                      {/* Urgency ribbon */}
                      {urgent && (
                        <div className="dd-urgent-ribbon">
                          🔴 New — just posted
                        </div>
                      )}

                      <div className="dd-job-card-header">
                        <div className="dd-job-meta">
                          <span className="dd-job-emoji">
                            {getCategoryEmoji(job.animalType)}
                          </span>
                          <div>
                            <h3 className="dd-job-title">
                              {job.quantity}× {job.animalType}
                            </h3>
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

                      {/* Route */}
                      <div className="dd-job-route">
                        <div className="dd-route-point">
                          <span className="dd-route-icon">📍</span>
                          <div>
                            <span className="dd-route-label">Pickup</span>
                            <span className="dd-route-loc">
                              {formatLocation(
                                job.pickupTown,
                                job.pickupProvince,
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="dd-route-line">
                          <span className="dd-route-arrow">→</span>
                          <span className="dd-route-haul">{fee.haul}</span>
                        </div>
                        <div className="dd-route-point">
                          <span className="dd-route-icon">🏁</span>
                          <div>
                            <span className="dd-route-label">Dropoff</span>
                            <span className="dd-route-loc">
                              {formatLocation(job.dropTown, job.dropProvince) ||
                                "TBD"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Key info row: vehicle + estimated fee */}
                      <div className="dd-job-info-row">
                        <div className="dd-info-block">
                          <span className="dd-info-label">Vehicle needed</span>
                          <span className="dd-info-value">
                            {vehicle.icon} {vehicle.label}
                          </span>
                        </div>
                        <div className="dd-info-block dd-info-block-right">
                          <span className="dd-info-label">Suggested fee</span>
                          <span className="dd-info-value dd-info-fee">
                            USD {fee.low}–{fee.high}
                          </span>
                        </div>
                      </div>

                      {/* Detail pills */}
                      <div className="dd-job-details">
                        {job.preferredDate && (
                          <span className="dd-job-detail-pill">
                            📅 {job.preferredDate}
                          </span>
                        )}
                        {job.quantity && (
                          <span className="dd-job-detail-pill">
                            📦 Qty: {job.quantity}
                          </span>
                        )}
                        {job.contactPhone && (
                          <a
                            href={`tel:${job.contactPhone}`}
                            className="dd-job-detail-pill dd-pill-contact"
                          >
                            📞 {job.contactPhone}
                          </a>
                        )}
                        {job.buyerName && (
                          <span className="dd-job-detail-pill">
                            👤 {job.buyerName}
                          </span>
                        )}
                      </div>

                      {job.notes && (
                        <div className="dd-job-notes">"{job.notes}"</div>
                      )}

                      <div className="dd-job-footer">
                        <span className="dd-job-buyer">
                          Posted by {job.buyerName || "Buyer"}
                        </span>
                        <button
                          className="dd-accept-btn"
                          disabled={accepting === job.id || !isAvailable}
                          onClick={() => acceptJob(job)}
                        >
                          {accepting === job.id
                            ? "Accepting…"
                            : "✅ Accept Job"}
                        </button>
                      </div>

                      {!isAvailable && (
                        <div className="dd-job-unavail">
                          Set yourself as Available to accept jobs
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ MY DELIVERIES ═══════════════════════════════════════════════ */}
        {activeTab === "My Deliveries" && (
          <div className="dd-deliveries-panel">
            {/* Filter bar + earnings strip */}
            <div className="dd-deliveries-header">
              <div className="dd-order-filters">
                {["all", "quoted", "in_transit", "delivered", "cancelled"].map(
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
              {deliveryEarnings > 0 && (
                <div className="dd-earnings-strip">
                  <span className="dd-earnings-label">💰 Total earned</span>
                  <span className="dd-earnings-value">
                    USD {deliveryEarnings.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {loadingMine ? (
              <EmptyState emoji="⏳" text="Loading your deliveries…" />
            ) : filteredDeliveries.length === 0 ? (
              <EmptyState
                emoji="📦"
                text={`No ${deliveryFilter === "all" ? "" : deliveryFilter} deliveries yet.`}
                sub="Accept a job from Available Jobs to get started."
              />
            ) : (
              <div className="dd-delivery-list">
                {filteredDeliveries.map((job) => {
                  const vehicle = suggestVehicle(job.animalType, job.quantity);
                  const duration =
                    job.status === "in_transit"
                      ? transitDuration(job.updatedAt)
                      : null;

                  return (
                    <div key={job.id} className="dd-delivery-card">
                      <div className="dd-delivery-header">
                        <div className="dd-delivery-title-row">
                          <span className="dd-job-emoji">
                            {getCategoryEmoji(job.animalType)}
                          </span>
                          <div>
                            <h3 className="dd-job-title">
                              {job.quantity}× {job.animalType}
                            </h3>
                            <span className="dd-job-time">
                              Updated {timeAgo(job.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="dd-delivery-header-right">
                          <span
                            className={`dd-status-pill ${STATUS_META[job.status]?.cls}`}
                          >
                            {STATUS_META[job.status]?.label}
                          </span>
                          {duration && (
                            <span className="dd-transit-timer">
                              ⏱ {duration}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Route */}
                      <div className="dd-job-route">
                        <div className="dd-route-point">
                          <span className="dd-route-icon">📍</span>
                          <div>
                            <span className="dd-route-label">Pickup</span>
                            <span className="dd-route-loc">
                              {formatLocation(
                                job.pickupTown,
                                job.pickupProvince,
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="dd-route-line">
                          <span className="dd-route-arrow">→</span>
                        </div>
                        <div className="dd-route-point">
                          <span className="dd-route-icon">🏁</span>
                          <div>
                            <span className="dd-route-label">Dropoff</span>
                            <span className="dd-route-loc">
                              {formatLocation(job.dropTown, job.dropProvince) ||
                                "TBD"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle + fee info */}
                      <div className="dd-job-info-row">
                        <div className="dd-info-block">
                          <span className="dd-info-label">Vehicle</span>
                          <span className="dd-info-value">
                            {vehicle.icon} {vehicle.label}
                          </span>
                        </div>
                        {job.transportFee ? (
                          <div className="dd-info-block dd-info-block-right">
                            <span className="dd-info-label">Fee agreed</span>
                            <span className="dd-info-value dd-info-fee">
                              USD {job.transportFee.toLocaleString()}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* Buyer contact — always visible once accepted */}
                      {job.contactPhone && (
                        <div className="dd-buyer-contact">
                          <span className="dd-buyer-contact-label">
                            Buyer contact
                          </span>
                          <div className="dd-buyer-contact-row">
                            {job.buyerName && (
                              <span className="dd-buyer-contact-name">
                                👤 {job.buyerName}
                              </span>
                            )}
                            <a
                              href={`tel:${job.contactPhone}`}
                              className="dd-call-btn"
                            >
                              📞 {job.contactPhone}
                            </a>
                            <a
                              href={`https://wa.me/${job.contactPhone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="dd-wa-btn"
                            >
                              <WhatsAppIcon /> WhatsApp
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="dd-delivery-actions">
                        {job.status === "quoted" && (
                          <>
                            <button
                              className="dd-action-btn dd-action-transit"
                              onClick={() => updateStatus(job.id, "in_transit")}
                            >
                              🚚 Start Transit
                            </button>
                            <a
                              href={`https://wa.me/?text=Hi, I'm your driver for ${job.quantity}× ${job.animalType} from ${job.pickupTown || job.pickupProvince}. I'll be picking up shortly.`}
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
                              href={`https://wa.me/?text=Hi, your ${job.quantity}× ${job.animalType} is on the way! ETA soon.`}
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ OVERVIEW ════════════════════════════════════════════════════ */}
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

            {/* Recent deliveries */}
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
                        {getCategoryEmoji(job.animalType)}
                      </span>
                      <div className="dd-mini-info">
                        <span className="dd-mini-title">
                          {job.quantity}× {job.animalType}
                        </span>
                        <span className="dd-mini-route">
                          {formatLocation(job.pickupTown, job.pickupProvince)} →{" "}
                          {formatLocation(job.dropTown, job.dropProvince) ||
                            "TBD"}
                        </span>
                      </div>
                      <div className="dd-mini-right">
                        <span
                          className={`dd-status-pill ${STATUS_META[job.status]?.cls}`}
                        >
                          {STATUS_META[job.status]?.label}
                        </span>
                        {job.transportFee ? (
                          <span className="dd-mini-fee">
                            USD {job.transportFee.toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Open jobs near you */}
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
                  {openJobs.slice(0, 3).map((job) => {
                    const fee = estimateFee(
                      job.pickupProvince,
                      job.dropProvince,
                      job.animalType,
                      job.quantity,
                    );
                    const urgent = isUrgent(job.createdAt);
                    return (
                      <div
                        key={job.id}
                        className={`dd-mini-card ${urgent ? "dd-mini-urgent" : ""}`}
                      >
                        <span className="dd-mini-emoji">
                          {getCategoryEmoji(job.animalType)}
                        </span>
                        <div className="dd-mini-info">
                          <span className="dd-mini-title">
                            {job.quantity}× {job.animalType}
                            {urgent && (
                              <span className="dd-mini-urgent-dot"> 🔴</span>
                            )}
                          </span>
                          <span className="dd-mini-route">
                            {formatLocation(job.pickupTown, job.pickupProvince)}{" "}
                            →{" "}
                            {formatLocation(job.dropTown, job.dropProvince) ||
                              "TBD"}
                          </span>
                        </div>
                        <div className="dd-mini-right">
                          <span
                            className={`dd-status-pill ${STATUS_META.open.cls}`}
                          >
                            Open
                          </span>
                          <span className="dd-mini-fee">
                            ~USD {fee.low}–{fee.high}
                          </span>
                          <span className="dd-mini-time">
                            {timeAgo(job.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ProfileSheet
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="sd-bottom-nav">
        <div className="sd-bottom-nav-inner">
          <button
            className={`sd-bottom-nav-item ${activeTab === "Overview" ? "active" : ""}`}
            onClick={() => setActiveTab("Overview")}
          >
            📊<span>Overview</span>
          </button>
          <button
            className={`sd-bottom-nav-item ${activeTab === "Available Jobs" ? "active" : ""}`}
            onClick={() => setActiveTab("Available Jobs")}
          >
            📡<span>Jobs</span>
          </button>
          <button
            className={`sd-bottom-nav-item ${activeTab === "My Deliveries" ? "active" : ""}`}
            onClick={() => setActiveTab("My Deliveries")}
          >
            🚚<span>Deliveries</span>
          </button>
          <button
            className="sd-bottom-nav-item"
            onClick={() => setProfileOpen(true)}
          >
            👤<span>Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function EmptyState({ emoji, text, sub, cta, onCta }) {
  return (
    <div className="dd-empty">
      <span className="dd-empty-emoji">{emoji}</span>
      <p>{text}</p>
      {sub && <span className="dd-empty-sub">{sub}</span>}
      {cta && (
        <button
          className="dd-accept-btn"
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
