import { useState, useEffect, useCallback } from "react";
import ProvinceMapFilter from "../components/ProvinceMapFilter";
import logo from "../assets/kraal-logo.svg";
import navIcon from "../assets/kraal-logo.svg"
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-yN9hu266boJpX1CqgxSYeTaMubpXXws",
  authDomain: "zimbabweland-67218.firebaseapp.com",
  projectId: "zimbabweland-67218",
  storageBucket: "zimbabweland-67218.appspot.com",
  messagingSenderId: "397476483398",
  appId: "1:397476483398:web:21e145f45945134c511547"
};

let _app = null;
let _db = null;

async function getFirestore() {
  if (_db) return _db;
  const { initializeApp, getApps } =
    await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  const {
    getFirestore: initFS,
    collection,
    doc,
    getDoc,
    getDocs,
  } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

  if (!getApps().find((a) => a.name === "kraalmarket-geo")) {
    _app = initializeApp(FIREBASE_CONFIG, "kraalmarket-geo");
  } else {
    _app = getApps().find((a) => a.name === "kraalmarket-geo");
  }
  _db = initFS(_app);
  window.__geoFS = { collection, doc, getDoc, getDocs, db: _db };
  return _db;
}

// ============================================================
// Data helpers
// ============================================================
async function fetchProvinces() {
  await getFirestore();
  const { collection, getDocs, db } = window.__geoFS;
  const snap = await getDocs(collection(db, "provinces"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchDistricts(provinceId) {
  await getFirestore();
  const { collection, getDocs, db } = window.__geoFS;
  const snap = await getDocs(
    collection(db, `provinces/${provinceId}/districts`),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchTowns(provinceId) {
  await getFirestore();
  const { collection, getDocs, db } = window.__geoFS;
  const snap = await getDocs(collection(db, `provinces/${provinceId}/towns`));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============================================================
// Fallback placeholder image (South African landscapes)
// ============================================================
const PLACEHOLDER = (label, seed = 1) =>
  `https://picsum.photos/seed/${seed}/800/500`;

// ============================================================
// Sub-components
// ============================================================

function Breadcrumb({ trail, onNavigate }) {
  return (
    <nav className="breadcrumb">
      {trail.map((crumb, i) => (
        <span key={i}>
          {i > 0 && <span className="sep">›</span>}
          <button
            className={`crumb${i === trail.length - 1 ? " active" : ""}`}
            onClick={() => onNavigate(i)}
          >
            {crumb.label}
          </button>
        </span>
      ))}
    </nav>
  );
}

function ImageCard({ imgUrl, name, description, badge, onClick, accentColor }) {
  const [imgErr, setImgErr] = useState(false);
  const seed = name ? name.length + (name.charCodeAt(0) || 1) : 42;

  return (
    <div
      className="card"
      onClick={onClick}
      style={{ "--accent": accentColor || "#C2714F" }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <div className="card-img-wrap">
        <img
          src={imgErr || !imgUrl ? PLACEHOLDER(name, seed) : imgUrl}
          alt={name}
          onError={() => setImgErr(true)}
          className="card-img"
        />
        {badge && <span className="badge">{badge}</span>}
        <div className="card-overlay" />
      </div>
      <div className="card-body">
        <h3 className="card-title">{name || "—"}</h3>
        {description && <p className="card-desc">{description}</p>}
        {onClick && (
          <span className="card-cta">
            Explore <span className="arrow">→</span>
          </span>
        )}
      </div>
    </div>
  );
}

function DistrictDetail({ district }) {
  return (
    <div className="detail-panel">
      <div className="detail-img-wrap">
        <img
          src={
            district.imgUrl ||
            PLACEHOLDER(district.name, district.id?.length || 5)
          }
          alt={district.name}
          className="detail-img"
          onError={(e) => {
            e.target.src = PLACEHOLDER(district.name, 7);
          }}
        />
      </div>
      <div className="detail-info">
        <h2 className="detail-title">{district.name}</h2>
        {district.description && (
          <p className="detail-desc">{district.description}</p>
        )}
        {district.wards?.length > 0 && (
          <div className="wards-section">
            <h4 className="wards-label">Wards</h4>
            <div className="wards-grid">
              {district.wards.map((ward, i) => (
                <span key={i} className="ward-chip">
                  {ward}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TownGrid({ towns }) {
  return (
    <div className="towns-section">
      <h3 className="section-label">Towns</h3>
      <div className="towns-grid">
        {towns.map((town) => (
          <div key={town.id} className="town-card">
            <div className="town-img-wrap">
              <img
                src={
                  town.imgUrl ||
                  PLACEHOLDER(town.name, (town.name?.charCodeAt(0) || 3) + 10)
                }
                alt={town.name || town.id}
                className="town-img"
                onError={(e) => {
                  e.target.src = PLACEHOLDER(town.name, 12);
                }}
              />
            </div>
            <div className="town-info">
              <span className="town-name">{town.name || town.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Province detail view (districts + towns side by side)
// ============================================================
function ProvinceView({ province, onBack }) {
  const [districts, setDistricts] = useState([]);
  const [towns, setTowns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("districts");

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDistricts(province.id), fetchTowns(province.id)])
      .then(([d, t]) => {
        setDistricts(d);
        setTowns(t);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [province.id]);

  return (
    <div className="province-view">
      {/* Province hero */}
      <div className="pv-hero">
        <img
          src={
            province.imgUrl ||
            PLACEHOLDER(province.name, province.id?.length || 3)
          }
          alt={province.name}
          className="pv-hero-img"
          onError={(e) => {
            e.target.src = PLACEHOLDER(province.name, 3);
          }}
        />
        <div className="pv-hero-overlay" />
        <div className="pv-hero-content">
          <h1 className="pv-hero-title">{province.name}</h1>
          {province.description && (
            <p className="pv-hero-desc">{province.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn${tab === "districts" ? " active" : ""}`}
          onClick={() => {
            setTab("districts");
            setSelected(null);
          }}
        >
          Districts ({districts.length})
        </button>
        <button
          className={`tab-btn${tab === "towns" ? " active" : ""}`}
          onClick={() => {
            setTab("towns");
            setSelected(null);
          }}
        >
          Towns ({towns.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading data…</p>
        </div>
      ) : tab === "districts" ? (
        <div className="district-layout">
          <div className="district-list">
            {districts.map((d) => (
              <div
                key={d.id}
                className={`district-row${selected?.id === d.id ? " selected" : ""}`}
                onClick={() => setSelected(d)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelected(d)}
              >
                <div className="dr-img-wrap">
                  <img
                    src={
                      d.imgUrl || PLACEHOLDER(d.name, (d.id?.length || 2) + 20)
                    }
                    alt={d.name}
                    className="dr-img"
                    onError={(e) => {
                      e.target.src = PLACEHOLDER(d.name, 8);
                    }}
                  />
                </div>
                <div className="dr-info">
                  <span className="dr-name">{d.name}</span>
                  <span className="dr-wards">
                    {d.wards?.length || 0} ward
                    {d.wards?.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="dr-arrow">›</span>
              </div>
            ))}
            {districts.length === 0 && (
              <p className="empty">No districts found for this province.</p>
            )}
          </div>
          <div className="district-detail">
            {selected ? (
              <DistrictDetail district={selected} />
            ) : (
              <ProvinceMapFilter />
            )}
          </div>
        </div>
      ) : (
        <TownGrid towns={towns} />
      )}
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
export default function KraalMarketExplorer() {
  const [provinces, setProvinces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProvinces()
      .then(setProvinces)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const trail = [
    { label: "All Provinces" },
    ...(selected ? [{ label: selected.name }] : []),
  ];

  const handleNav = (idx) => {
    if (idx === 0) setSelected(null);
  };

  const ACCENT_COLORS = [
    "#C2714F",
    "#4A7C59",
    "#2E6B8E",
    "#8B4B8B",
    "#B8860B",
    "#C94F4F",
    "#4F7FA8",
    "#6B8E4E",
    "#A0522D",
    "#3E7B6F",
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Inter:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #F7F4EE;
          --surface: #FFFFFF;
          --text: #1C1C1C;
          --muted: #6B6456;
          --border: #E0D9CE;
          --accent: #C2714F;
          --accent2: #4A7C59;
          --dark: #1A1714;
          --radius: 12px;
          --shadow: 0 4px 24px rgba(0,0,0,0.10);
        }

        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); }

        /* ---- App shell ---- */
        .app-shell { min-height: 100vh; }

        /* ---- Header ---- */
        .app-header {
          background: var(--dark);
          padding: 20px 32px;
          display: flex;
          align-items: center;
          gap: 16px;
          position: sticky;
          top: 0;
          z-index: 100;
          border-bottom: 2px solid var(--accent);
        }
        .logo-mark {
          width: 40px; height: 40px;
          background: var(--accent);
          border-radius: 8px;
          display: grid; place-items: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .app-name {
          font-family: 'Playfair Display', serif;
          color: #F7F4EE;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .app-sub {
          color: #9B9085;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-left: auto;
        }

        /* ---- Breadcrumb ---- */
        .breadcrumb {
          padding: 14px 32px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }
        .sep { color: var(--muted); margin: 0 4px; }
        .crumb {
          background: none;
          border: none;
          color: var(--muted);
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
          transition: background 0.15s;
        }
        .crumb:hover { background: var(--border); color: var(--text); }
        .crumb.active { color: var(--accent); cursor: default; font-weight: 600; }

        /* ---- Province grid ---- */
        .page-content { padding: 32px; max-width: 1400px; margin: 0 auto; }
        .page-hero {
          margin-bottom: 32px;
        }
        .page-hero h2 {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          font-weight: 700;
          color: var(--dark);
          line-height: 1.15;
        }
        .page-hero p {
          color: var(--muted);
          margin-top: 8px;
          font-size: 15px;
        }
        .provinces-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        /* ---- Card ---- */
        .card {
          background: var(--surface);
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: var(--shadow);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1px solid var(--border);
        }
        .card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.16); }
        .card-img-wrap { position: relative; height: 200px; }
        .card-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .card-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(26,23,20,0.65) 0%, transparent 60%);
        }
        .badge {
          position: absolute; top: 12px; right: 12px;
          background: var(--accent);
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 100px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .card-body { padding: 20px; }
        .card-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
          color: var(--dark);
          margin-bottom: 8px;
        }
        .card-desc {
          color: var(--muted);
          font-size: 13.5px;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--accent);
          letter-spacing: 0.02em;
        }
        .arrow { transition: transform 0.2s; }
        .card:hover .arrow { transform: translateX(4px); }

        /* ---- Province view ---- */
        .province-view { animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

        .pv-hero {
          position: relative;
          height: 340px;
          overflow: hidden;
        }
        .pv-hero-img { width: 100%; height: 100%; object-fit: cover; }
        .pv-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to right, rgba(26,23,20,0.75) 0%, rgba(26,23,20,0.3) 100%);
        }
        .pv-hero-content {
          position: absolute;
          bottom: 0; left: 0;
          padding: 32px;
          max-width: 600px;
        }
        .pv-hero-title {
          font-family: 'Playfair Display', serif;
          font-size: 44px;
          font-weight: 700;
          color: #F7F4EE;
          line-height: 1.1;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .pv-hero-desc {
          color: rgba(247,244,238,0.85);
          font-size: 15px;
          margin-top: 10px;
          line-height: 1.55;
        }

        /* ---- Tabs ---- */
        .tab-bar {
          display: flex;
          gap: 0;
          background: var(--surface);
          border-bottom: 2px solid var(--border);
          padding: 0 32px;
        }
        .tab-btn {
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          padding: 16px 24px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: var(--muted);
          cursor: pointer;
          margin-bottom: -2px;
          transition: color 0.2s, border-color 0.2s;
        }
        .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
        .tab-btn:hover:not(.active) { color: var(--text); }

        /* ---- District layout ---- */
        .district-layout {
          display: grid;
          grid-template-columns: 360px 1fr;
          min-height: 480px;
          border-top: 1px solid var(--border);
        }
        .district-list {
          border-right: 1px solid var(--border);
          overflow-y: auto;
          max-height: 600px;
          background: var(--surface);
        }
        .district-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: background 0.15s;
        }
        .district-row:hover { background: var(--bg); }
        .district-row.selected { background: #FEF6F2; border-left: 3px solid var(--accent); }
        .dr-img-wrap { width: 56px; height: 42px; border-radius: 6px; overflow: hidden; flex-shrink: 0; }
        .dr-img { width: 100%; height: 100%; object-fit: cover; }
        .dr-info { flex: 1; min-width: 0; }
        .dr-name { display: block; font-weight: 600; font-size: 14px; color: var(--text); }
        .dr-wards { display: block; font-size: 12px; color: var(--muted); margin-top: 2px; }
        .dr-arrow { color: var(--muted); font-size: 18px; }

        /* ---- District detail ---- */
        .district-detail { padding: 32px; background: var(--bg); }
        .detail-placeholder {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 100%; min-height: 300px; color: var(--muted); gap: 12px;
        }
        .dp-icon { font-size: 48px; }
        .detail-panel { display: flex; flex-direction: column; gap: 24px; }
        .detail-img-wrap { border-radius: var(--radius); overflow: hidden; height: 240px; }
        .detail-img { width: 100%; height: 100%; object-fit: cover; }
        .detail-title {
          font-family: 'Playfair Display', serif;
          font-size: 28px; font-weight: 700; color: var(--dark);
        }
        .detail-desc { color: var(--muted); font-size: 14.5px; line-height: 1.6; margin-top: 8px; }
        .wards-section { margin-top: 16px; }
        .wards-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--muted); margin-bottom: 10px;
        }
        .wards-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .ward-chip {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 100px; padding: 4px 14px;
          font-size: 12.5px; font-weight: 500; color: var(--text);
        }

        /* ---- Towns ---- */
        .towns-section { padding: 32px; }
        .section-label {
          font-family: 'Playfair Display', serif;
          font-size: 22px; font-weight: 700; color: var(--dark); margin-bottom: 20px;
        }
        .towns-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .town-card {
          background: var(--surface);
          border-radius: var(--radius);
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .town-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .town-img-wrap { height: 120px; }
        .town-img { width: 100%; height: 100%; object-fit: cover; }
        .town-info { padding: 12px 14px; }
        .town-name { font-size: 13.5px; font-weight: 600; color: var(--dark); }

        /* ---- Loading & error ---- */
        .loading-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 80px 32px; gap: 16px; color: var(--muted);
        }
        .spinner {
          width: 36px; height: 36px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-banner {
          margin: 32px; padding: 20px 24px;
          background: #FEF2EE; border: 1px solid #F5C4B3;
          border-radius: var(--radius); color: #9B3A1C;
          font-size: 14px; line-height: 1.5;
        }
        .error-banner strong { display: block; margin-bottom: 6px; }
        .empty { color: var(--muted); padding: 24px; font-size: 14px; }

        /* ---- Config warning ---- */
        .config-warning {
          background: #FFFBE6; border: 1px solid #F5D84B;
          border-radius: var(--radius); padding: 16px 20px;
          font-size: 13px; color: #7A6500; margin: 16px 32px;
          display: flex; gap: 10px; align-items: flex-start;
        }
        .config-warning code {
          background: rgba(0,0,0,0.07); border-radius: 4px; padding: 1px 5px;
          font-size: 12px;
        }

        @media (max-width: 768px) {
          .page-content { padding: 20px; }
          .provinces-grid { grid-template-columns: 1fr; }
          .district-layout { grid-template-columns: 1fr; }
          .district-list { max-height: 300px; border-right: none; border-bottom: 1px solid var(--border); }
          .pv-hero { height: 220px; }
          .pv-hero-title { font-size: 28px; }
          .app-sub { display: none; }
        }
      `}</style>

      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <img src={logo} width={180} alt="" />
          <span className="app-sub">Geographic Explorer</span>
        </header>

        {/* Config warning if not yet set up */}
        {FIREBASE_CONFIG.apiKey === "YOUR_API_KEY" && (
          <div className="config-warning">
            <span>⚠️</span>
            <div>
              <strong>Firebase not configured.</strong> Replace the{" "}
              <code>FIREBASE_CONFIG</code> object at the top of this file with
              your actual Firebase project credentials to load live data.
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <Breadcrumb trail={trail} onNavigate={handleNav} />

        {/* Content */}
        {!selected ? (
          <div className="page-content">
            <div className="page-hero">
              <h2>Explore Zimbabwean Provinces</h2>
              <p>
                Select a province to browse its districts, towns, and wards.
              </p>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>Loading provinces…</p>
              </div>
            ) : error ? (
              <div className="error-banner">
                <strong>Failed to load provinces</strong>
                {error}
              </div>
            ) : (
              <div className="provinces-grid">
                {provinces.map((prov, i) => (
                  <ImageCard
                    key={prov.id}
                    imgUrl={prov.imgUrl}
                    name={prov.name}
                    description={prov.description}
                    badge="Province"
                    accentColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                    onClick={() => setSelected(prov)}
                  />
                ))}
                {provinces.length === 0 && !loading && (
                  <p className="empty">
                    No provinces found. Check your Firebase config and data
                    structure.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <ProvinceView province={selected} onBack={() => setSelected(null)} />
        )}
      </div>
    </>
  );
}
