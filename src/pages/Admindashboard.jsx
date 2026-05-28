import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  const accents = {
    green: { bg: "#EAF3DE", text: "#3B6D11" },
    blue: { bg: "#E6F1FB", text: "#185FA5" },
    amber: { bg: "#FAEEDA", text: "#854F0B" },
    red: { bg: "#FCEBEB", text: "#A32D2D" },
  };
  const c = accents[accent] || accents.blue;
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #e5e2db",
        borderRadius: 12,
        padding: "1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "#888780",
          fontWeight: 500,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: "#1a1917",
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          style={{
            fontSize: 12,
            background: c.bg,
            color: c.text,
            borderRadius: 6,
            padding: "2px 8px",
            alignSelf: "flex-start",
            fontWeight: 500,
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    seller: { bg: "#E1F5EE", color: "#0F6E56" },
    buyer: { bg: "#E6F1FB", color: "#185FA5" },
    transporter: { bg: "#FAEEDA", color: "#854F0B" },
    admin: { bg: "#FCEBEB", color: "#A32D2D" },
  };
  const s = map[role] || { bg: "#F1EFE8", color: "#5F5E5A" };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 6,
        background: s.bg,
        color: s.color,
      }}
    >
      {role}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active: { bg: "#EAF3DE", color: "#3B6D11" },
    pending: { bg: "#FAEEDA", color: "#854F0B" },
    rejected: { bg: "#FCEBEB", color: "#A32D2D" },
    sold: { bg: "#E6F1FB", color: "#185FA5" },
  };
  const s = map[status] || { bg: "#F1EFE8", color: "#5F5E5A" };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 6,
        background: s.bg,
        color: s.color,
      }}
    >
      {status}
    </span>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, count }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <h2
        style={{ fontSize: 16, fontWeight: 500, margin: 0, color: "#1a1917" }}
      >
        {title}
      </h2>
      {count !== undefined && (
        <span
          style={{
            fontSize: 12,
            background: "#F1EFE8",
            color: "#5F5E5A",
            borderRadius: 20,
            padding: "1px 8px",
            fontWeight: 500,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Users table ──────────────────────────────────────────────────────────────
function UsersTable({ users, onRoleChange }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr style={{ borderBottom: "0.5px solid #e5e2db" }}>
            {["Name", "Email", "Role", "Verified", "Actions"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  fontWeight: 500,
                  color: "#888780",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "0.5px solid #f0ede6" }}>
              <td
                style={{
                  padding: "10px 12px",
                  color: "#1a1917",
                  fontWeight: 500,
                }}
              >
                {u.displayName || "—"}
              </td>
              <td style={{ padding: "10px 12px", color: "#7A7670" }}>
                {u.email}
              </td>
              <td style={{ padding: "10px 12px" }}>
                <RoleBadge role={u.role} />
              </td>
              <td
                style={{
                  padding: "10px 12px",
                  color: u.verified ? "#3B6D11" : "#888780",
                }}
              >
                {u.verified ? "✓ Yes" : "No"}
              </td>
              <td style={{ padding: "10px 12px" }}>
                <select
                  value={u.role}
                  onChange={(e) => onRoleChange(u.id, e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "0.5px solid #d3d1c7",
                    background: "#fff",
                    cursor: "pointer",
                    color: "#1a1917",
                  }}
                >
                  {["buyer", "seller", "transporter", "admin"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Listings table ───────────────────────────────────────────────────────────
function ListingsTable({ listings, onStatusChange }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr style={{ borderBottom: "0.5px solid #e5e2db" }}>
            {["Animal", "Breed", "Price", "Seller", "Status", "Actions"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    fontWeight: 500,
                    color: "#888780",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id} style={{ borderBottom: "0.5px solid #f0ede6" }}>
              <td
                style={{
                  padding: "10px 12px",
                  color: "#1a1917",
                  fontWeight: 500,
                }}
              >
                {l.animalType || "—"}
              </td>
              <td style={{ padding: "10px 12px", color: "#7A7670" }}>
                {l.breed || "—"}
              </td>
              <td style={{ padding: "10px 12px", color: "#1a1917" }}>
                {l.price ? `R${Number(l.price).toLocaleString()}` : "—"}
              </td>
              <td style={{ padding: "10px 12px", color: "#7A7670" }}>
                {l.sellerName || l.sellerId?.slice(0, 8) || "—"}
              </td>
              <td style={{ padding: "10px 12px" }}>
                <StatusBadge status={l.status || "pending"} />
              </td>
              <td style={{ padding: "10px 12px", display: "flex", gap: 6 }}>
                <button
                  onClick={() => onStatusChange(l.id, "active")}
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: "0.5px solid #9FE1CB",
                    background: "#E1F5EE",
                    color: "#0F6E56",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => onStatusChange(l.id, "rejected")}
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: "0.5px solid #F7C1C1",
                    background: "#FCEBEB",
                    color: "#A32D2D",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersSnap, listingsSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))),
          getDocs(
            query(collection(db, "listings"), orderBy("createdAt", "desc")),
          ),
        ]);
        setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setListings(listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Admin fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleRoleChange(uid, newRole) {
    await updateDoc(doc(db, "users", uid), { role: newRole });
    setUsers((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, role: newRole } : u)),
    );
  }

  async function handleListingStatus(listingId, status) {
    await updateDoc(doc(db, "listings", listingId), { status });
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, status } : l)),
    );
  }

  // Derived stats
  const stats = {
    totalUsers: users.length,
    sellers: users.filter((u) => u.role === "seller").length,
    buyers: users.filter((u) => u.role === "buyer").length,
    transporters: users.filter((u) => u.role === "transporter").length,
    totalListings: listings.length,
    pendingListings: listings.filter((l) => !l.status || l.status === "pending")
      .length,
    activeListings: listings.filter((l) => l.status === "active").length,
    verifiedUsers: users.filter((u) => u.verified).length,
  };

  const tabs = ["overview", "users", "listings"];

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "2rem 1.5rem",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 500,
            margin: "0 0 4px",
            color: "#1a1917",
          }}
        >
          Admin dashboard
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#888780" }}>
          Manage users, listings, and platform activity
        </p>
      </div>

      {/* Tab nav */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: "1.5rem",
          borderBottom: "0.5px solid #e5e2db",
          paddingBottom: 0,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none",
              border: "none",
              borderBottom:
                tab === t ? "2px solid #2D5A27" : "2px solid transparent",
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: tab === t ? 500 : 400,
              color: tab === t ? "#2D5A27" : "#7A7670",
              cursor: "pointer",
              marginBottom: -1,
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#888780", fontSize: 14 }}>Loading…</p>
      ) : (
        <>
          {/* Overview */}
          {tab === "overview" && (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 12,
                  marginBottom: "2rem",
                }}
              >
                <StatCard
                  label="Total users"
                  value={stats.totalUsers}
                  sub={`${stats.verifiedUsers} verified`}
                  accent="blue"
                />
                <StatCard
                  label="Sellers"
                  value={stats.sellers}
                  accent="green"
                />
                <StatCard label="Buyers" value={stats.buyers} accent="blue" />
                <StatCard
                  label="Transporters"
                  value={stats.transporters}
                  accent="amber"
                />
                <StatCard
                  label="Total listings"
                  value={stats.totalListings}
                  accent="blue"
                />
                <StatCard
                  label="Pending review"
                  value={stats.pendingListings}
                  sub="need action"
                  accent="amber"
                />
                <StatCard
                  label="Active listings"
                  value={stats.activeListings}
                  accent="green"
                />
              </div>

              {/* Pending listings quick view */}
              {stats.pendingListings > 0 && (
                <div
                  style={{
                    background: "#FAEEDA",
                    border: "0.5px solid #FAC775",
                    borderRadius: 12,
                    padding: "1rem 1.25rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: "#633806",
                      fontWeight: 500,
                    }}
                  >
                    ⚠ {stats.pendingListings} listing
                    {stats.pendingListings > 1 ? "s" : ""} waiting for approval
                  </p>
                  <button
                    onClick={() => setTab("listings")}
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      padding: "5px 14px",
                      borderRadius: 8,
                      border: "0.5px solid #EF9F27",
                      background: "#fff",
                      color: "#854F0B",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Review listings →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {tab === "users" && (
            <div
              style={{
                background: "#fff",
                border: "0.5px solid #e5e2db",
                borderRadius: 12,
                padding: "1rem 1.25rem",
              }}
            >
              <SectionHeader title="All users" count={users.length} />
              <UsersTable users={users} onRoleChange={handleRoleChange} />
            </div>
          )}

          {/* Listings */}
          {tab === "listings" && (
            <div
              style={{
                background: "#fff",
                border: "0.5px solid #e5e2db",
                borderRadius: 12,
                padding: "1rem 1.25rem",
              }}
            >
              <SectionHeader title="All listings" count={listings.length} />
              <ListingsTable
                listings={listings}
                onStatusChange={handleListingStatus}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
