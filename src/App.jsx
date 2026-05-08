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
import About           from './pages/About'
import Contact         from './pages/Contact'
import Terms           from './pages/Terms'
import VerifyIdentity, { VerificationGuard } from './pages/VerifyIdentity'

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Redirects unauthenticated users to /login
function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
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
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

// ─── AuthInit ─────────────────────────────────────────────────────────────────
function AuthInit() {
  const init = useAuthStore((s) => s.init)
  useEffect(() => {
    const unsubscribe = init()
    return unsubscribe
  }, [init])
  return null
}

// ─── Content protection ───────────────────────────────────────────────────────
function useContentProtection() {
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault()
    const handleKeyDown = (e) => {
      if (!e.key) return
      const key = e.key.toLowerCase()
      if (
        e.ctrlKey && ['c', 'u', 's', 'a', 'p', 'x'].includes(key) ||
        e.metaKey && ['c', 'u', 's', 'a', 'p', 'x'].includes(key) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key))
      ) {
        e.preventDefault()
      }
    }
    const handleCopy = (e) => e.preventDefault()
    const handleCut  = (e) => e.preventDefault()

    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('cut', handleCut)

    return () => {
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('cut', handleCut)
    }
  }, [])
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  useContentProtection()

  return (
    <BrowserRouter>
      <AuthInit />

      <Routes>
        {/* Public routes */}
        <Route path="/"             element={<Home />} />
        <Route path="/home"         element={<Navigate to="/" replace />} />
        <Route path="/marketplace"  element={<Marketplace />} />
        <Route path="/listings/:id" element={<ListingDetail />} />
        <Route path="/login"        element={<Login />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/about"        element={<About />} />
        <Route path="/contact"      element={<Contact />} />
        <Route path="/terms"        element={<Terms />} />

        {/* Identity verification — requires login, no verification check here */}
        <Route
          path="/verify"
          element={
            <ProtectedRoute>
              <VerifyIdentity />
            </ProtectedRoute>
          }
        />

        {/* Seller dashboard — login only */}
        <Route
          path="/seller/dashboard"
          element={
            <ProtectedRoute>
              <SellerDashboard />
            </ProtectedRoute>
          }
        />

        {/* List an animal — login AND identity verified */}
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App