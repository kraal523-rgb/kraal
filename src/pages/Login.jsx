import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import "./Login.css";
import logo from "../assets/kraal-logo.svg";

async function getRoleRedirect(uid, from) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const role = snap.data()?.role;

    if (role === "transporter") return "/driver";
    if (role === "seller" || role === "admin") return from || "/seller/dashboard";
    if (role === "buyer") return from || "/buyer";
    return from || "/";  
  } catch {
    return from || "/";
  }
}
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle } = useAuthStore();

 const from = location.state?.from?.pathname || null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

const handleEmail = async (e) => {
  e.preventDefault();
  setError(null);
  if (!email || !password) {
    setError("Please fill in all fields");
    return;
  }
  setLoading(true);
  try {
    const user = await signIn(email, password);             // ← no destructuring
    const redirect = await getRoleRedirect(user.uid, from);
    navigate(redirect, { replace: true });
  } catch (err) {
    setError(friendlyError(err.code));
  } finally {
    setLoading(false);
  }
};

const handleGoogle = async () => {
  setError(null);
  setLoading(true);
  try {
    const user = await signInWithGoogle();                  // ← no destructuring
    const redirect = await getRoleRedirect(user.uid, from);
    navigate(redirect, { replace: true });
  } catch (err) {
    setError(friendlyError(err.code));
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="login-page">
      {/* ── LEFT PANEL ── */}
      <div className="login-panel-left">
        <div className="lpl-inner">
          <Link to="/" className="login-logo">
            <img src={logo} style={{ width: "140px" }} alt="Kraal" />
          </Link>

          <div className="lpl-art" aria-hidden="true">
            <span className="lpa lpa-1">🐄</span>
            <span className="lpa lpa-2">🐐</span>
            <span className="lpa lpa-3">🐑</span>
            <span className="lpa lpa-4">🐓</span>
            <span className="lpa lpa-5">🦆</span>
          </div>

          <div className="lpl-copy">
            <h2>Welcome back to Kraal</h2>
            <p>
              Zimbabwe's livestock marketplace — connecting farmers and buyers
              across Africa and beyond.
            </p>
          </div>

          <div className="lpl-stats">
            <div className="lps">
              <strong>12k+</strong>
              <span>Sellers</span>
            </div>
            <div className="lps">
              <strong>45k+</strong>
              <span>Animals</span>
            </div>
            <div className="lps">
              <strong>5</strong>
              <span>Countries</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="login-panel-right">
        <div className="login-form-wrap">
          <div className="login-header">
            <h1>Sign in</h1>
            <p>
              Don't have an account?{" "}
              <Link to="/register">Create one free →</Link>
            </p>
          </div>

          {/* Google */}
          <button
            type="button"
            className="btn-google"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="login-divider">
            <span>or sign in with email</span>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmail} noValidate>
            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="login-field">
              <div className="field-label-row">
                <label htmlFor="password">Password</label>
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="password-wrap">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPass((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <AlertIcon />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-signin"
              disabled={loading || !email || !password}
            >
              {loading ? <Spinner /> : "Sign in"}
            </button>
          </form>

          <p className="login-register-nudge">
            New to Kraal?{" "}
            <Link to="/register">Create a free seller account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── helpers ── */
function friendlyError(code) {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a moment and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/popup-closed-by-user":
      return "Sign-in window was closed. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function KraalMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="17" fill="#2D5A27" />
      <text
        x="17"
        y="23"
        textAnchor="middle"
        fontSize="18"
        fill="white"
        fontFamily="Georgia, serif"
        fontWeight="bold"
      >
        K
      </text>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.075 17.64 11.767 17.64 9.2z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function Spinner() {
  return <span className="btn-spinner" aria-label="Loading" />;
}
