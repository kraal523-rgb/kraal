// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import logo from "../assets/kraal-logo-black.svg";
import imgCattle from "../assets/pngegg__5.png";
import imgGoats from "../assets/pngegg__6.png";
import imgSheep from "../assets/pngegg__7.png";
import imgDucks from "../assets/duck-1.webp";
import imgGuinea from "../assets/pngegg__13.png";
import imgRabbits from "../assets/pngegg__14.png";
import imghen from "../assets/pngegg__9.png";
import imgHorse from "../assets/pngegg__20.png";
import imgTurkey from "../assets/pngegg__16.png";
import imgPig from "../assets/pngegg__18.png";
import imgDog from "../assets/pngegg__4.png";
import imgDonkey from "../assets/pngegg__3.png";
import imgGeese from "../assets/geese.png";
import imgCats from "../assets/cat.jpg";
import imgPigeons from "../assets/pigeon.jpg";
import imgGuineaPig from "../assets/guineapig.png";
import imgOstrich from "../assets/ostrich.png";
import imgQuail from "../assets/quail.png";
import "./Marketplace.css";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
// ─── DATA ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "cattle",     img: imgCattle,    label: "Cattle",        count: "1,240+" },
  { id: "goats",      img: imgGoats,     label: "Goats",         count: "890+"   },
  { id: "sheep",      img: imgSheep,     label: "Sheep",         count: "560+"   },
  { id: "chicken",    img: imghen,       label: "Road Runner",   count: "2,100+" },
  { id: "guinea",     img: imgGuinea,    label: "Guinea Fowl",   count: "340+"   },
  { id: "ducks",      img: imgDucks,     label: "Ducks",         count: "280+"   },
  { id: "geese",      img: imgGeese,     label: "Geese",         count: "120+"   },
  { id: "pigeons",    img: imgPigeons,   label: "Pigeons",       count: "95+"    },
  { id: "quail",      img: imgQuail,     label: "Quail",         count: "160+"   },
  { id: "rabbits",    img: imgRabbits,   label: "Rabbits",       count: "410+"   },
  { id: "guineapig",  img: imgGuineaPig, label: "Mbira (Cavia)", count: "75+"    },
  { id: "turkey",     img: imgTurkey,    label: "Turkey",        count: "190+"   },
  { id: "pigs",       img: imgPig,       label: "Pigs",          count: "320+"   },
  { id: "horses",     img: imgHorse,     label: "Horses",        count: "95+"    },
  { id: "donkeys",    img: imgDonkey,    label: "Donkeys",       count: "210+"   },
  { id: "dogs",       img: imgDog,       label: "Dogs",          count: "150+"   },
  { id: "cats",       img: imgCats,      label: "Cats",          count: "85+"    },
  { id: "ostrich",    img: imgOstrich,   label: "Ostrich",       count: "40+"    },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "popular", label: "Most Popular" },
];

const LOCATIONS = [
  "All Locations",
  "Harare",
  "Bulawayo",
  "Mutare",
  "Gweru",
  "Kwekwe",
  "Marondera",
  "Chinhoyi",
  "Masvingo",
  "Bindura",
  "Victoria Falls",
  "Beitbridge",
  "Karoi",
  "Chegutu",
  "Kadoma",
  "Zvishavane",
];

const PRICE_TICKER = [
  { label: "Brahman Bull", price: "USD 1,200", trend: "up" },
  { label: "Nguni Cow", price: "USD 850", trend: "up" },
  { label: "Boer Goat", price: "USD 180", trend: "down" },
  { label: "Road Runner", price: "USD 8", trend: "up" },
  { label: "Merino Ewe", price: "USD 220", trend: "up" },
  { label: "Duroc Pig", price: "USD 310", trend: "down" },
  { label: "Muscovy Duck", price: "USD 18", trend: "up" },
  { label: "Bronze Turkey", price: "USD 45", trend: "up" },
  { label: "Ankole Bull", price: "USD 1,500", trend: "up" },
];

