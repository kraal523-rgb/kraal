import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../lib/firebase"; 
import useAuthStore from "../store/useAuthStore";

// ── Worker base URL — change to your deployed worker URL ─────────────────────
const WORKER_URL = import.meta.env.VITE_WORKER_URL;

// ─── Hook: real-time verification status from Firestore ───────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useVerificationStatus() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState(undefined); // undefined = loading

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus(null);
      return;
    }

    const ref = doc(db, "users", user.uid, "verification", "status");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setStatus(snap.data());
        } else {
          setStatus({ state: "unverified" });
        }
      },
      (err) => {
        console.error("Firestore listen error:", err);
        setStatus({ state: "unverified" });
      },
    );

    return unsub;
  }, [user]);

  return status;
}

// ─── VerificationGuard ────────────────────────────────────────────────────────
export function VerificationGuard({ children }) {
  const navigate = useNavigate();
  const status = useVerificationStatus();

  // Still loading — show nothing yet
  if (status === undefined) return <LoadingScreen />;

  // Not verified → redirect to /verify
  if (!status || status.state === "unverified") {
    navigate("/verify", { replace: true });
    return null;
  }

  // Pending — show a holding screen rather than the sell page
  if (status.state === "pending") {
    return <PendingScreen />;
  }

  // Rejected — redirect to verify so they can resubmit
  if (status.state === "rejected") {
    navigate("/verify", { replace: true });
    return null;
  }

  // Approved ✓
  return children;
}

