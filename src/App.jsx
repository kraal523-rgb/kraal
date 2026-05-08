import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import useAuthStore from "./store/useAuthStore";

// Pages
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import ListingDetail from "./pages/ListingDetail";
import Login from "./pages/Login";
import Register from "./pages/auth/Register";
import SellerDashboard from "./pages/SellerDashboard";
import SellAnimal from "./pages/seller/SellAnimal";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import VerifyIdentity, { VerificationGuard } from "./pages/VerifyIdentity";
import DriverDashboard from "./pages/DriverDashboard";

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <KraalSpinner />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// ─── DriverGuard ──────────────────────────────────────────────────────────────
// Sits INSIDE ProtectedRoute — user is already authenticated at this point.
// Checks Firestore users/{uid}.role === "transporter".
// If not a transporter → redirects to /marketplace with a flash message.
import { useState, useEffect as useEff } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./lib/firebase";

export function DriverGuard({ children }) {
  const { user } = useAuthStore();
  const [status, setStatus] = useState("loading"); // loading | allowed | denied

  useEff(() => {
    if (!user?.uid) {
      setStatus("denied");
      return;
    }

    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        const role = snap.data()?.role;
        setStatus(role === "transporter" ? "allowed" : "denied");
      })
      .catch(() => setStatus("denied"));
  }, [user?.uid]);

  if (status === "loading") return <KraalSpinner />;

  if (status === "denied") {
    return (
      <Navigate
        to="/marketplace"
        state={{
          notice:
            "Driver dashboard is only accessible to registered transport providers.",
        }}
        replace
      />
    );
  }

  return children;
}

// ─── AuthInit ─────────────────────────────────────────────────────────────────
function AuthInit() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);
  return null;
}

// ─── Shared spinner ───────────────────────────────────────────────────────────
function KraalSpinner() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        color: "#7A7670",
        gap: 12,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 24,
          height: 24,
          border: "3px solid #E4DDD2",
          borderTopColor: "#2D5A27",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      Loading…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Content protection ───────────────────────────────────────────────────────
function useContentProtection() {
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (!e.key) return;
      const key = e.key.toLowerCase();
      if (
        (e.ctrlKey && ["c", "u", "s", "a", "p", "x"].includes(key)) ||
        (e.metaKey && ["c", "u", "s", "a", "p", "x"].includes(key)) ||
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key))
      ) {
        e.preventDefault();
      }
    };
    const handleCopy = (e) => e.preventDefault();
    const handleCut = (e) => e.preventDefault();

    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);

    return () => {
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
    };
  }, []);
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  useContentProtection();

  return (
    <BrowserRouter>
      <AuthInit />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/listings/:id" element={<ListingDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />

        {/* Identity verification */}
        <Route
          path="/verify"
          element={
            <ProtectedRoute>
              <VerifyIdentity />
            </ProtectedRoute>
          }
        />

        {/* Seller dashboard */}
        <Route
          path="/seller/dashboard"
          element={
            <ProtectedRoute>
              <SellerDashboard />
            </ProtectedRoute>
          }
        />

        {/* List an animal */}
        <Route
          path="/sell"
          element={
            <ProtectedRoute>
              <VerificationGuard>
                <SellAnimal />
              </VerificationGuard>
            </ProtectedRoute>
          }
        />

        {/* Driver dashboard — login + transporter role required */}
        <Route
          path="/driver"
          element={
            <ProtectedRoute>
              <DriverGuard>
                <DriverDashboard />
              </DriverGuard>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
