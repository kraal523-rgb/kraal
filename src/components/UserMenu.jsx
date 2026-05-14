import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import "./UserMenu.css";

export default function UserMenu() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  // Route to the correct dashboard based on the user's role
  const handleDashboard = () => {
    setOpen(false);
    const role = user?.role;
    if (role === "transporter") {
      navigate("/driver");
    } else if (role === "buyer") {
      navigate("/buyer");
    } else {
      // Default: seller dashboard (covers "seller" role or any unrecognised role)
      navigate("/seller/dashboard");
    }
  };

  // Derive initials and display name
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Account";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Detect if this user is a transporter (adjust the field name to match your Firestore schema)
  const isTransporter = user?.role === "transporter";

  if (!user) {
    // Not signed in — show the standard Sign In link
    return (
      <Link to="/login" className="um-signin">
        Sign in
      </Link>
    );
  }

  return (
    <div className="um-wrap" ref={menuRef}>
      <button
        className="um-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="um-avatar">{initials}</span>
        <span className="um-name">{displayName.split(" ")[0]}</span>
        <svg
          className={`um-chevron ${open ? "open" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="um-dropdown" role="menu">
          {/* User info header */}
          <div className="um-dropdown-header">
            <span className="um-dropdown-avatar">{initials}</span>
            <div className="um-dropdown-info">
              <span className="um-dropdown-name">{displayName}</span>
              <span className="um-dropdown-email">{user.email}</span>
            </div>
          </div>

          <div className="um-divider" />

          <Link
            to="/favourites"
            className="um-item"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Favourites
          </Link>

          <Link
            to="/orders"
            className="um-item"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Orders
          </Link>

          {isTransporter && (
            <Link
              to="/trips"
              className="um-item"
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 5v3h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              My Trips
            </Link>
          )}

          {/* Dashboard — navigates to the role-appropriate dashboard */}
          <button
            className="um-item"
            onClick={handleDashboard}
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </button>

          <div className="um-divider" />

          <button
            className="um-item um-signout"
            onClick={handleSignOut}
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}