// ─── Helper: get Firebase ID token ───────────────────────────────────────────
async function getIdToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  return user.getIdToken();
}

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = ["intro", "id-upload", "selfie", "review", "done"];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VerifyIdentity() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const status = useVerificationStatus();

  const [step, setStep] = useState("intro");
  const [idFile, setIdFile] = useState(null);
  const [selfieData, setSelfieData] = useState(null);
  const [camError, setCamError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // If already pending/approved, jump to done screen
  useEffect(() => {
    if (status?.state === "pending" || status?.state === "approved") {
      setStep("done");
    }
  }, [status]);

  // ── Camera helpers ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCamError(
        "Camera access denied. Please allow camera permissions and try again.",
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    setSelfieData(canvas.toDataURL("image/jpeg", 0.85));
    stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (step === "selfie" && !selfieData) startCamera();
    return () => {
      if (step !== "selfie") stopCamera();
    };
  }, [step, selfieData, startCamera, stopCamera]);

  // ── File handling ───────────────────────────────────────────────────────────
  const handleIdFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdFile({ file, preview: URL.createObjectURL(file) });
  };

  // ── Submit to Cloudflare Worker ─────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Convert selfie base64 → Blob
      const selfieBlob = await fetch(selfieData).then((r) => r.blob());

      const formData = new FormData();
      formData.append("idDocument", idFile.file);
      formData.append("selfie", selfieBlob, "selfie.jpg");

      const token = await getIdToken();
      const res = await fetch(`${WORKER_URL}/api/verify/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Submission failed. Please try again.");
      }

      setStep("done");
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === undefined) return <LoadingScreen />;

  return (
    <div style={styles.page}>
      <div style={styles.bgNoise} />

      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </button>
        <div style={styles.logoMark}>
          <ShieldIcon />
        </div>
      </header>

      <main style={styles.card}>
        {step !== "done" && (
          <div style={styles.progressBar}>
            {["id-upload", "selfie", "review"].map((s, i) => (
              <div
                key={s}
                style={{
                  ...styles.progressDot,
                  background:
                    ["id-upload", "selfie", "review"].indexOf(step) >= i
                      ? "var(--green)"
                      : "var(--border)",
                }}
              />
            ))}
          </div>
        )}

        {step === "intro" && (
          <IntroStep onNext={() => setStep("id-upload")} status={status} />
        )}
        {step === "id-upload" && (
          <IdUploadStep
            idFile={idFile}
            fileInputRef={fileInputRef}
            onChange={handleIdFile}
            onNext={() => setStep("selfie")}
            onBack={() => setStep("intro")}
          />
        )}
        {step === "selfie" && (
          <SelfieStep
            videoRef={videoRef}
            canvasRef={canvasRef}
            selfieData={selfieData}
            camError={camError}
            onCapture={capture}
            onRetake={() => {
              setSelfieData(null);
              startCamera();
            }}
            onNext={() => setStep("review")}
            onBack={() => {
              stopCamera();
              setStep("id-upload");
            }}
          />
        )}
        {step === "review" && (
          <ReviewStep
            idFile={idFile}
            selfieData={selfieData}
            submitting={submitting}
            submitError={submitError}
            onSubmit={handleSubmit}
            onBack={() => setStep("selfie")}
          />
        )}
        {step === "done" && <DoneStep navigate={navigate} status={status} />}
      </main>

      <p style={styles.legal}>
        Your documents are encrypted in transit and stored securely in
        Cloudflare R2. They are never shared with buyers or third parties and
        are processed under POPIA.
      </p>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function IntroStep({ onNext, status }) {
  if (status?.state === "pending") {
    return (
      <div style={styles.stepWrap}>
        <StatusBadge label="Under Review" color="#D97706" />
        <h1 style={styles.h1}>Verification in progress</h1>
        <p style={styles.body}>
          We're reviewing your documents. This usually takes 1–2 business days.
          We'll notify you by email once approved.
        </p>
      </div>
    );
  }
  if (status?.state === "rejected") {
    return (
      <div style={styles.stepWrap}>
        <StatusBadge label="Verification Failed" color="#DC2626" />
        <h1 style={styles.h1}>Let's try again</h1>
        <p style={styles.body}>
          We couldn't verify your identity from the previous submission. Please
          re-upload a clear photo of your ID and retake your selfie.
        </p>
        <button style={styles.primaryBtn} onClick={onNext}>
          Try again →
        </button>
      </div>
    );
  }
  return (
    <div style={styles.stepWrap}>
      <h1 style={styles.h1}>Verify your identity</h1>
      <p style={styles.body}>
        To list animals on the marketplace, we need to confirm your identity. It
        only takes a couple of minutes.
      </p>
      <div style={styles.checklist}>
        {[
          [
            "🪪",
            "A photo of your ID document (ZIM ID, passport, or driver's licence)",
          ],
          ["🤳", "A quick selfie to match your face"],
          ["⏱", "Usually approved within 1–2 business days"],
        ].map(([icon, text]) => (
          <div key={text} style={styles.checkRow}>
            <span style={styles.checkIcon}>{icon}</span>
            <span style={styles.checkText}>{text}</span>
          </div>
        ))}
      </div>
      <button style={styles.primaryBtn} onClick={onNext}>
        Get started →
      </button>
    </div>
  );
}

function IdUploadStep({ idFile, fileInputRef, onChange, onNext, onBack }) {
  return (
    <div style={styles.stepWrap}>
      <StepLabel label="Step 1 of 2" />
      <h2 style={styles.h2}>Upload your ID document</h2>
      <p style={styles.body}>
        Take a clear photo of your <strong>ZIM ID</strong>,{" "}
        <strong>passport</strong>, or <strong>driver's licence</strong>. All
        four corners must be visible and text legible.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: "none" }}
        onChange={onChange}
      />

      {!idFile ? (
        <button
          style={styles.uploadZone}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              color: "var(--text-secondary)",
              marginTop: 8,
            }}
          >
            Tap to upload or take a photo
          </span>
          <span
            style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}
          >
            JPG, PNG or PDF · Max 10 MB
          </span>
        </button>
      ) : (
        <div style={styles.previewWrap}>
          {idFile.file.type === "application/pdf" ? (
            <div style={styles.pdfBadge}>📄 {idFile.file.name}</div>
          ) : (
            <img
              src={idFile.preview}
              alt="ID preview"
              style={styles.previewImg}
            />
          )}
          <button
            style={styles.ghostBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            Replace document
          </button>
        </div>
      )}

      <div style={styles.navRow}>
        <button style={styles.ghostBtn} onClick={onBack}>
          ← Back
        </button>
        <button
          style={{
            ...styles.primaryBtn,
            opacity: idFile ? 1 : 0.4,
            cursor: idFile ? "pointer" : "not-allowed",
          }}
          onClick={idFile ? onNext : undefined}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

function SelfieStep({
  videoRef,
  canvasRef,
  selfieData,
  camError,
  onCapture,
  onRetake,
  onNext,
  onBack,
}) {
  return (
    <div style={styles.stepWrap}>
      <StepLabel label="Step 2 of 2" />
      <h2 style={styles.h2}>Take a selfie</h2>
      <p style={styles.body}>
        Look directly at the camera with good lighting. Remove glasses or hats
        if possible.
      </p>

      <div style={styles.cameraWrap}>
        {camError ? (
          <div style={styles.camErrorBox}>
            <span style={{ fontSize: 28 }}>📷</span>
            <p
              style={{
                color: "var(--text-secondary)",
                textAlign: "center",
                fontSize: 14,
              }}
            >
              {camError}
            </p>
          </div>
        ) : selfieData ? (
          <img
            src={selfieData}
            alt="Selfie preview"
            style={styles.selfiePreview}
          />
        ) : (
          <video
            ref={videoRef}
            style={styles.video}
            muted
            playsInline
            autoPlay
          />
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {!selfieData && !camError && (
          <div style={styles.faceOverlay}>
            <svg
              viewBox="0 0 200 240"
              width="140"
              height="168"
              style={{ opacity: 0.55 }}
            >
              <ellipse
                cx="100"
                cy="120"
                rx="72"
                ry="90"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeDasharray="8 5"
              />
            </svg>
          </div>
        )}
      </div>

      <div style={styles.navRow}>
        <button style={styles.ghostBtn} onClick={onBack}>
          ← Back
        </button>
        {!selfieData ? (
          <button
            style={{ ...styles.primaryBtn, opacity: camError ? 0.4 : 1 }}
            onClick={camError ? undefined : onCapture}
          >
            📸 Capture
          </button>
        ) : (
          <>
            <button style={styles.ghostBtn} onClick={onRetake}>
              Retake
            </button>
            <button style={styles.primaryBtn} onClick={onNext}>
              Looks good →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewStep({
  idFile,
  selfieData,
  submitting,
  submitError,
  onSubmit,
  onBack,
}) {
  return (
    <div style={styles.stepWrap}>
      <h2 style={styles.h2}>Review & submit</h2>
      <p style={styles.body}>
        Check that both images are clear before submitting.
      </p>

      <div style={styles.reviewGrid}>
        <div style={styles.reviewItem}>
          <span style={styles.reviewLabel}>ID Document</span>
          {idFile?.file.type === "application/pdf" ? (
            <div style={styles.pdfBadge}>📄 {idFile.file.name}</div>
          ) : (
            <img src={idFile?.preview} alt="ID" style={styles.reviewImg} />
          )}
        </div>
        <div style={styles.reviewItem}>
          <span style={styles.reviewLabel}>Selfie</span>
          <img src={selfieData} alt="Selfie" style={styles.reviewImg} />
        </div>
      </div>

      {submitError && <div style={styles.errorBox}>⚠️ {submitError}</div>}

      <div style={styles.consentBox}>
        <span style={{ fontSize: 18 }}>🔒</span>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          By submitting, you confirm these documents are genuine and belong to
          you. Stored securely in Cloudflare R2 and processed under POPIA.
        </p>
      </div>

      <div style={styles.navRow}>
        <button style={styles.ghostBtn} onClick={onBack} disabled={submitting}>
          ← Back
        </button>
        <button
          style={{ ...styles.primaryBtn, minWidth: 160 }}
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? <Spinner /> : "Submit for review →"}
        </button>
      </div>
    </div>
  );
}

function DoneStep({ navigate, status }) {
  const isApproved = status?.state === "approved";
  const isRejected = status?.state === "rejected";
  return (
    <div
      style={{ ...styles.stepWrap, alignItems: "center", textAlign: "center" }}
    >
      <div style={styles.doneIcon}>
        {isApproved ? "✅" : isRejected ? "❌" : "⏳"}
      </div>
      <h2 style={styles.h2}>
        {isApproved
          ? "Verification approved!"
          : isRejected
            ? "Verification failed"
            : "Submitted successfully"}
      </h2>
      <p style={styles.body}>
        {isApproved
          ? "Your identity has been verified. You can now list animals on the marketplace."
          : isRejected
            ? "We could not verify your identity. Please resubmit with clearer documents."
            : "We'll review your documents within 1–2 business days and notify you by email."}
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 8,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button style={styles.ghostBtn} onClick={() => navigate("/")}>
          Go to home
        </button>
        {isApproved && (
          <button style={styles.primaryBtn} onClick={() => navigate("/sell")}>
            List an animal →
          </button>
        )}
        {isRejected && (
          <button
            style={styles.primaryBtn}
            onClick={() => window.location.reload()}
          >
            Resubmit →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Holding screens ──────────────────────────────────────────────────────────

function PendingScreen() {
  const navigate = useNavigate();
  return (
    <div style={styles.page}>
      <main
        style={{
          ...styles.card,
          maxWidth: 480,
          marginTop: 80,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48 }}>⏳</div>
        <h2 style={styles.h2}>Verification pending</h2>
        <p style={styles.body}>
          Your identity documents are under review. You'll be able to list
          animals once approved (usually 1–2 business days).
        </p>
        <button style={styles.ghostBtn} onClick={() => navigate("/")}>
          Back to home
        </button>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: "sans-serif",
        color: "#7A7670",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 22,
          height: 22,
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

// ─── Small UI atoms ───────────────────────────────────────────────────────────

function StepLabel({ label }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.08em",
        color: "var(--green)",
        textTransform: "uppercase",
        marginBottom: 4,
      }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ label, color }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: color + "22",
        color,
        borderRadius: 20,
        padding: "4px 12px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.06em",
        marginBottom: 12,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          display: "inline-block",
          width: 16,
          height: 16,
          border: "2.5px solid rgba(255,255,255,0.35)",
          borderTopColor: "#fff",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      Submitting…
    </span>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    "--green": "#2D5A27",
    "--green-light": "#3A7232",
    "--bg": "#F7F3EE",
    "--card-bg": "#FFFFFF",
    "--border": "#E4DDD2",
    "--text": "#1C1C1C",
    "--text-secondary": "#5A5550",
    "--text-muted": "#9A948E",
    "--font-display": "'Georgia', 'Times New Roman', serif",
    "--font-body": "'Helvetica Neue', Helvetica, Arial, sans-serif",
    minHeight: "100vh",
    background: "var(--bg)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 16px 48px",
    position: "relative",
    fontFamily: "var(--font-body)",
    color: "var(--text)",
  },
  bgNoise: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
  },
  header: {
    width: "100%",
    maxWidth: 560,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 0 16px",
    zIndex: 1,
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-secondary)",
    fontSize: 14,
    fontFamily: "var(--font-body)",
    padding: 4,
  },
  logoMark: {
    width: 44,
    height: 44,
    background: "white",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    border: "1px solid var(--border)",
  },
  card: {
    width: "100%",
    maxWidth: 560,
    background: "var(--card-bg)",
    borderRadius: 20,
    border: "1px solid var(--border)",
    boxShadow: "0 4px 32px rgba(0,0,0,0.07)",
    padding: "32px 36px",
    zIndex: 1,
  },
  progressBar: { display: "flex", gap: 8, marginBottom: 28 },
  progressDot: {
    height: 4,
    flex: 1,
    borderRadius: 4,
    transition: "background 0.3s ease",
  },
  stepWrap: { display: "flex", flexDirection: "column", gap: 16 },
  h1: {
    fontFamily: "var(--font-display)",
    fontSize: 26,
    fontWeight: 400,
    margin: 0,
    color: "var(--text)",
    lineHeight: 1.25,
  },
  h2: {
    fontFamily: "var(--font-display)",
    fontSize: 22,
    fontWeight: 400,
    margin: 0,
    color: "var(--text)",
    lineHeight: 1.3,
  },
  body: {
    fontSize: 15,
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.6,
  },
  checklist: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "#F7F3EE",
    borderRadius: 12,
    padding: "16px 20px",
    marginTop: 4,
  },
  checkRow: { display: "flex", alignItems: "flex-start", gap: 12 },
  checkIcon: { fontSize: 18, lineHeight: 1.5, flexShrink: 0 },
  checkText: { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 },
  primaryBtn: {
    alignSelf: "flex-end",
    background: "var(--green)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "13px 24px",
    fontSize: 15,
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "background 0.2s",
  },
  ghostBtn: {
    background: "none",
    border: "1.5px solid var(--border)",
    borderRadius: 10,
    padding: "11px 18px",
    fontSize: 14,
    fontFamily: "var(--font-body)",
    color: "var(--text-secondary)",
    cursor: "pointer",
  },
  navRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
    flexWrap: "wrap",
  },
  uploadZone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    border: "2px dashed var(--border)",
    borderRadius: 14,
    padding: "36px 20px",
    background: "#FAFAF8",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
    width: "100%",
    fontFamily: "var(--font-body)",
  },
  previewWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  previewImg: {
    width: "100%",
    maxHeight: 220,
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid var(--border)",
  },
  pdfBadge: {
    background: "#EEF4FF",
    color: "#3B5CB8",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 500,
    border: "1px solid #C7D5F5",
    width: "100%",
    textAlign: "center",
  },
  cameraWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "4/3",
    background: "#111",
    borderRadius: 16,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },
  selfiePreview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },
  faceOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  camErrorBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  reviewGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  reviewItem: { display: "flex", flexDirection: "column", gap: 8 },
  reviewLabel: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.07em",
    color: "var(--text-muted)",
    textTransform: "uppercase",
  },
  reviewImg: {
    width: "100%",
    aspectRatio: "4/3",
    objectFit: "cover",
    borderRadius: 10,
    border: "1px solid var(--border)",
  },
  consentBox: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "#F7F3EE",
    borderRadius: 12,
    padding: "14px 16px",
  },
  errorBox: {
    background: "#FEF2F2",
    border: "1px solid #FCA5A5",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 14,
    color: "#DC2626",
  },
  doneIcon: { fontSize: 52, lineHeight: 1 },
  legal: {
    maxWidth: 480,
    textAlign: "center",
    fontSize: 12,
    color: "var(--text-muted)",
    lineHeight: 1.6,
    marginTop: 20,
    zIndex: 1,
  },
};