const BANNER_ADS = [
  {
    id: 1,
    company: "AgriFeeds Zimbabwe",
    tagline: "Premium livestock feed — nationwide delivery",
    cta: "Shop now",
    url: "https://agrifeeds.co.zw",
    bg: "#1a3a1a",
    accent: "#a8d5a2",
  },
  {
    id: 2,
    company: "Vetsure Africa",
    tagline: "Vaccines & dewormers in stock",
    cta: "Order today",
    url: "https://vetsure.africa",
    bg: "#2d4a6a",
    accent: "#a2c4d5",
  },
];
const BANNER_SLIDES = [
  {
    categoryId: "cattle",
    img: "/src/assets/brahman-1.jpg",
    overlay: "linear-gradient(90deg, rgba(20,10,5,0.82) 0%, rgba(20,10,5,0.35) 60%, transparent 100%)",
    tag: "🐄 Cattle · Premium Listings",
    headline: "Brahman Bulls.\nTop bloodlines,\nbest prices.",
    sub: "1,240+ cattle listed across Zimbabwe. Verified sellers, no commission.",
    cta: "Browse Cattle",
  },
  {
    categoryId: "goats",
    img: "/src/assets/goats-2.jpg",
    overlay: "linear-gradient(90deg, rgba(10,25,10,0.80) 0%, rgba(10,25,10,0.30) 60%, transparent 100%)",
    tag: "🐐 Goats · New Listings Daily",
    headline: "Boer Goats.\nFarm-fresh,\nready to go.",
    sub: "890+ goats from trusted farmers across Mashonaland, Midlands & beyond.",
    cta: "Browse Goats",
  },
  {
    categoryId: "chicken",
    img: "/src/assets/pngegg__9.png",
    overlay: "linear-gradient(90deg, rgba(60,30,5,0.82) 0%, rgba(60,30,5,0.35) 60%, transparent 100%)",
    tag: "🐓 Road Runners · Best Sellers",
    headline: "Indigenous\nchickens.\nZimbabwe's favourite.",
    sub: "2,100+ Road Runners listed. Buy in bulk, get the best per-bird price.",
    cta: "Browse Road Runners",
  },
  {
    categoryId: "pigs",
    img: "/src/assets/pngegg__18.png",
    overlay: "linear-gradient(90deg, rgba(15,15,40,0.82) 0%, rgba(15,15,40,0.35) 60%, transparent 100%)",
    tag: "🤝 Sell on Kraal · It's Free",
    headline: "Reach buyers\nacross Africa.\nNo middlemen.",
    sub: "Post your listing in 5 minutes. Buyers contact you directly on WhatsApp.",
    cta: "Start Selling Free",
  },
  {
    categoryId: "all",
    img: "/src/assets/pngegg__5.png",
    overlay: "linear-gradient(90deg, rgba(30,15,5,0.80) 0%, rgba(30,15,5,0.30) 60%, transparent 100%)",
    tag: "🌍 All Animals · Southern Africa",
    headline: "Zimbabwe's #1\nlivestock\nmarketplace.",
    sub: "Cattle, goats, chickens, pigs and more — from farm gate to your door.",
    cta: "Browse All Animals",
  },
];
const VIDEO_ADS = [
  {
    id: 1,
    company: "ProNutro Feeds",
    thumbnail: null,
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    label: "Sponsored",
  },
  {
    id: 2,
    company: "Zimbabwe Farmers Union",
    thumbnail: null,
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    label: "Sponsored",
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getDaysAgo(createdAt) {
  if (!createdAt?.seconds) return 0;
  return Math.floor((Date.now() / 1000 - createdAt.seconds) / 86400);
}

function getCategoryEmoji(categoryId) {
  const map = {
    cattle:    "🐄",
    goats:     "🐐",
    sheep:     "🐑",
    chicken:   "🐓",
    guinea:    "🦅",
    ducks:     "🦆",
    geese:     "🪿",
    pigeons:   "🕊️",
    quail:     "🐦",
    rabbits:   "🐇",
    guineapig: "🐹",
    turkey:    "🦃",
    pigs:      "🐖",
    horses:    "🐴",
    donkeys:   "🫏",
    dogs:      "🐕",
    cats:      "🐱",
    ostrich:   "🦤",
    other:     "🐾",
  };
  return map[categoryId] || "🐾";
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function Marketplace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
const { t } = useTranslation();
  // ── Firestore state ──
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
const catScrollRef = useRef(null);
  // ── Filter / UI state ──
const [search, setSearch] = useState(searchParams.get("q") || "");
const [category, setCategory] = useState(searchParams.get("category") || "all");
const [location, setLocation] = useState(searchParams.get("location") || "All Locations");
  const [sortBy, setSortBy] = useState("newest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedItems, setSavedItems] = useState(new Set());
  const [activeModal, setActiveModal] = useState(null);
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [page, setPage] = useState(1);
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeSidebarAd, setActiveSidebarAd] = useState(0);
  const PER_PAGE = 12;
  const cardRefs = useRef({});
const [prevBanner, setPrevBanner] = useState(null);
const goToSlide = (i) => {
  setPrevBanner(activeBanner);
  setActiveBanner(i);
  setTimeout(() => setPrevBanner(null), 600);
};
const [recentlyViewed, setRecentlyViewed] = useState([]);
// Auto-rotate every 5 seconds
useEffect(() => {
  const t = setInterval(() => {
    goToSlide((activeBanner + 1) % BANNER_SLIDES.length);
  }, 5000);
  return () => clearInterval(t);
}, [activeBanner]);
const openModal = (id) => {
  setActiveModal(id);
  const listing = listings.find(l => l.id === id);
  if (listing) {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(l => l.id !== id);
      return [listing, ...filtered].slice(0, 8);
    });
  }
};
  // ── Fetch from Firestore ──
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const q = query(
          collection(db, "listings"),
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setListings(data);
      } catch (err) {
        console.error("Failed to fetch listings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);
// Auto-rotate category carousel
useEffect(() => {
  const track = catScrollRef.current;
  if (!track) return;

  let animId;
  let pos = 0;
  const speed = 0.6; // px per frame — increase for faster

  const step = () => {
    pos += speed;
    // When we've scrolled half (one full set), reset silently to start
    if (pos >= track.scrollWidth / 2) {
      pos = 0;
    }
    track.scrollLeft = pos;
    animId = requestAnimationFrame(step);
  };

  animId = requestAnimationFrame(step);

  // Pause on hover or touch
  const pause = () => cancelAnimationFrame(animId);
  const resume = () => { animId = requestAnimationFrame(step); };

  track.addEventListener('mouseenter', pause);
  track.addEventListener('mouseleave', resume);
  track.addEventListener('touchstart', pause, { passive: true });
  track.addEventListener('touchend', resume);

  return () => {
    cancelAnimationFrame(animId);
    track.removeEventListener('mouseenter', pause);
    track.removeEventListener('mouseleave', resume);
    track.removeEventListener('touchstart', pause);
    track.removeEventListener('touchend', resume);
  };
}, []);
  // ── Sync URL params ──
useEffect(() => {
  const cat = searchParams.get("category") || "all";
  const q = searchParams.get("q") || "";
  const loc = searchParams.get("location") || "All Locations";
  setCategory(cat);
  setSearch(q);
  setLocation(loc);
  setPage(1);
}, [searchParams]);

  // ── Card entrance animations ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisibleCards((prev) => new Set([...prev, e.target.dataset.id]));
          }
        });
      },
      { threshold: 0.1 },
    );
    Object.values(cardRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  });

  // ── Banner rotation ──
