import { useState, useCallback } from "react";
import { getAuth } from "firebase/auth";

const WORKER_URL =
  import.meta.env.VITE_UPLOAD_WORKER_URL ||
  "https://kraal-upload.kraal523.workers.dev";

// Set to true to let sellers whose documents are still in manual review post listings.
const ALLOW_PENDING = false;

const canPost = (s) => s === "approved" || (ALLOW_PENDING && s === "pending");

async function authHeader() {
  const token = await getAuth().currentUser?.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * Usage:
 *   const { requestPost, verifyModal, checking } = useSellerVerification({
 *     onVerified: () => navigate("/sell"),
 *   });
 *   <button onClick={requestPost}>+ New Listing</button>
 *   {verifyModal}
 *
 * requestPost() checks the seller's verification status. Approved sellers go
 * straight to onVerified; everyone else gets the verification modal.
 */
export function useSellerVerification({ onVerified }) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [state, setState] = useState("unverified");
  const [error, setError] = useState("");

  const requestPost = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch(`${WORKER_URL}/api/verify/status`, {
        headers: await authHeader(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (canPost(data.state)) {
        onVerified?.();
        return;
      }
      setState(data.state || "unverified");
      setOpen(true);
    } catch {
      setError("Could not check your verification status. Please try again.");
      setState("error");
      setOpen(true);
    } finally {
      setChecking(false);
    }
  }, [checking, onVerified]);

  const handleSubmitted = (newState) => {
    if (canPost(newState)) {
      setOpen(false);
      onVerified?.();
    } else {
      setState(newState || "pending");
    }
  };

  const verifyModal = open ? (
    <VerifyModal
      key={state}
      state={state}
      error={error}
      onClose={() => setOpen(false)}
      onRetry={() => {
        setOpen(false);
        requestPost();
      }}
      onSubmitted={handleSubmitted}
    />
  ) : null;

  return { requestPost, verifyModal, checking };
}

function VerifyModal({ state, error, onClose, onRetry, onSubmitted }) {
  const [idDoc, setIdDoc] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!idDoc || !selfie) {
      setErr("Please add both your ID and a selfie.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("idDocument", idDoc);
      fd.append("selfie", selfie);
      const res = await fetch(`${WORKER_URL}/api/verify/submit`, {
        method: "POST",
        headers: await authHeader(), // no Content-Type: the browser sets the boundary
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Verification failed. Please try again.");
      }
      onSubmitted(data.state);
    } catch (e) {
      setErr(e.message || "Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const isMessageOnly = state === "pending" || state === "error";

  return (
    <div className="sd-modal-overlay" onClick={onClose}>
      <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sd-modal-head">
          <div>
            <h2>🛡 Verify your identity</h2>
            <p>Sellers must be verified before posting livestock.</p>
          </div>
          <button className="sd-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="sd-modal-body">
          {state === "pending" && (
            <p>
              ⏳ Your documents are <strong>under review</strong>. You will be
              able to post as soon as you are approved.
            </p>
          )}

          {state === "error" && <p className="sd-ai-error">{error}</p>}

          {state === "rejected" && (
            <p className="sd-ai-error">
              Your last attempt didn't match. Please try again with a clear ID
              photo and a well-lit selfie.
            </p>
          )}

          {!isMessageOnly && (
            <div className="sd-form-grid">
              <div className="sd-form-group sd-form-full">
                <label>National ID / Passport (photo or PDF)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setIdDoc(e.target.files?.[0] || null)}
                />
              </div>
              <div className="sd-form-group sd-form-full">
                <label>Selfie (face clearly visible)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                />
              </div>
              <p className="sd-table-sub sd-form-full">
                Your ID is stored privately and only used to verify you.
              </p>
              {err && <p className="sd-ai-error sd-form-full">{err}</p>}
            </div>
          )}
        </div>

        <div className="sd-modal-foot">
          <button className="sd-btn-cancel" onClick={onClose}>
            {isMessageOnly ? "Close" : "Cancel"}
          </button>
          {state === "error" && (
            <button className="sd-btn-submit" onClick={onRetry}>
              Try again
            </button>
          )}
          {!isMessageOnly && (
            <button
              className="sd-btn-submit"
              onClick={submit}
              disabled={busy}
            >
              {busy ? "Verifying…" : "Submit for verification"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}