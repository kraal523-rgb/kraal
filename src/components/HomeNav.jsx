import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/kraal-logo-black.svg";
import UserMenu from "./UserMenu";
import InstallButton from "./InstallButton";
import LanguageSwitcher from "./LanguageSwitcher";
import useAuthStore from "../store/useAuthStore";
import { useLang } from "../i18n/LanguageContext";
import "./HomeNav.css";
import { createPortal } from "react-dom";
const CATEGORIES = [
  { to: "/marketplace?category=cattle",   key: "cattle" },
  { to: "/marketplace?category=goats",   key: "goats" },
  { to: "/marketplace?category=sheep",  key: "sheep" },
  { to: "/marketplace?category=pigs",    key: "pigs" },
  { to: "/marketplace?category=chicken", key: "chicken" },
];

const WHATSAPP =
  "https://wa.me/263776109275?text=" + encodeURIComponent("Hi Kraal, I need help with...");

export default function HomeNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useLang();
  const { user } = useAuthStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get("q") || "");

  // Keep the drawer closed after navigating without syncing derived state in an effect.
  const drawerOpen = menuOpen;

  // lock page scroll and allow Escape while the drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    navigate(`/marketplace${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  return (
     <>
    <header className="home-nav">
      {/* 1. Utility bar (desktop) */}
      <div className="nav-util">
        <div className="nav-util-inner">
          <span>🇿🇼 {t("tagline")}</span>
          <div className="nav-util-right">
            <LanguageSwitcher />
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
              💬 {t("help")}
            </a>
          </div>
        </div>
      </div>

      {/* 2. Main bar */}
      <nav className="nav-main" aria-label="Main">
        <div className="nav-inner">
          <Link to="/" className="nav-logo" aria-label="Kraal home">
            <img src={logo} alt="Kraal" />
          </Link>

          <form className="nav-search" onSubmit={handleSearch} role="search">
            <span className="search-icon"><SearchIcon /></span>
            <input
              type="search"
              inputMode="search"
              placeholder={t("searchPlaceholder")}
              aria-label={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">{t("search")}</button>
          </form>

          <div className="nav-actions">
            <InstallButton />
            <UserMenu />
            <Link to="/sell" className="nav-cta" aria-label={t("sell")}>
              <span className="nav-cta-plus">+</span>
              <span className="nav-cta-label">{t("sell")}</span>
            </Link>
            <button
              className={`nav-hamburger ${menuOpen ? "is-open" : ""}`}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="nav-drawer"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* 3. Category strip (desktop) */}
      <div className="nav-cats">
        <div className="nav-cats-inner">
          <NavLink to="/marketplace" end className="nav-cat nav-cat-all">
            {t("allAnimals")}
          </NavLink>
          {CATEGORIES.map((c) => (
            <Link key={c.key} to={c.to} className="nav-cat">
              <span aria-hidden="true">{c.emoji}</span> {t(c.key)}
            </Link>
          ))}
          <span className="nav-cats-spacer" />
          <NavLink to="/blog" className="nav-cat nav-cat-minor">{t("tips")}</NavLink>
          <NavLink to="/about" className="nav-cat nav-cat-minor">{t("about")}</NavLink>
          <NavLink to="/contact" className="nav-cat nav-cat-minor">{t("contact")}</NavLink>
        </div>
      </div>

      {/* Mobile drawer */}
      
    </header>
    {createPortal(
        <>
         <div
        className={`nav-overlay ${drawerOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        id="nav-drawer"
        className={`nav-drawer ${drawerOpen ? "open" : ""}`}
        aria-hidden={!drawerOpen}
      >
        <div className="drawer-account">
          {user ? (
            <p className="drawer-welcome">
              👋 {t("welcome")},{" "}
              <strong>{user.displayName?.split(" ")[0] || user.email}</strong>
            </p>
          ) : (
            <div className="drawer-auth">
              <Link to="/login" className="drawer-btn drawer-btn-outline">{t("signIn")}</Link>
              <Link to="/register" className="drawer-btn drawer-btn-solid">{t("register")}</Link>
            </div>
          )}
        </div>

        <p className="drawer-label">{t("browse")}</p>
        <NavLink to="/marketplace" end>🛒 {t("allAnimals")}</NavLink>
        {CATEGORIES.map((c) => (
          <Link key={c.key} to={c.to}>{c.emoji} {t(c.key)}</Link>
        ))}

        <p className="drawer-label">{t("kraal")}</p>
        <NavLink to="/sell">➕ {t("sell")}</NavLink>
        <NavLink to="/blog">🌾 {t("tips")}</NavLink>
        <NavLink to="/about">{t("about")}</NavLink>
        <NavLink to="/contact">{t("contact")}</NavLink>

        <p className="drawer-label">{t("language")}</p>
        <LanguageSwitcher className="lang-switch-drawer" />

        <a className="drawer-wa" href={WHATSAPP} target="_blank" rel="noopener noreferrer">
          💬 {t("whatsapp")}
        </a>
      </aside>
        </>,
        document.body
      )}
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}