useEffect(() => {
  const t = setInterval(() => {
    setActiveSidebarAd((i) => (i + 1) % BANNER_ADS.length);
  }, 6000);
  return () => clearInterval(t);
}, []);

  // ── FIX 1: filtered now uses `listings` (Firestore data), not hardcoded array ──
const filtered = useMemo(() => {
  let list = [...listings];

  if (category && category !== "all")
    list = list.filter((l) => l.categoryId === category); // ← fixed

  if (location && location !== "All Locations")
    list = list.filter((l) =>
      [l.city, l.province, l.location].join(" ").includes(location)
    );

  if (search.trim())
    list = list.filter((l) =>
      [l.title, l.breed, l.city, l.province, l.location, l.description]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  if (priceMin) list = list.filter((l) => l.price >= Number(priceMin));
  if (priceMax) list = list.filter((l) => l.price <= Number(priceMax));

  switch (sortBy) {
    case "price_asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "popular":
      list.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    default:
      break;
  }

  return list;
}, [listings, category, location, search, priceMin, priceMax, sortBy]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSave = (id) => {
    setSavedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setLocation("All Locations");
    setPriceMin("");
    setPriceMax("");
    setSortBy("newest");
    setPage(1);
  };

  // ── FIX 2: activeListing now looks up from `listings` (Firestore data) ──
  const activeListing = activeModal
    ? listings.find((l) => l.id === activeModal)
    : null;

  const hasFilters =
    search ||
    category !== "all" ||
    location !== "All Locations" ||
    priceMin ||
    priceMax;

  return (
    <div className="mp">
      {/* ── PRICE TICKER ── */}
      <div className="mp-ticker" aria-label="Live market prices">
        <div className="mp-ticker-label">📊 Live Prices</div>
        <div className="mp-ticker-scroll">
          <div className="mp-ticker-track">
            {[...PRICE_TICKER, ...PRICE_TICKER].map((item, i) => (
              <span key={i} className="mp-ticker-item">
                <span className="mpt-label">{item.label}</span>
                <span className={`mpt-price ${item.trend}`}>
                  {item.price}
                  <span className="mpt-arrow">
                    {item.trend === "up" ? "↑" : "↓"}
                  </span>
                </span>
                <span className="mpt-sep">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── NAV ── */}
      <nav className="mp-nav">
        <div className="mp-nav-inner">
          <Link to="/" className="mp-nav-logo">
            <img src={logo} style={{ width: "120px" }} alt="Kraal" />
            <span className="mp-nav-logo-text">Market</span>
          </Link>
          <button
            className={`mp-hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`mp-nav-links ${menuOpen ? "open" : ""}`}>
            <Link to="/marketplace" className="active" onClick={() => setMenuOpen(false)}>
              Browse Animals
            </Link>
            <Link to="/marketplace?category=cattle" onClick={() => setMenuOpen(false)}>Cattle</Link>
            <Link to="/marketplace?category=goats" onClick={() => setMenuOpen(false)}>Goats</Link>
            <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
          
          </div>
          <div className="mp-nav-actions">
            <LanguageSwitcher />
            <Link to="/register" className="mp-nav-cta">
              + Post
            </Link>
            <Link to="/login" className="mp-nav-signin">
              Sign in
            </Link>
          </div>
        </div>
      </nav>
<div className="mp-trust-bar">
  {[
    { icon: "✅", text: "Verified sellers only" },
    { icon: "📲", text: "Contact via WhatsApp" },
    { icon: "🆓", text: "Free to list" },
    { icon: "🌍", text: "Pan-African reach" },
  ].map(item => (
    <span key={item.text} className="mp-trust-item">
      {item.icon} {item.text}
    </span>
  ))}
</div>
      {/* ── PAGE HEADER ── */}
  {/* ── HEADER BANNER CAROUSEL ── */}
<div className="mp-header">
  <div className="mp-banner-carousel">
    {BANNER_SLIDES.map((slide, i) => (
      <div
        key={i}
        className={`mp-banner-slide ${i === activeBanner ? "active" : ""} ${
          i === prevBanner ? "exit" : ""
        }`}
        style={{ "--slide-bg": slide.bg }}
      >
        <img src={slide.img} alt={slide.headline} className="mp-banner-bg" />
        <div className="mp-banner-overlay" style={{ background: slide.overlay }} />
        <div className="mp-banner-content">
          <div className="mp-banner-text">
            <span className="mp-banner-tag">{slide.tag}</span>
            <h1 className="mp-banner-headline">{slide.headline}</h1>
            <p className="mp-banner-sub">{slide.sub}</p>
            <button
              className="mp-banner-cta"
              onClick={() => {
                setCategory(slide.categoryId);
                setPage(1);
              }}
            >
              {slide.cta} →
            </button>
          </div>
          <div className="mp-banner-search-wrap">
            <form
              className="mp-searchbar"
              onSubmit={(e) => { e.preventDefault(); setPage(1); }}
            >
              <span className="mp-search-icon"><SearchIcon /></span>
              <input
                type="text"
                placeholder={t("search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="mp-search-clear" onClick={() => setSearch("")}>✕</button>
              )}
               <button>{t('search.button')}</button>
            </form>
            <p className="mp-banner-count">
              <strong>{filtered.length}</strong> listing{filtered.length !== 1 ? "s" : ""} found
              {location !== "All Locations" ? ` in ${location}` : " across Zimbabwe & Southern Africa"}
            </p>
          </div>
        </div>

        {/* Slide dots */}
        <div className="mp-banner-dots">
          {BANNER_SLIDES.map((_, di) => (
            <button
              key={di}
              className={`mp-banner-dot ${di === activeBanner ? "active" : ""}`}
              onClick={() => goToSlide(di)}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="mp-banner-progress">
          <div className={`mp-banner-progress-bar ${i === activeBanner ? "running" : ""}`} />
        </div>
      </div>
    ))}
  </div>
</div>

     {/* ── CATEGORY PILLS CAROUSEL ── */}
<div className="mp-cats-wrap">
  <button
    className="mp-cats-arrow left"
    onClick={() => catScrollRef.current?.scrollBy({ left: -280, behavior: 'smooth' })}
    aria-label="Scroll left"
  >
    ‹
  </button>

  <div className="mp-cats-viewport">
    <div className="mp-cats-track" ref={catScrollRef}>
      {/* Render twice for seamless infinite loop */}
      {[...CATEGORIES, ...CATEGORIES].map((cat, i) => (
        <button
          key={`${cat.id}-${i}`}
          className={`mp-cat-pill ${category === cat.id ? "active" : ""}`}
          onClick={() => {
            setCategory(cat.id);
            setPage(1);
          }}
        >
          {cat.img ? (
            <img src={cat.img} alt={cat.label} className="mp-pill-img" />
          ) : (
            <span className="mp-pill-emoji">{cat.emoji}</span>
          )}
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  </div>

  <button
    className="mp-cats-arrow right"
    onClick={() => catScrollRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}
    aria-label="Scroll right"
  >
    ›
  </button>
</div>
      {/* ── MAIN LAYOUT ── */}
      <div className="mp-layout">
        {/* ── SIDEBAR ── */}
        <aside className={`mp-sidebar ${sidebarOpen ? "open" : ""}`}>
         {/* Banner Ad — sidebar */}
<div
  className="mp-ad-banner"
  style={{ background: BANNER_ADS[activeSidebarAd].bg }}
>
  <span className="mp-ad-label">Ad</span>
  <p className="mp-ad-company">{BANNER_ADS[activeSidebarAd].company}</p>
  <p className="mp-ad-tagline">{BANNER_ADS[activeSidebarAd].tagline}</p>
  
   <a href={BANNER_ADS[activeSidebarAd].url}
    target="_blank"
    rel="noopener noreferrer"
    className="mp-ad-cta"
    style={{
      color: BANNER_ADS[activeSidebarAd].accent,
      borderColor: BANNER_ADS[activeSidebarAd].accent,
    }}
  >
    {BANNER_ADS[activeSidebarAd].cta} →
  </a>
  <div className="mp-ad-dots">
    {BANNER_ADS.map((_, i) => (
      <button
        key={i}
        className={`mp-ad-dot ${i === activeSidebarAd ? "active" : ""}`}
        onClick={() => setActiveSidebarAd(i)}
      />
    ))}
  </div>
</div>

          {/* Filters header */}
          <div className="mp-sidebar-header">
           <h3>{t('filters.title')}</h3>
            {hasFilters && (
              <button className="mp-clear-btn" onClick={clearFilters}>
                Clear all
              </button>
            )}
            <button
              className="mp-sidebar-close"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Location */}
          <div className="mp-filter-group">
            <label className="mp-filter-label">📍 Location</label>
            <select
              className="mp-filter-select"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
            >
              {LOCATIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Price range */}
          <div className="mp-filter-group">
            <label className="mp-filter-label">💵 Price Range (USD)</label>
            <div className="mp-price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => {
                  setPriceMin(e.target.value);
                  setPage(1);
                }}
                className="mp-price-input"
              />
              <span className="mp-price-dash">–</span>
              <input
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => {
                  setPriceMax(e.target.value);
                  setPage(1);
                }}
                className="mp-price-input"
              />
            </div>
          </div>

          {/* Quick price filters */}
          <div className="mp-filter-group">
            <label className="mp-filter-label">Quick Price</label>
            <div className="mp-quick-prices">
              {[
                { label: "Under $50", min: "", max: "50" },
                { label: "$50–$200", min: "50", max: "200" },
                { label: "$200–$500", min: "200", max: "500" },
                { label: "$500–$1,000", min: "500", max: "1000" },
                { label: "Over $1,000", min: "1000", max: "" },
              ].map((q) => (
                <button
                  key={q.label}
                  className={`mp-quick-price ${priceMin === q.min && priceMax === q.max ? "active" : ""}`}
                  onClick={() => {
                    setPriceMin(q.min);
                    setPriceMax(q.max);
                    setPage(1);
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Animal category list */}
          <div className="mp-filter-group">
            <label className="mp-filter-label">🐾 Animal Type</label>
            <div className="mp-cat-filter-list">
              {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                <button
                  key={cat.id}
                  className={`mp-cat-filter-item ${category === cat.id ? "active" : ""}`}
                  onClick={() => {
                    setCategory(cat.id);
                    setPage(1);
                    setSidebarOpen(false);
                  }}
                >
                  {cat.img ? (
                    <img src={cat.img} alt={cat.label} className="mp-cfi-img" />
                  ) : (
                    <span>🐾</span>
                  )}
                  <span>{cat.label}</span>
                  {/* FIX 1 also: category counts use live listings */}
                  <span className="mp-cfi-count">
                    {listings.filter((l) => l.categoryId === cat.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {savedItems.size > 0 && (
            <div className="mp-filter-group">
              <label className="mp-filter-label">
                ❤️ Saved ({savedItems.size})
              </label>
              <button
                className="mp-saved-btn"
                onClick={() => {
                  setCategory("all");
                  setSearch("");
                }}
              >
                View saved listings
              </button>
            </div>
          )}

          {/* Video Ads */}
          <div className="mp-video-ads">
            <p className="mp-video-ads-label">Sponsored</p>
            {VIDEO_ADS.map((ad) => (
              <a
                key={ad.id}
                href={ad.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mp-video-ad"
              >
                <div className="mp-video-thumb">
                  {ad.thumbnail ? (
                    <img src={ad.thumbnail} alt={ad.company} />
                  ) : (
                    <div className="mp-video-placeholder">
                      <span className="mp-play-icon">▶</span>
                    </div>
                  )}
                </div>
                <div className="mp-video-info">
                  <p className="mp-video-company">{ad.company}</p>
                  <span className="mp-video-tag">{ad.label}</span>
                </div>
              </a>
            ))}
          </div>
        </aside>

        {/* Sidebar overlay */}
        {sidebarOpen && (
          <div
            className="mp-sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}
{/* Recently Viewed */}
{recentlyViewed.length > 0 && (
  <section className="mp-recent">
    <h2 className="mp-section-title">Recently Viewed</h2>
    <div className="mp-recent-track">
      {recentlyViewed.map(l => (
        <div key={l.id} className="mp-recent-card" onClick={() => setActiveModal(l.id)}>
          <div className="mp-recent-img">
            {l.photos?.[0]?.url
              ? <img src={l.photos[0].url} alt={l.title} />
              : <span>{getCategoryEmoji(l.categoryId)}</span>}
          </div>
          <p className="mp-recent-title">{l.title}</p>
          <p className="mp-recent-price">USD {l.price?.toLocaleString()}</p>
        </div>
      ))}
    </div>
  </section>
)}
        {/* ── CONTENT ── */}
        <main className="mp-content">
          {/* Toolbar */}
          <div className="mp-toolbar">
            <button
              className="mp-filter-toggle"
              onClick={() => setSidebarOpen(true)}
            >
              <FilterIcon /> Filters
              {hasFilters && <span className="mp-filter-badge">•</span>}
            </button>
            <div className="mp-sort">
              <label htmlFor="sort-select">Sort:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="mp-sort-select"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="mp-active-filters">
              {search && (
                <span className="mp-chip">
                  🔍 "{search}" <button onClick={() => setSearch("")}>✕</button>
                </span>
              )}
              {category !== "all" && (
                <span className="mp-chip">
                  {CATEGORIES.find((c) => c.id === category)?.label}
                  <button onClick={() => setCategory("all")}>✕</button>
                </span>
              )}
              {location !== "All Locations" && (
                <span className="mp-chip">
                  📍 {location}
                  <button onClick={() => setLocation("All Locations")}>
                    ✕
                  </button>
                </span>
              )}
              {(priceMin || priceMax) && (
                <span className="mp-chip">
                  💵 {priceMin || "0"} – {priceMax || "∞"} USD
                  <button
                    onClick={() => {
                      setPriceMin("");
                      setPriceMax("");
                    }}
                  >
                    ✕
                  </button>
                </span>
              )}
              <button className="mp-chip mp-chip-clear" onClick={clearFilters}>
                Clear all
              </button>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="mp-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="mp-card skeleton">
                  <div
                    className="mp-card-media"
                    style={{ background: "#eee" }}
                  />
                  <div className="mp-card-body">
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && paginated.length === 0 && (
            <div className="mp-empty">
              <span className="mp-empty-emoji">🐾</span>
              <h3>No listings found</h3>
              <p>Try adjusting your filters or search term.</p>
              <button className="mp-empty-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          )}

          {/* Grid */}
          {!loading && paginated.length > 0 && (
            <div className="mp-grid">
              {paginated.map((listing, i) => {
                // FIX 3: compute daysAgo from Firestore Timestamp
                const daysAgo = getDaysAgo(listing.createdAt);
                const emoji =
                  listing.emoji || getCategoryEmoji(listing.categoryId);
                const firstPhoto = listing.photos?.[0]?.url;
                const isNew  = daysAgo === 0;
  const isHot  = (listing.views || 0) > 50;
  const isSale = listing.discounted;
                return (
                  <div
                    key={listing.id}
                    ref={(el) => (cardRefs.current[listing.id] = el)}
                    data-id={listing.id}
                    className={`mp-card ${visibleCards.has(String(listing.id)) ? "visible" : ""}`}
                    style={{ animationDelay: `${(i % PER_PAGE) * 0.05}s` }}
                  >
                    {/* Card media */}
                    <div
                      className="mp-card-media"
                      onClick={() => setActiveModal(listing.id)}
                    >
                      {firstPhoto ? (
                        <img
                          src={firstPhoto}
                          alt={listing.title}
                          className="mp-card-image"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="mp-card-emoji-wrap"
                        style={{ display: firstPhoto ? "none" : "flex" }}
                      >
                        <span className="mp-card-emoji">{emoji}</span>
                      </div>
                     <div className="mp-card-badges">
  {isNew  && <span className="mp-card-badge mp-badge-new">🆕 New</span>}
  {isHot  && <span className="mp-card-badge mp-badge-hot">🔥 Hot</span>}
  {isSale && <span className="mp-card-badge mp-badge-sale">Sale</span>}
  {!isNew && !isHot && !isSale && (
    <span className="mp-card-badge">
      {listing.vaccinated ? "Vaccinated" : listing.condition || "Listed"}
    </span>
  )}
  <span className="mp-card-days">
    {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
  </span>
</div>
                      <button
                        className={`mp-save-btn ${savedItems.has(listing.id) ? "saved" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(listing.id);
                        }}
                        aria-label="Save listing"
                      >
                        {savedItems.has(listing.id) ? "❤️" : "🤍"}
                      </button>
                    </div>

                    {/* Card body */}
                    <div
                      className="mp-card-body"
                      onClick={() => setActiveModal(listing.id)}
                    >
                      <h3 className="mp-card-title">{listing.title}</h3>
                      <p className="mp-card-location">
                        📍{" "}
                        {listing.city ||
                          listing.location ||
                          listing.province ||
                          "Zimbabwe"}
                      </p>

                      <div className="mp-card-meta">
                        {listing.breed && (
                          <span className="mp-meta-tag">
                            🏷 {listing.breed}
                          </span>
                        )}
                        {listing.weight && (
                          <span className="mp-meta-tag">
                            ⚖️ {listing.weight}
                          </span>
                        )}
                        {listing.age && (
                          <span className="mp-meta-tag">📅 {listing.age}</span>
                        )}
                      </div>

                      <p className="mp-card-desc">
                        {(listing.description || listing.desc || "").slice(
                          0,
                          80,
                        )}
                        …
                      </p>

                      <div className="mp-card-seller">
                        <div className="mp-seller-avatar">
                          {(listing.sellerName || listing.seller || "?")
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div className="mp-seller-info">
                          <span className="mp-seller-name">
                            {listing.sellerName || listing.seller || "Seller"}
                          </span>
                          {listing.sellerRating && (
                            <span className="mp-seller-rating">
                              ★ {listing.sellerRating}
                            </span>
                          )}
                        </div>
                        {listing.views && (
                          <span className="mp-card-views">
                            👁 {listing.views}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card footer */}
                    <div className="mp-card-footer">
                      <div className="mp-card-price">
                        <strong>
                          {listing.currency || "USD"}{" "}
                          {listing.price?.toLocaleString()}
                        </strong>
                        <span>
                          {listing.pricePerHead
                            ? "per head"
                            : listing.unit || "per lot"}
                        </span>
                      </div>
                      <button
                        className="mp-enquire-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModal(listing.id);
                        }}
                      >
                        Enquire
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mp-pagination">
              <button
                className="mp-page-btn"
                disabled={page === 1}
                onClick={() => {
                  setPage(page - 1);
                  window.scrollTo({ top: 300, behavior: "smooth" });
                }}
              >
                ← Prev
              </button>
              <div className="mp-page-nums">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      className={`mp-page-num ${p === page ? "active" : ""}`}
                      onClick={() => {
                        setPage(p);
                        window.scrollTo({ top: 300, behavior: "smooth" });
                      }}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>
              <button
                className="mp-page-btn"
                disabled={page === totalPages}
                onClick={() => {
                  setPage(page + 1);
                  window.scrollTo({ top: 300, behavior: "smooth" });
                }}
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ── LISTING MODAL ── */}
      {activeListing && (
        <div className="mp-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="mp-modal-close"
              onClick={() => setActiveModal(null)}
            >
              ✕
            </button>

            <div className="mp-modal-header">
              <div className="mp-modal-emoji">
                {activeListing.emoji ||
                  getCategoryEmoji(activeListing.categoryId)}
              </div>
              <div className="mp-modal-title-block">
                <span className="mp-modal-badge">
                  {activeListing.vaccinated
                    ? "Vaccinated"
                    : activeListing.badge ||
                      activeListing.condition ||
                      "Listed"}
                </span>
                <h2>{activeListing.title}</h2>
                <p className="mp-modal-location">
                  📍{" "}
                  {activeListing.city ||
                    activeListing.location ||
                    activeListing.province ||
                    "Zimbabwe"}
                </p>
              </div>
            </div>

            <div className="mp-modal-body">
              <div className="mp-modal-details">
                <div className="mp-modal-detail-grid">
                  {[
                    { label: "Breed", value: activeListing.breed },
                    { label: "Age", value: activeListing.age },
                    { label: "Weight", value: activeListing.weight },
                    {
                      label: "Quantity",
                      value: activeListing.qty
                        ? `${activeListing.qty} available`
                        : "—",
                    },
                    {
                      label: "Listed",
                      // FIX 3: compute daysAgo from Timestamp in modal too
                      value: (() => {
                        const d = getDaysAgo(activeListing.createdAt);
                        return d === 0
                          ? "Today"
                          : `${d} day${d !== 1 ? "s" : ""} ago`;
                      })(),
                    },
                    {
                      label: "Views",
                      value: activeListing.views
                        ? `${activeListing.views} views`
                        : "—",
                    },
                  ]
                    .filter((d) => d.value)
                    .map((d) => (
                      <div key={d.label} className="mp-modal-detail">
                        <span className="mp-modal-detail-label">{d.label}</span>
                        <span className="mp-modal-detail-value">{d.value}</span>
                      </div>
                    ))}
                </div>

                <div className="mp-modal-desc">
                  <h4>Description</h4>
                  <p>
                    {activeListing.description ||
                      activeListing.desc ||
                      "No description provided."}
                  </p>
                </div>

                <div className="mp-modal-seller">
                  <div className="mp-modal-seller-avatar">
                    {(activeListing.sellerName || activeListing.seller || "?")
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <strong>
                      {activeListing.sellerName ||
                        activeListing.seller ||
                        "Seller"}
                    </strong>
                    {activeListing.sellerRating && (
                      <>
                        <div className="mp-modal-stars">{"★".repeat(5)}</div>
                        <span className="mp-modal-rating">
                          {activeListing.sellerRating} / 5.0
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mp-modal-action-panel">
                <div className="mp-modal-price">
                  <strong>
                    {activeListing.currency || "USD"}{" "}
                    {activeListing.price?.toLocaleString()}
                  </strong>
                  <span>
                    {activeListing.pricePerHead
                      ? "per head"
                      : activeListing.unit || "per lot"}
                  </span>
                </div>

                <a
                  href={`https://wa.me/?text=Hi, I'm interested in your listing: ${encodeURIComponent(activeListing.title)} on Kraal Market`}
                  target="_blank"
                  rel="noreferrer"
                  className="mp-modal-whatsapp"
                >
                  <WhatsAppIcon /> Chat on WhatsApp
                </a>

                <button
                  className={`mp-modal-save ${savedItems.has(activeListing.id) ? "saved" : ""}`}
                  onClick={() => toggleSave(activeListing.id)}
                >
                  {savedItems.has(activeListing.id)
                    ? "❤️ Saved"
                    : "🤍 Save Listing"}
                </button>

                <div className="mp-modal-safety">
                  <span>🔒 Always meet in a safe, public location</span>
                  <span>✅ Seller is verified on Kraal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="mp-footer">
        <div className="mp-footer-inner">
          <div className="mp-footer-brand">
            <img
              src={logo}
              style={{ width: "100px", filter: "brightness(0) invert(1)" }}
              alt="Kraal"
            />
            <span>Market</span>
            <p>
              Zimbabwe's livestock marketplace,
              <br />
              going pan-African.
            </p>
          </div>
          <div className="mp-footer-links">
            <div className="mp-footer-col">
              <strong>Marketplace</strong>
              <Link to="/marketplace">Browse all</Link>
              <Link to="/marketplace?category=cattle">Cattle</Link>
              <Link to="/marketplace?category=goats">Goats</Link>
            </div>
            <div className="mp-footer-col">
              <strong>Sellers</strong>
              <Link to="/register">Start selling</Link>
              <Link to="/sell">Post listing</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <div className="mp-footer-col">
              <strong>Company</strong>
              <Link to="/about">About Kraal</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/terms">Terms</Link>
            </div>
          </div>
        </div>
        <div className="mp-footer-bottom">
          <span>
            © {new Date().getFullYear()} Kraal. Built with Love in Zimbabwe 🇿🇼
          </span>
          <span>From the farm gate to the world.</span>
        </div>
      </footer>
      <nav className="mp-bottom-nav">
  <div className="mp-bottom-nav-inner">
    <Link to="/marketplace" className="mp-bottom-nav-item active">
      🏪<span>Browse</span>
    </Link>
    <Link to="/marketplace?saved=1" className="mp-bottom-nav-item">
      🤍<span>Saved</span>
    </Link>
    <Link to="/register" className="mp-bottom-nav-post">+</Link>
    <Link to="/alerts" className="mp-bottom-nav-item">
      🔔<span>Alerts</span>
    </Link>
    <Link to="/profile" className="mp-bottom-nav-item">
      👤<span>Profile</span>
    </Link>
  </div>
</nav>
    </div>
  );
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
