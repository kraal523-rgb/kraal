import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import useAuthStore from './store/useAuthStore'

// Pages
import Home            from './pages/Home'
import Marketplace     from './pages/Marketplace'
import ListingDetail   from './pages/ListingDetail'
import Login           from './pages/Login'
import Register        from './pages/auth/Register'
import SellerDashboard from './pages/SellerDashboard'
import SellAnimal      from './pages/seller/SellAnimal'
import About   from './pages/About'
import Contact from './pages/Contact'
import Terms   from './pages/Terms'
// ─────────────────────────────────────────────
// Protected route — redirects to /login if not
// signed in, and passes the attempted URL so
// the user is sent back there after signing in.
// ─────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
    // Avoid flashing the login page on a hard refresh
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: '#7A7670',
        gap: 12,
      }}>
        <span style={{
          display: 'inline-block',
          width: 24,
          height: 24,
          border: '3px solid #E4DDD2',
          borderTopColor: '#2D5A27',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        Loading…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) {
    // Save where they were trying to go
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

// ─────────────────────────────────────────────
// Auth initialiser — lives inside BrowserRouter
// so it can access the store but doesn't render
// anything itself.
// ─────────────────────────────────────────────
function AuthInit() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    // init() starts the Firebase onAuthStateChanged listener
    // and returns the unsubscribe function for cleanup.
    const unsubscribe = init()
    return unsubscribe
  }, [init])

  return null
}

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      {/* Starts Firebase auth listener once, at the root */}
      <AuthInit />

      <Routes>
        {/* ── Public routes ── */}
        <Route path="/"              element={<Home />} />
        <Route path="/home"          element={<Navigate to="/" replace />} />
        <Route path="/marketplace"   element={<Marketplace />} />
        <Route path="/listings/:id"  element={<ListingDetail />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/register"      element={<Register />} />
        <Route path="/about"   element={<About />} />
<Route path="/contact" element={<Contact />} />
<Route path="/terms"   element={<Terms />} />

        {/* ── Protected routes (must be signed in) ── */}
        <Route
          path="/seller/dashboard"
          element={
            <ProtectedRoute>
              <SellerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sell"
          element={
            <ProtectedRoute>
              <SellAnimal />
            </ProtectedRoute>
          }
        />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
