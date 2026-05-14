import React, { useState, useEffect, useRef } from "react";
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import useAuthStore from "../store/useAuthStore";
import "./ProfileSheet.css";

export default function ProfileSheet({ isOpen, onClose }) {
  const { user } = useAuthStore();
  const auth = getAuth();
  const sheetRef = useRef(null);

  const [section, setSection] = useState(null); // 'edit' | 'password'

  // Edit profile state
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Password state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Notification prefs
  const [notifEnquiries, setNotifEnquiries] = useState(true);
  const [notifPriceAlerts, setNotifPriceAlerts] = useState(false);
  const [notifMarketing, setNotifMarketing] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setPhone(user.phone || "");
      setLocation(user.location || "");
    }
  }, [user]);

  // Close on backdrop click
  useEffect(() => {
    if (!isOpen) setSection(null);
  }, [isOpen]);

  // Close on swipe down
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    let startY = 0;
    const onTouchStart = (e) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      if (e.changedTouches[0].clientY - startY > 80) onClose();
    };
    el.addEventListener("touchstart", onTouchStart);
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onClose]);

  const getInitials = () => {
    const name = user?.displayName || user?.email || "?";
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName,
        phone,
        location,
      });
      // Also update Firebase Auth display name
      await auth.currentUser?.updateProfile?.({ displayName });
      setProfileMsg({ type: "success", text: "Profile updated!" });
    } catch (err) {
      setProfileMsg({ type: "error", text: "Could not save. Try again." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdMsg(null);
    if (!newPwd || newPwd !== confirmPwd) {
      setPwdMsg({ type: "error", text: "Passwords don't match." });
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setPwdSaving(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPwd);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPwd);
      setPwdMsg({ type: "success", text: "Password updated successfully!" });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      const msg = err.code === "auth/wrong-password"
        ? "Current password is incorrect."
        : "Could not update password. Try again.";
      setPwdMsg({ type: "error", text: msg });
    } finally {
      setPwdSaving(false);
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    onClose();
  };

  const toggleSection = (name) => setSection(section === name ? null : name);

  if (!isOpen && !sheetRef.current) return null;

  return (
    <>
      <div
        className={`ps-backdrop ${isOpen ? "ps-backdrop-visible" : ""}`}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={`ps-sheet ${isOpen ? "ps-sheet-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Profile settings"
      >
        <div className="ps-handle" />

        <div className="ps-header">
          <span className="ps-title">My account</span>
          <button className="ps-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ps-scroll">
          {/* Profile hero */}
          <div className="ps-hero">
            <div className="ps-avatar">{getInitials()}</div>
            <div className="ps-hero-info">
              <div className="ps-hero-name">{user?.displayName || "Your Name"}</div>
              <div className="ps-hero-email">{user?.email}</div>
              {user?.verified && <span className="ps-verified">✓ Verified seller</span>}
            </div>
          </div>

          {/* Profile section */}
          <div className="ps-section">
            <div className="ps-section-label">Profile</div>

            <button className="ps-row" onClick={() => toggleSection("edit")}>
              <div className="ps-row-icon">✏️</div>
              <div className="ps-row-text">
                <div className="ps-row-label">Edit profile</div>
                <div className="ps-row-sub">Name, phone, location</div>
              </div>
              <span className={`ps-chevron ${section === "edit" ? "ps-chevron-open" : ""}`}>›</span>
            </button>

            {section === "edit" && (
              <div className="ps-panel">
                <div className="ps-field">
                  <label>Display name</label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="ps-field">
                  <label>Phone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+263 77 000 0000" type="tel" />
                </div>
                <div className="ps-field">
                  <label>Location</label>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Province" />
                </div>
                {profileMsg && (
                  <p className={`ps-msg ${profileMsg.type === "success" ? "ps-msg-ok" : "ps-msg-err"}`}>
                    {profileMsg.text}
                  </p>
                )}
                <button className="ps-save-btn" onClick={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}

            <button className="ps-row" onClick={() => toggleSection("password")}>
              <div className="ps-row-icon">🔒</div>
              <div className="ps-row-text">
                <div className="ps-row-label">Change password</div>
                <div className="ps-row-sub">Update your login password</div>
              </div>
              <span className={`ps-chevron ${section === "password" ? "ps-chevron-open" : ""}`}>›</span>
            </button>

            {section === "password" && (
              <div className="ps-panel">
                <div className="ps-field ps-field-eye">
                  <label>Current password</label>
                  <input type={showCurrentPwd ? "text" : "password"} value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} placeholder="••••••••" />
                  <button className="ps-eye" onClick={() => setShowCurrentPwd(!showCurrentPwd)} type="button">
                    {showCurrentPwd ? "🙈" : "👁"}
                  </button>
                </div>
                <div className="ps-field ps-field-eye">
                  <label>New password</label>
                  <input type={showNewPwd ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="••••••••" />
                  <button className="ps-eye" onClick={() => setShowNewPwd(!showNewPwd)} type="button">
                    {showNewPwd ? "🙈" : "👁"}
                  </button>
                </div>
                <div className="ps-field">
                  <label>Confirm new password</label>
                  <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="••••••••" />
                </div>
                {pwdMsg && (
                  <p className={`ps-msg ${pwdMsg.type === "success" ? "ps-msg-ok" : "ps-msg-err"}`}>
                    {pwdMsg.text}
                  </p>
                )}
                <button className="ps-save-btn" onClick={handleChangePassword} disabled={pwdSaving}>
                  {pwdSaving ? "Updating…" : "Update password"}
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="ps-section">
            <div className="ps-section-label">Notifications</div>
            <div className="ps-toggle-row">
              <span className="ps-toggle-label">New buyer enquiries</span>
              <button
                className={`ps-toggle ${notifEnquiries ? "ps-toggle-on" : ""}`}
                onClick={() => setNotifEnquiries(!notifEnquiries)}
                aria-label="Toggle enquiry notifications"
              />
            </div>
            <div className="ps-toggle-row">
              <span className="ps-toggle-label">Price alerts</span>
              <button
                className={`ps-toggle ${notifPriceAlerts ? "ps-toggle-on" : ""}`}
                onClick={() => setNotifPriceAlerts(!notifPriceAlerts)}
                aria-label="Toggle price alerts"
              />
            </div>
            <div className="ps-toggle-row">
              <span className="ps-toggle-label">Marketing emails</span>
              <button
                className={`ps-toggle ${notifMarketing ? "ps-toggle-on" : ""}`}
                onClick={() => setNotifMarketing(!notifMarketing)}
                aria-label="Toggle marketing emails"
              />
            </div>
          </div>

          {/* Sign out */}
          <div className="ps-section">
            <div className="ps-section-label">Account</div>
            <button className="ps-row ps-row-danger" onClick={handleSignOut}>
              <div className="ps-row-icon ps-row-icon-danger">🚪</div>
              <div className="ps-row-text">
                <div className="ps-row-label">Sign out</div>
              </div>
            </button>
          </div>

          <div style={{ height: "24px" }} />
        </div>
      </div>
    </>
  );
}