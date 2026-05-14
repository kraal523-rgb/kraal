import { useEffect,useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import logo from "../assets/kraal-logo.svg";
import useAuthStore from "../store/useAuthStore";
import "./SellerDashboard.css";
import UserMenu from "../components/UserMenu";
import RequestTransportButton from "../components/RequestTransportButton";

// eslint-disable-next-line no-unused-vars
const SELLER = {
  name: "Takudzwa M.",
  location: "Marondera, Mashonaland",
  rating: 4.9,
  memberSince: "Jan 2023",
  verified: true,
};



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
  active: { label: "Active", cls: "sd-status-active" },
  low_stock: { label: "Low Stock", cls: "sd-status-low" },
  sold_out: { label: "Sold Out", cls: "sd-status-sold" },
  pending: { label: "Pending", cls: "sd-status-pending" },
  confirmed: { label: "Confirmed", cls: "sd-status-confirmed" },
  completed: { label: "Completed", cls: "sd-status-completed" },
  cancelled: { label: "Cancelled", cls: "sd-status-cancelled" },
};

// eslint-disable-next-line no-unused-vars
const TABS = ["Overview", "My Listings", "Orders"];
function getCategoryEmoji(categoryId) {
  const map = {
    cattle: "🐄", goats: "🐐", sheep: "🐑", chicken: "🐓",
    guinea: "🦤", ducks: "🦆", rabbits: "🐇", turkey: "🦃",
    pigs: "🐖", horses: "🐴", donkeys: "🫏", other: "🐾",
  };
  return map[categoryId] || "🐾";
}
// ─── COMPONENT ────────────────────────────────────────────────────────────────

 export default function SellerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");
  const [listings, setListings] = useState([]);        // ← start empty
  const [listingsLoading, setListingsLoading] = useState(true);
  const [orders] = useState(INITIAL_ORDERS);
  const [orderFilter, setOrderFilter] = useState("all");
  const [listingSearch, setListingSearch] = useState("");
  const [editListing, setEditListing] = useState(null);

  // ← Fetch real listings from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "listings"),
      where("sellerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Map Firestore fields to what the dashboard expects
        emoji: getCategoryEmoji(doc.data().categoryId),
        title: doc.data().title,
        price: doc.data().price,
        unit: doc.data().pricePerHead ? "per head" : "per lot",
        qty: doc.data().quantity,
        status: doc.data().status || "active",
        views: doc.data().views || 0,
        badge: doc.data().vaccinated ? "Vaccinated" : doc.data().condition,
        age: doc.data().age || "",
        weight: doc.data().weight || "",
      }));
      setListings(data);
      setListingsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);
  const stats = useMemo(() => {
  const activeListings = listings.filter((l) => l.status === "active");
  const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
  const totalRevenue = listings
    .filter((l) => l.status === "sold_out" || l.status === "completed")
    .reduce((sum, l) => sum + (l.price || 0) * (l.quantity || 1), 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  return [
    {
      label: "Total Revenue",
      value: totalRevenue > 0 ? `USD ${totalRevenue.toLocaleString()}` : "USD 0",
      sub: "From completed sales",
      subType: totalRevenue > 0 ? "up" : "neutral",
      icon: "💰",
    },
    {
      label: "Active Listings",
      value: String(activeListings.length),
      sub: listings.length > 0
        ? `${listings.length} total listings`
        : "No listings yet",
      subType: activeListings.length > 0 ? "up" : "neutral",
      icon: "📋",
    },
    {
      label: "Pending Orders",
      value: String(pendingOrders),
      sub: pendingOrders > 0 ? `${pendingOrders} need action` : "No pending orders",
      subType: pendingOrders > 0 ? "warn" : "neutral",
      icon: "📦",
    },
    {
      label: "Total Views",
      value: totalViews.toLocaleString(),
      sub: listings.length > 0 ? `Across ${listings.length} listings` : "Post a listing to get views",
      subType: totalViews > 0 ? "up" : "neutral",
      icon: "👁",
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

  const filteredListings = useMemo(
    () =>
      listingSearch.trim()
        ? listings.filter((l) =>
            l.title.toLowerCase().includes(listingSearch.toLowerCase()),
          )
        : listings,
    [listings, listingSearch],
  );

const toggleListingStatus = async (id) => {
  const listing = listings.find((l) => l.id === id);
  const newStatus = listing.status === "active" ? "pending" : "active";
  await updateDoc(doc(db, "listings", id), { status: newStatus });
  // Firestore onSnapshot will automatically update the UI
};

 const removeListing = async (id) => {
  if (!window.confirm("Delete this listing? This cannot be undone.")) return;
  await deleteDoc(doc(db, "listings", id));
  // Firestore onSnapshot will automatically update the UI
};
  return (
    <div className="sd">
      {/* ── TOP NAV ── */}
      <nav className="sd-nav">
        <button
          className="sd-nav-back"
          onClick={() => navigate("/marketplace")}
        >
          ← Back to Market
        </button>
        <div className="sd-nav-brand">
           <img src={logo} style={{ width: "140px" }} alt="Kraal" />
          <span className="sd-nav-sub">Seller Dashboard</span>
        </div>
       <UserMenu />
      </nav>

      {/* ── CONTENT ── */}
      <div className="sd-body">
        {/* ══ OVERVIEW ══ */}
        {activeTab === "Overview" && (
          <div className="sd-overview">
            {/* Stats */}
            <div className="sd-stats-grid">
            {stats.map((stat) => (
  <div key={stat.label} className="sd-stat-card">
    <div className="sd-stat-icon">{stat.icon}</div>
    <div className="sd-stat-info">
      <span className="sd-stat-label">{stat.label}</span>
      <span className="sd-stat-value">{stat.value}</span>
      <span className={`sd-stat-sub sd-sub-${stat.subType}`}>
        {stat.sub}
      </span>
    </div>
  </div>
))}
            </div>

            {/* Recent listings preview */}
            <div className="sd-section">
              <div className="sd-section-header">
                <h2 className="sd-section-title">📋 Active Listings</h2>
                <button
                  className="sd-section-link"
                  onClick={() => setActiveTab("My Listings")}
                >
                  View all →
                </button>
              </div>
             <div className="sd-mini-listings">
  {listings.filter((l) => l.status === "active").slice(0, 3).length === 0 ? (
    <div className="sd-empty">
      <span className="sd-empty-emoji">📋</span>
      <p>No active listings yet.</p>
      <button className="sd-post-btn" onClick={() => navigate('/sell')}>
        + Post your first listing
      </button>
    </div>
  ) : (
    listings
      .filter((l) => l.status === "active")
      .slice(0, 3)
      .map((l) => (
        <div key={l.id} className="sd-mini-card">
          <span className="sd-mini-emoji">{l.emoji}</span>
          <div className="sd-mini-info">
            <span className="sd-mini-title">{l.title}</span>
            <span className="sd-mini-price">
              {l.currency || "USD"} {l.price?.toLocaleString()} {l.unit}
            </span>
          </div>
          <div className="sd-mini-right">
            <span className={`sd-status-pill ${STATUS_META[l.status]?.cls}`}>
              {STATUS_META[l.status]?.label}
            </span>
            <span className="sd-mini-views">👁 {l.views || 0}</span>
          </div>
        </div>
      ))
  )}
</div>
            </div>

            {/* Recent orders preview */}
            <div className="sd-section">
              <div className="sd-section-header">
                <h2 className="sd-section-title">📦 Recent Orders</h2>
                <button
                  className="sd-section-link"
                  onClick={() => setActiveTab("Orders")}
                >
                  View all →
                </button>
              </div>
              <div className="sd-order-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Buyer</th>
                      <th>Listing</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 4).map((order) => (
                      <tr key={order.id}>
                        <td className="sd-order-id">{order.id}</td>
                        <td>
                          <div className="sd-buyer-cell">
                            <div className="sd-buyer-avatar">
                              {order.buyerInitials}
                            </div>
                            <span>{order.buyer}</span>
                          </div>
                        </td>
                        <td className="sd-order-listing">{order.listing}</td>
                        <td className="sd-order-amount">
                          ${order.amount.toLocaleString()}
                        </td>
                        <td>
                          <span
                            className={`sd-status-pill ${STATUS_META[order.status].cls}`}
                          >
                            {STATUS_META[order.status].label}
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

       {/* ══ MY LISTINGS ══ */}
{activeTab === "My Listings" && (
  <div className="sd-listings-panel">
    <div className="sd-panel-toolbar">
      <input
        className="sd-search-input"
        type="text"
        placeholder="🔍 Search your listings…"
        value={listingSearch}
        onChange={(e) => setListingSearch(e.target.value)}
      />
      <button
        className="sd-post-btn"
        onClick={() => navigate('/sell')}
      >
        + New Listing
      </button>
    </div>

    {listingsLoading ? (
      <div className="sd-empty">
        <span className="sd-empty-emoji">⏳</span>
        <p>Loading your listings…</p>
      </div>
    ) : (
      <div className="sd-listings-grid">
        {filteredListings.map((listing) => (
          <div key={listing.id} className="sd-listing-card">
            <div className="sd-lc-media">
              <span className="sd-lc-emoji">{listing.emoji}</span>
              <span
                className={`sd-status-pill ${STATUS_META[listing.status]?.cls || STATUS_META.active.cls}`}
              >
                {STATUS_META[listing.status]?.label || "Active"}
              </span>
            </div>
            <div className="sd-lc-body">
              <h3 className="sd-lc-title">{listing.title}</h3>
              <div className="sd-lc-meta">
                {listing.badge && <span>🏷 {listing.badge}</span>}
                {listing.weight && <span>⚖️ {listing.weight}</span>}
                {listing.age && <span>📅 {listing.age}</span>}
              </div>
              <div className="sd-lc-footer">
                <div className="sd-lc-price">
                  <strong>
                    {listing.currency || "USD"} {listing.price?.toLocaleString()}
                  </strong>
                  <span>{listing.unit}</span>
                </div>
                <div className="sd-lc-stats">
                  <span>👁 {listing.views || 0}</span>
                  <span>📦 Qty: {listing.qty}</span>
                </div>
              </div>
            </div>
            <div className="sd-lc-actions">
              <button
                className="sd-action-btn sd-action-edit"
                onClick={() => setEditListing(listing)}
              >
                ✏️ Edit
              </button>
              <button
                className="sd-action-btn sd-action-toggle"
                onClick={() => toggleListingStatus(listing.id)}
              >
                {listing.status === "active" ? "⏸ Pause" : "▶ Activate"}
              </button>
              <button
                className="sd-action-btn sd-action-delete"
                onClick={() => removeListing(listing.id)}
              >
                🗑
              </button>
            </div>
          </div>
        ))}

        {filteredListings.length === 0 && (
          <div className="sd-empty">
            <span className="sd-empty-emoji">🐾</span>
            <p>No listings found. Post your first animal to get started.</p>
            <button
              className="sd-post-btn"
              onClick={() => navigate('/sell')}
            >
              + Post your first listing
            </button>
          </div>
        )}
      </div>
    )}
  </div>
)}

        {/* ══ ORDERS ══ */}
        {activeTab === "Orders" && (
          <div className="sd-orders-panel">
            {/* Filter tabs */}
            <div className="sd-order-filters">
              {["all", "pending", "confirmed", "completed", "cancelled"].map(
                (f) => (
                  <button
                    key={f}
                    className={`sd-order-filter-btn ${orderFilter === f ? "active" : ""}`}
                    onClick={() => setOrderFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    <span className="sd-ofilter-count">
                      {f === "all"
                        ? orders.length
                        : orders.filter((o) => o.status === f).length}
                    </span>
                  </button>
                ),
              )}
            </div>

            <div className="sd-order-table-wrap">
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
                      <td className="sd-order-id">{order.id}</td>
                      <td>
                        <div className="sd-buyer-cell">
                          <div className="sd-buyer-avatar">
                            {order.buyerInitials}
                          </div>
                          <div>
                            <div>{order.buyer}</div>
                            <div className="sd-order-loc">
                              📍 {order.location}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="sd-order-listing">{order.listing}</td>
                      <td>{order.qty}</td>
                      <td className="sd-order-amount">
                        ${order.amount.toLocaleString()}
                      </td>
                      <td className="sd-order-date">{order.date}</td>
                      <td>
                        <span
                          className={`sd-status-pill ${STATUS_META[order.status].cls}`}
                        >
                          {STATUS_META[order.status].label}
                        </span>
                      </td>
                      <td>
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
                          <span className="sd-order-action-text">
                            Awaiting delivery
                          </span>
                        )}
                        {order.status === "confirmed" && (
  <RequestTransportButton order={order} />
)}
                        {(order.status === "completed" ||
                          order.status === "cancelled") && (
                          <span className="sd-order-action-text">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <div className="sd-empty">
                  <span className="sd-empty-emoji">📦</span>
                  <p>No {orderFilter} orders found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── ADD LISTING MODAL ── */}
   

      {/* ── EDIT LISTING MODAL ── */}
      {editListing && (
        <div className="sd-modal-overlay" onClick={() => setEditListing(null)}>
          <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h2>✏️ Edit Listing</h2>
              <button
                className="sd-modal-close"
                onClick={() => setEditListing(null)}
              >
                ✕
              </button>
            </div>
            <div className="sd-modal-body">
              <div className="sd-form-grid">
                <div className="sd-form-group sd-form-full">
                  <label>Listing Title</label>
                  <input
  type="text"
  value={editListing.title}
  onChange={(e) => setEditListing(prev => ({ ...prev, title: e.target.value }))}
/>
                </div>
                <div className="sd-form-group">
                  <label>Price (USD)</label>
                  <input
  type="number"
  value={editListing.price}
  onChange={(e) => setEditListing(prev => ({ ...prev, price: e.target.value }))}
/>
                </div>
                <div className="sd-form-group">
                  <label>Quantity</label>
                 <input
  type="number"
  value={editListing.qty}
  onChange={(e) => setEditListing(prev => ({ ...prev, qty: e.target.value }))}
/>
                </div>
                <div className="sd-form-group">
                  <label>Age</label>
                  <input
  type="text"
  value={editListing.age}
  onChange={(e) => setEditListing(prev => ({ ...prev, age: e.target.value }))}
/>
                </div>
                <div className="sd-form-group">
                  <label>Weight</label>
                 <input
  type="text"
  value={editListing.weight}
  onChange={(e) => setEditListing(prev => ({ ...prev, weight: e.target.value }))}
/>
                </div>
              </div>
              <div className="sd-modal-footer">
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
        </div>
      )}
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
