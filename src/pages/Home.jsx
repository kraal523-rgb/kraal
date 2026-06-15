// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import InstallButton from '../components/InstallButton'
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp  } from "firebase/firestore";
import { db } from "../lib/firebase";
import UserMenu from "../components/UserMenu";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/kraal-logo-black.svg";
import navIcon from "../assets/kraal-logo.svg"
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
import fish from "../assets/fish.png";
import manure from "../assets/manure.jpg";
import bees from "../assets/bee.jpg";
import honey from "../assets/honey.png"
import eggs from "../assets/eggs.jpg";
import imgDonkey from "../assets/pngegg__3.png"
import videoCattle from "../assets/videos/cattle-1.mp4";
import imgGeese from "../assets/geese.png";
import imgCats from "../assets/cat.jpg";
import imgPigeons from "../assets/pigeon.png";
import imgGuineaPig from "../assets/guineapig.png";
import imgOstrich from "../assets/ostrich.png";
import ProfileSheet from "../components/ProfileSheet";
import imgQuail from "../assets/quail.png";
import CookieConsent from "../components/CookieConsent";
import "./Home.css";
import "./Marketplace.css";
import KraalOnboardingForm from "../components/Kraalonboardingform";
import ProvinceMapFilter from "../components/ProvinceMapFilter";
import videoGoats from "../assets/videos/cattle-1.mp4";
import videoChicken from "../assets/videos/cattle-1.mp4";
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
const heroVideos = [
  {
    src: videoCattle,
    badge: "Live on Farm",
    title: "Brahman Herd · Marondera",
    subtitle: "Zimbabwe's finest beef cattle",
    link: "/marketplace?category=cattle",
    linkText: "View Cattle →",
  },
  {
    src: videoGoats,
    badge: "Live on Farm",
    title: "Boer Goats · Bulawayo",
    subtitle: "Healthy, grass-fed goat herds",
    link: "/marketplace?category=goats",
    linkText: "View Goats →",
  },
  {
    src: videoChicken,
    badge: "Live on Farm",
    title: "Road Runners · Harare",
    subtitle: "Free-range indigenous chickens",
    link: "/marketplace?category=chicken",
    linkText: "View Poultry →",
  },
];
const FARM_PRODUCTS = [
  { id: "fish",      img: fish, label: "Fish (Aquaculture)", count: "60+",  emoji: "🐟" },
  { id: "bees",      img: bees, label: "Bees & Honey",       count: "45+",  emoji: "🐝" },
  { id: "eggs",      img: eggs, label: "Eggs (by tray)",     count: "130+", emoji: "🥚" },
  { id: "compost",   img: manure, label: "Manure & Compost",   count: "30+",  emoji: "🌱" },
  { id: "honey",     img: honey, label: "Raw Honey",          count: "70+",  emoji: "🍯" },
];
const PRICE_TICKER = [
  { label: "Brahman Bull", price: "USD 1,200", trend: "up" },
  { label: "Nguni Cow", price: "USD 850", trend: "up" },
  { label: "Boer Goat", price: "USD 180", trend: "down" },
  { label: "Road Runner (12)", price: "USD 96", trend: "up" },
  { label: "Merino Ewe", price: "USD 220", trend: "up" },
  { label: "Duroc Pig", price: "USD 310", trend: "down" },
  { label: "Muscovy Duck", price: "USD 18", trend: "up" },
  { label: "Bronze Turkey", price: "USD 45", trend: "up" },
  { label: "Ankole Bull", price: "USD 1,500", trend: "up" },
];
const TOP_FARMERS = [
  {
    initials: "TM",
    name: "Takudzwa Moyo",
    farm: "Moyo Cattle Farm",
    location: "Marondera",
    sells: "Brahman Bulls, Nguni Cows",
    rating: 4.9,
    sales: 47,
    color: "#2D5A27",
    verified: true,
  },
  {
    initials: "SN",
    name: "Sithembile Ndlovu",
    farm: "Ndlovu Poultry",
    location: "Bulawayo",
    sells: "Road Runners, Guinea Fowl",
    rating: 4.8,
    sales: 132,
    color: "#C85A2A",
    verified: true,
  },
  {
    initials: "FC",
    name: "Farai Chikwanda",
    farm: "Chikwanda Goats",
    location: "Mutare",
    sells: "Boer Goats, Sheep",
    rating: 4.7,
    sales: 61,
    color: "#7A5C1E",
    verified: true,
  },
  {
    initials: "BM",
    name: "Blessing Mutasa",
    farm: "Mutasa Mixed Farm",
    location: "Gweru",
    sells: "Pigs, Cattle, Goats",
    rating: 4.9,
    sales: 89,
    color: "#1A5C6B",
    verified: true,
  },
  {
    initials: "RZ",
    name: "Rudo Zvobgo",
    farm: "Zvobgo Piggery",
    location: "Chinhoyi",
    sells: "Duroc Pigs, Landrace",
    rating: 4.6,
    sales: 38,
    color: "#5C1A6B",
    verified: true,
  },
  {
    initials: "JM",
    name: "Joseph Mhuri",
    farm: "Mhuri Horse Stud",
    location: "Harare",
    sells: "Thoroughbreds, Warmbloods",
    rating: 5.0,
    sales: 14,
    color: "#1A3A6B",
    verified: true,
  },
];
const FEATURED_LISTINGS = [
  {
    id: 1,
    emoji: "🐄",
    title: "10× Brahman Bulls",
    location: "Marondera, Mashonaland",
    price: "USD 1,200",
    unit: "per head",
    badge: "Verified Seller",
    age: "3 yrs",
    tag: "cattle",
    daysAgo: 1,
  },
  {
    id: 2,
    emoji: "🐐",
    title: "25× Boer Goats",
    location: "Gweru, Midlands",
    price: "USD 175",
    unit: "per head",
    badge: "Vaccinated",
    age: "18 mo",
    tag: "goats",
    daysAgo: 2,
  },
  {
    id: 3,
    emoji: "🐓",
    title: "200× Road Runners",
    location: "Mutare, Manicaland",
    price: "USD 8",
    unit: "per bird",
    badge: "Bulk Discount",
    age: "16 wks",
    tag: "chicken",
    daysAgo: 1,
  },
  {
    id: 4,
    emoji: "🐑",
    title: "15× Merino Ewes",
    location: "Bulawayo, Matabeleland",
    price: "USD 220",
    unit: "per head",
    badge: "Pedigree",
    age: "2 yrs",
    tag: "sheep",
    daysAgo: 3,
  },
  {
    id: 5,
    emoji: "🐖",
    title: "8× Duroc Piglets",
    location: "Chinhoyi, Mashonaland",
    price: "USD 95",
    unit: "per head",
    badge: "Weaned",
    age: "8 wks",
    tag: "pigs",
    daysAgo: 2,
  },
  {
    id: 6,
    emoji: "🐴",
    title: "3× Thoroughbred Mares",
    location: "Harare, Mashonaland",
    price: "USD 3,800",
    unit: "per head",
    badge: "Registered",
    age: "5 yrs",
    tag: "horses",
    daysAgo: 4,
  },
];

const TESTIMONIALS = [
  {
    name: "Takudzwa M.",
    location: "Marondera",
    text: "Sold 12 Brahman bulls in 3 days. Buyers from Harare came to me — I didn't have to travel anywhere.",
    emoji: "🐄",
    initials: "TM",
    color: "#2D5A27",
  },
  {
    name: "Sithembile N.",
    location: "Bulawayo",
    text: "I listed my Road Runners on a Friday evening and had 8 enquiries by Saturday morning. Kraal is the real deal.",
    emoji: "🐓",
    initials: "SN",
    color: "#C85A2A",
  },
  {
    name: "Farai C.",
    location: "Mutare",
    text: "Finally a platform that understands what we sell. Not hiding my goats between used cars and furniture.",
    emoji: "🐐",
    initials: "FC",
    color: "#7A5C1E",
  },
];

const STATS = [
  { value: "12,000+", label: "Active Sellers", icon: "👨‍🌾" },
  { value: "45,000+", label: "Animals Listed", icon: "🐄" },
  { value: "5", label: "Countries Served", icon: "🌍" },
  { value: "48h", label: "Avg. First Enquiry", icon: "⚡" },
];

const TRUST_ITEMS = [
  {
    icon: "✅",
    title: "Verified Sellers",
    desc: "Every seller is identity-verified before listing. You deal with real farmers.",
  },
  {
    icon: "📱",
    title: "WhatsApp-Friendly",
    desc: "Buyers reach you on WhatsApp. No app to install — works on any phone.",
  },
  {
    icon: "🔒",
    title: "No Hidden Fees",
    desc: "Basic listings are permanently free. Zero commission on your sales.",
  },
  {
    icon: "🌍",
    title: "Pan-African Reach",
    desc: "Buyers from Zimbabwe, Zambia, Mozambique, SA, and Botswana on one platform.",
  },
];
const RECENTLY_SOLD = [
  { time: "2h ago",  qty: "15",  animal: "Boer Goats",      location: "Gweru"      },
  { time: "4h ago",  qty: "3",   animal: "Brahman Bulls",   location: "Marondera"  },
  { time: "5h ago",  qty: "200", animal: "Road Runners",    location: "Mutare"     },
  { time: "6h ago",  qty: "8",   animal: "Duroc Piglets",   location: "Chinhoyi"   },
  { time: "9h ago",  qty: "12",  animal: "Merino Ewes",     location: "Bulawayo"   },
  { time: "11h ago", qty: "1",   animal: "Thoroughbred Mare", location: "Harare"   },
  { time: "1d ago",  qty: "50",  animal: "Guinea Fowl",     location: "Masvingo"   },
  { time: "1d ago",  qty: "6",   animal: "Nguni Cows",      location: "Bindura"    },
];
const REGIONS = [
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
];

export default function Home() {
  const location = useLocation();
  const [featuredListings, setFeaturedListings] = useState([]);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [topFarmers, setTopFarmers] = useState([]);
  const [alertSubmitted, setAlertSubmitted] = useState(false);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const observerRef = useRef(null);
  const [fetchError, setFetchError] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cookieAccepted, setCookieAccepted] = useState(
  () => localStorage.getItem("kraal_cookies") === "accepted"
);
const [cookieBannerOpen, setCookieBannerOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % heroVideos.length);
    }, 6000); // change every 6s

    return () => clearInterval(interval);
  }, []);

  const active = heroVideos[current];
const acceptCookies = () => {
  localStorage.setItem("kraal_cookies", "accepted");
  setCookieAccepted(true);
  setCookieBannerOpen(false);
};
  // Rotate testimonials
  useEffect(() => {
    const t = setInterval(
      () => setActiveTestimonial((i) => (i + 1) % TESTIMONIALS.length),
      5000,
    );
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
  const fetchTopFarmers = async () => {
    try {
      const q = query(
        collection(db, "listings"),
        where("status", "==", "active"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);

      // Group listings by seller
      const sellerMap = {};
      snapshot.docs.forEach((doc) => {
        const d = doc.data();
        const key = d.sellerId || d.sellerName || d.seller;
        if (!key) return;

        if (!sellerMap[key]) {
          sellerMap[key] = {
            id: key,
            name: d.sellerName || d.seller || "Unknown Farmer",
            farm: d.farmName || d.farm || "",
            location: d.city || d.province || d.location || "Zimbabwe",
            sells: new Set(),
            listingCount: 0,
            rating: d.sellerRating || null,
            verified: d.sellerVerified || false,
            avatar: d.sellerAvatar || null,
          };
        }

        sellerMap[key].listingCount += 1;
        if (d.categoryId) sellerMap[key].sells.add(d.categoryId);
      });

      // Sort by listing count, take top 8
      const sorted = Object.values(sellerMap)
        .sort((a, b) => b.listingCount - a.listingCount)
        .slice(0, 8)
        .map((s) => ({
          ...s,
          sells: [...s.sells].join(", "),
          // Generate initials and color from name
          initials: s.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
          color: nameToColor(s.name),
        }));

      setTopFarmers(sorted);
    } catch (err) {
      console.error("Failed to fetch top farmers:", err);
    }
  };

  fetchTopFarmers();
}, []);
const fetchFeatured = useCallback(async () => {
    try {
      const q = query(
        collection(db, "listings"),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(6)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFeaturedListings(data);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
      setFetchError(true); 
    }
  },[]);
  // Intersection observer for scroll reveals
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
           setVisibleSections((prev) => {
  const next = new Set(prev);
  next.add(entry.target.id);
  return next;
});
          }
        });
      },
      { threshold: 0.1 },
    );
    document.querySelectorAll("[data-observe]").forEach((el) => {
      observerRef.current.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  fetchFeatured();
}, [fetchFeatured]);
  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/marketplace${search ? `?q=${encodeURIComponent(search)}` : ""}`);
  };

 const handleAlertSubmit = async (e) => {
  e.preventDefault();
  if (!alertEmail) return;
  try {
    await addDoc(collection(db, "alert_signups"), {
      email: alertEmail,
      createdAt: serverTimestamp(),
    });
    setAlertSubmitted(true);
  } catch (err) {
    console.error("Alert signup failed:", err);
  }
};

  return (
    <div className="home">
     

      {/* ── NAV ── */}
      <nav className="home-nav">
        
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            <img src={logo} style={{ width: "140px" }} alt="Kraal" />
            
          </Link>
          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
           <Link to="/marketplace">Browse Animals</Link>
<Link to="/marketplace?category=cattle">Cattle</Link>
<Link to="/marketplace?category=goats">Goats</Link>
<Link to="/about">About</Link>

          </div>
          
          <div className="nav-actions">
           <UserMenu />
            <Link to="/sell" className="nav-cta">
              <span>+ Post</span>
            </Link>
            <InstallButton />
            <button
              className="nav-hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
         
        </div>
      </nav>
 {/* ── PRICE TICKER BAND ── */}
      <div className="price-ticker-band" aria-label="Live market prices">
        <div className="price-ticker-label">📊 Live Prices</div>
        <img src={navIcon} alt="" className="price-ticker-icon" />
        <div className="price-ticker-scroll">
          <div className="price-ticker-track">
            {[...PRICE_TICKER, ...PRICE_TICKER].map((item, i) => (
              <span key={i} className="price-ticker-item">
                <span className="pt-label">{item.label}</span>
                <span className={`pt-price ${item.trend}`}>
                  {item.price}
                  <span className="pt-arrow">
                    {item.trend === "up" ? "↑" : "↓"}
                  </span>
                </span>
                <span className="pt-sep">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* ── HERO ── */}
    <section className="hero">
  {/* Texture layers */}

  <div className="hero-inner">
 
    {/* ── LEFT — copy + search + CTAs ── */}
    <div className="hero-left">
 
     
      <h1 className="hero-title">
        Your livestock,
        <br />
        <em>found by buyers</em>
        <br />
        across Africa.
      </h1>
 
      <p className="hero-sub">
        List cattle, goats, chickens and more in minutes. Reach thousands
        of verified buyers from Zimbabwe and beyond — no middlemen, no
        commission.
      </p>
 
      


<div className="hero-stats-row">
  {STATS.map((s, i) => (
    <div key={i} className="hero-stat">
      <span className="hero-stat-icon">{s.icon}</span>
      <strong className="hero-stat-value">{s.value}</strong>
      <span className="hero-stat-label">{s.label}</span>
    </div>
  ))}
</div>
     <div className="hero-quick-cats">
  {[
    { id: "cattle",  emoji: "🐄", label: "Cattle",       count: "1,240+" },
    { id: "goats",   emoji: "🐐", label: "Goats",        count: "890+"   },
    { id: "chicken", emoji: "🐓", label: "Road Runners", count: "2,100+" },
    { id: "sheep",   emoji: "🐑", label: "Sheep",        count: "560+"   },
    { id: "pigs",    emoji: "🐖", label: "Pigs",         count: "320+"   },
  ].map((c) => (
    <button
      key={c.id}
      className="hero-quick-cat"
      onClick={() => navigate(`/marketplace?category=${c.id}`)}
    >
      <span>{c.emoji}</span>
      <span>{c.label}</span>
      <span className="hqc-count">{c.count}</span>
    </button>
  ))}
</div>
    </div>
 
    {/* ── RIGHT — contained video frame + mini listings ── */}
    <div className="hero-right">

      {/* Farm-window video frame */}
   <div className="hero-video-frame">
        <div className="hero-video-track">
          {heroVideos.map((video, index) => (
            <video
              key={index}
              src={video.src}
              autoPlay
              muted
              loop
              playsInline
              className={`hero-video-slide ${
                index === current
                  ? "active"
                  : index < current
                  ? "exit-left"
                  : "enter-right"
              }`}
            />
          ))}
        </div>

        {/* Live badge */}
        <div className="hero-video-live-badge" aria-hidden="true">
          <span className="live-dot" />
          {active.badge}
        </div>

        {/* Bottom caption inside frame */}
        <div className="hero-video-caption">
          <div className="hero-video-caption-text">
            <strong>{active.title}</strong>
            {active.subtitle}
          </div>
          <Link to={active.link} className="hero-video-view-btn">
            {active.linkText}
          </Link>
        </div>

        {/* Floating category pills around the frame */}
        <div className="hero-float-pills" aria-hidden="true">
          <Link to="/marketplace?category=cattle" className="hero-pill hero-pill-tl">
            <span className="hero-pill-emoji">🐄</span>
            Cattle
            <span className="hero-pill-count">1,240+</span>
          </Link>
          <Link to="/marketplace?category=goats" className="hero-pill hero-pill-tr">
            <span className="hero-pill-emoji">🐐</span>
            Goats
            <span className="hero-pill-count">890+</span>
          </Link>
          <Link to="/marketplace?category=chicken" className="hero-pill hero-pill-bl">
            <span className="hero-pill-emoji">🐓</span>
            Road Runners
            <span className="hero-pill-count">2,100+</span>
          </Link>
          <Link to="/marketplace?category=pigs" className="hero-pill hero-pill-br">
            <span className="hero-pill-emoji">🐖</span>
            Pigs
            <span className="hero-pill-count">320+</span>
          </Link>
        </div>
      </div>

      <div className="hero-actions">
        <Link to="/register" className="btn-hero-primary">
          🐄 Post a Listing — Free
        </Link>
        <Link to="/marketplace" className="btn-hero-ghost">
          Browse Animals →
        </Link>
      </div>

      <div className="hero-social-proof">
        <div className="proof-avatars">
          {["TM", "SN", "FC", "JM", "BN"].map((initials, idx) => (
            <span
              key={idx}
              className="proof-avatar"
              style={{ zIndex: 5 - idx }}
            >
              {initials}
            </span>
          ))}
        </div>
        <span className="proof-text">
          Joined by <strong>12,000+</strong> farmers this season
        </span>
      </div>
 
      <form className="hero-search" onSubmit={handleSearch}>
        <span className="search-icon">
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Search cattle, goats, road runners…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>
    </div>
  </div>
 
 
</section>
<ProvinceMapFilter />
      {/* ── STATS ── */}
      

      {/* ── CATEGORIES ── */}
     {/* ── CATEGORIES ── */}
<section className="categories-section" id="categories" data-observe>
  <div className="section-inner">

    {/* --- Livestock --- */}
    <div className="section-header">
      <div>
        <p className="section-eyebrow">What are you looking for?</p>
        <h2 className="section-title">Browse by Animal</h2>
      </div>
      <Link to="/marketplace" className="section-link">View all listings →</Link>
    </div>
   <div className="categories-grid">
  {CATEGORIES.map((cat, i) => (
    <div key={cat.id} className="cat-cell">
      <button
        className="cat-card"
        style={{ animationDelay: `${i * 0.06}s` }}
        onClick={() => navigate(`/marketplace?category=${cat.id}`)}
      >
        <div className="cat-img-wrap">
          {cat.img ? (
            <img src={cat.img} alt={cat.label} className="cat-animal-img" loading="lazy" />
          ) : (
            <span className="cat-emoji">{cat.emoji}</span>
          )}
        </div>
      </button>

      {/* Now outside the card, below it */}
      <div className="cat-info">
        <span className="cat-label">{cat.label}</span>
        <span className="cat-count">{cat.count} listings</span>
        <span className="cat-arrow">→</span>
      </div>
    </div>
  ))}
</div>

    {/* --- Farm Products divider --- */}
    <div className="farm-products-divider">
      <span className="fp-divider-line" />
      <span className="fp-divider-badge">🌾 Aquaculture & Farm Products</span>
      <span className="fp-divider-line" />
    </div>
    <p className="fp-sub">
      Beyond livestock — fish ponds, beehives, eggs, wool and more from Zimbabwean farms.
    </p>

    <div className="categories-grid farm-products-grid">
      {FARM_PRODUCTS.map((cat, i) => (
        <button
          key={cat.id}
          className="cat-card farm-product-card"
          style={{ animationDelay: `${i * 0.06}s` }}
          onClick={() => navigate(`/marketplace?category=${cat.id}`)}
        >
          <div className="cat-img-wrap">
            {cat.img ? (
              <img src={cat.img} alt={cat.label} className="cat-animal-img" loading="lazy" />
            ) : (
              <span className="cat-emoji">{cat.emoji}</span>
            )}
          </div>
          <span className="cat-label">{cat.label}</span>
          <span className="cat-count">{cat.count} listings</span>
          <span className="cat-arrow">→</span>
        </button>
      ))}
    </div>

  </div>
</section>

      {/* ── FEATURED LISTINGS ── */}
    <section className="featured-section" id="featured" data-observe>
  <div className="section-inner">
    <div className="section-header">
      <div>
        <p className="section-eyebrow">Fresh on the market</p>
        <h2 className="section-title">Featured Listings</h2>
      </div>
     <Link to="/marketplace" className="section-link">See all →</Link>
    </div>

    <div className="mp-grid">
      {fetchError ? (
  <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "40px 0" }}>
    Could not load listings right now. <button onClick={fetchFeatured}>Retry</button>
  </p>
) : featuredListings.length === 0 ?  (
        // Skeleton loading cards
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="listing-card skeleton">
            <div className="lc-media lc-media-skeleton" />
            <div className="lc-body">
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          </div>
        ))
      ) : (
        featuredListings.map((listing, i) => {
          const firstPhoto = listing.photos?.[0]?.url;
          const daysAgo = listing.createdAt?.seconds
            // eslint-disable-next-line react-hooks/purity
            ? Math.floor((Date.now() / 1000 - listing.createdAt.seconds) / 86400)
            : 0;

          return (
            <div
              key={listing.id}
              className="mp-card visible"
              style={{ animationDelay: `${i * 0.08}s` }}
              onClick={() => navigate(`/listings/${listing.id}`)}
            >
              <div className="lc-media">
                {firstPhoto ? (
                  <img
                    src={firstPhoto}
                    alt={listing.title}
                    className="lc-image"
                    onError={(e) => {
                      // Fallback to emoji if image fails
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                {/* Emoji fallback */}
                <span
                  className="lc-emoji"
                  style={{ display: firstPhoto ? "none" : "flex" }}
                >
                  {getCategoryEmoji(listing.categoryId)}
                </span>
                <span className="lc-badge">
                  {listing.vaccinated ? "Vaccinated" : listing.condition || "Good"}
                </span>
                <span className="lc-days">
                  {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
                </span>
              </div>

              <div className="lc-body">
                <h3 className="lc-title">{listing.title}</h3>
                <p className="lc-location">
                  📍 {listing.city || listing.province || "Zimbabwe"}
                </p>
                <div className="lc-meta">
                  {listing.age && <span className="lc-age">Age: {listing.age}</span>}
                  {listing.breed && <span className="lc-breed">{listing.breed}</span>}
                </div>
                <div className="lc-footer">
                  <div className="lc-price">
                    <strong>
                      {listing.currency || "USD"} {listing.price?.toLocaleString()}
                    </strong>
                    <span>{listing.pricePerHead ? "per head" : "per lot"}</span>
                  </div>
                  <button
                    className="lc-enquire"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/listings/${listing.id}`);
                    }}
                  >
                    Enquire
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
</section>
{/* ── TOP FARMERS 
<section className="spotlight-section">
  <div className="section-inner">
    <div className="section-header">
      <div>
        <p className="section-eyebrow">Community</p>
        <h2 className="section-title">Top Farmers on Kraal</h2>
      </div>
      <Link to="/marketplace" className="section-link">
        Browse all sellers →
      </Link>
    </div>

    {topFarmers.length === 0 ? (
      // Skeleton while loading
      <div className="spotlight-track">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="spotlight-card skeleton">
            <div className="sp-skeleton-avatar" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
            <div className="skeleton-line short" />
          </div>
        ))}
      </div>
    ) : (
      <div className="spotlight-track-wrap">
        <div className="spotlight-track">
          {topFarmers.map((farmer, i) => (
            <div key={farmer.id} className="spotlight-card">
              <div className="sp-header">
                <div className="sp-avatar" style={{ background: farmer.color }}>
                  {farmer.avatar
                    ? <img src={farmer.avatar} alt={farmer.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    : farmer.initials
                  }
                </div>
                <div className="sp-meta">
                  <strong className="sp-name">{farmer.name}</strong>
                  <span className="sp-farm">{farmer.farm || "Independent Farmer"}</span>
                </div>
                {farmer.verified && (
                  <span className="sp-verified" title="Verified seller">✅</span>
                )}
              </div>

              <div className="sp-location">📍 {farmer.location}</div>
              <div className="sp-sells">🐾 {farmer.sells || "Various animals"}</div>

              <div className="sp-stats">
                <span className="sp-listing-count">
                  📋 {farmer.listingCount} listing{farmer.listingCount !== 1 ? "s" : ""}
                </span>
                {farmer.rating && (
                  <span className="sp-rating">★ {farmer.rating}</span>
                )}
              </div>

              <button
                className="sp-cta"
                onClick={() => {
                  // Home.jsx — use navigate
                  // Marketplace.jsx — use setSearch
                  navigate(`/marketplace?seller=${encodeURIComponent(farmer.name)}`);
                }}
              >
                View Listings →
              </button>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</section>
── */}
      {/* ── TRUST STRIP ── */}
      <section className="trust-section">
        <div className="section-inner">
          <h2 className="trust-title">Why farmers choose Kraal</h2>
          <div className="trust-grid">
            {TRUST_ITEMS.map((item, i) => (
              <div key={i} className="trust-card">
                <div className="trust-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-section">
        <div className="how-grain" aria-hidden="true" />
        <div className="section-inner">
          <p className="section-eyebrow light">Simple by design</p>
          <h2 className="section-title centered light">How Kraal Works</h2>
          <p className="section-sub">
            From farm gate to buyer's hands — four steps, zero hassle
          </p>
          <div className="steps-grid">
            {[
              {
                n: "01",
                icon: "📝",
                title: "Create Your Account",
                desc: "Sign up free in 2 minutes. Add your farm name, location, and the livestock you raise.",
              },
              {
                n: "02",
                icon: "📸",
                title: "Post Your Listing",
                desc: "Add photos, set your asking price, and describe your animals. Listings go live instantly.",
              },
              {
                n: "03",
                icon: "💬",
                title: "Buyers Come to You",
                desc: "Interested buyers reach you via WhatsApp or in-app chat. No travel, no middlemen.",
              },
              {
                n: "04",
                icon: "🤝",
                title: "Close the Deal",
                desc: "Agree on price and delivery directly with the buyer. You keep 100% of the sale.",
              },
            ].map((step, i) => (
              <div
                key={step.n}
                className="how-step"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="step-connector" />
                <div className="step-number">{step.n}</div>
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title-sm">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGIONS ── */}
      <section className="regions-section">
        <div className="section-inner">
          <div className="regions-inner">
            <div className="regions-text">
              <p className="section-eyebrow">Coverage</p>
              <h2 className="section-title">
                Buyers from Every Corner of Zimbabwe
              </h2>
              <p className="regions-sub">
                Kraal connects sellers to active buyers in all major towns and
                rural districts — and increasingly from across Southern Africa.
              </p>
             <Link to="/marketplace" className="btn-regions">
                Browse Your Region →
              </Link>
            </div>
            <div className="regions-tags">
              {REGIONS.map((r, i) => (
                <button
                  key={i}
                  className="region-tag"
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() =>
                    navigate(`/marketplace?location=${encodeURIComponent(r)}`)
                  }
                >
                  📍 {r}
                </button>
              ))}
              <span className="region-tag more">+ Many more</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="testimonials-section">
        <div className="section-inner">
          <p className="section-eyebrow">Real farmers. Real results.</p>
          <h2 className="section-title centered">Farmers Love Kraal</h2>

          <div className="testimonials-wrap">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className={`testimonial-card ${i === activeTestimonial ? "active" : ""}`}
              >
                <div className="testimonial-top">
                  <div className="t-avatar" style={{ background: t.color }}>
                    {t.initials}
                  </div>
                  <div className="t-meta">
                    <strong>{t.name}</strong>
                    <span>📍 {t.location}</span>
                  </div>
                  <div className="t-animal">{t.emoji}</div>
                </div>
                <div className="t-stars">★★★★★</div>
                <blockquote>"{t.text}"</blockquote>
              </div>
            ))}

            <div className="testimonial-dots">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  className={`dot ${i === activeTestimonial ? "active" : ""}`}
                  onClick={() => setActiveTestimonial(i)}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ALERT SIGNUP ── */}
      <section className="alert-section">
        <div className="alert-inner">
          <div className="alert-text">
            <span className="alert-icon">🔔</span>
            <div>
              <h2>Get Notified When Animals Are Listed</h2>
              <p>
                Be the first buyer when new cattle, goats, or chickens are
                posted in your area.
              </p>
            </div>
          </div>
          {!alertSubmitted ? (
            <form className="alert-form" onSubmit={handleAlertSubmit}>
              <input
                type="email"
                placeholder="Enter your email address"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                required
              />
              <button type="submit">Set Up Alerts</button>
            </form>
          ) : (
            <div className="alert-success">
              ✅ You're set up! We'll notify you of new listings.
            </div>
          )}
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="cta-section">
        <div className="cta-grain" aria-hidden="true" />
        <div className="cta-inner">
          <div className="cta-text">
            <h2>Ready to Reach More Buyers?</h2>
            <p>
              Join over 12,000 farmers already selling on Kraal. Free forever
              for basic listings — no card required.
            </p>
            <ul className="cta-checklist">
              <li>✓ List in under 5 minutes</li>
              <li>✓ Zero commission on sales</li>
              <li>✓ Buyers contact you directly on WhatsApp</li>
            </ul>
          </div>
          <div className="cta-actions">
          <button onClick={() => setJoinModalOpen(true)} className="btn-cta-primary">
              Create Free Account
            </button>
           <Link to="/marketplace" className="btn-cta-ghost">
              Browse Listings
            </Link>
          </div>
        </div>
        <div className="cta-emojis" aria-hidden="true">
          {["🐄", "🐐", "🐑", "🐓", "🦆"].map((e, i) => (
            <span
              key={i}
              className="cta-emoji"
              style={{ animationDelay: `${i * 0.3}s` }}
            >
              {e}
            </span>
          ))}
        </div>
      </section>
  <section className="kraal-section">
        <div className="section-inner">
          <div className="hero-live-feed">
  <span className="hlf-dot" />
  <span className="hlf-label">Live sales</span>
  <div className="hlf-items">
    {RECENTLY_SOLD.slice(0, 4).map((s, i) => (
      <span key={i} className="hlf-item">
        <strong>{s.qty}×</strong> {s.animal} · {s.location}
        <span className="hlf-time">{s.time}</span>
      </span>
    ))}
  </div>
</div>
          
        </div>
        
      </section>
      {/* ── FOOTER ── */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <img
                src={logo}
                style={{ width: "120px", filter: "brightness(0) invert(0)" }}
                alt="Kraal"
              />
              <span>Market</span>
            </div>
            <p>
              Zimbabwe's livestock marketplace,
              <br />
              going pan-African.
            </p>
            <div className="footer-socials">
             <Link to="https://www.facebook.com/profile.php?id=61589812884808" aria-label="Facebook">
                f
              </Link>
             <Link to="https://www.x.com/@Kraalmarketzim" aria-label="Twitter">
                𝕏
              </Link>
             <Link to="https://wa.me/27676056777" aria-label="WhatsApp">
                W
              </Link>
            </div>
          </div>
          <div className="footer-links">
             <div className="footer-col">
              <strong>Socials</strong>
              <Link to="https://www.x.com/@Kraalmarketzim">X / Twitter</Link>
              <Link to="https://www.linkedin.com/company/kraal">LinkedIn</Link>
              <Link to="https://www.youtube.com/channel/UCq0f7mTpFuPRDNCVkgpdyYw">Youtube</Link>
              <Link to="https://www.instagram.com/kraalmarket?utm_source=qr">Instagram</Link>
              <Link to="https://www.facebook.com/profile.php?id=61589812884808">Facebook</Link>
            </div>
            <div className="footer-col">
              <strong>Marketplace</strong>
              <Link to="/marketplace">Browse all</Link>
              <Link to="/marketplace?category=cattle">Cattle</Link>
              <Link to="/marketplace?category=goats">Goats</Link>
              <Link to="/marketplace?category=chicken">Road Runners</Link>
              <Link to="/marketplace?category=sheep">Sheep</Link>
            </div>
            <div className="footer-col">
              <strong>Sellers</strong>
             <Link to="/register">Start selling</Link>
              <Link to="/seller/dashboard">Dashboard</Link>
             <Link to="/sell">Post listing</Link>
             <Link to="/pricing">Pricing</Link>
            </div>
            <div className="footer-col">
              <strong>Company</strong>
             <Link to="/about">About Kraal</Link>
             <Link to="/blog/:slug">Blog Posts</Link>
             <Link to="/blog">Blog</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/blog">Farming Tips</Link>
             <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Kraal. Built with Love in Zimbabwe 🇿🇼
          </span>
          <span className="footer-tagline">
            From the farm gate to the world.
          </span>
        </div>
      </footer>
      <ProfileSheet isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
{/* ── BOTTOM NAV (mobile) ── */}
<nav className="home-bottom-nav">
  <div className="home-bottom-nav-inner">
    <Link
      to="/"
      className={`home-bottom-nav-item ${location.pathname === "/" ? "active" : ""}`}
    >
      🏠<span>Home</span>
    </Link>
    <Link
      to="/marketplace"
      className={`home-bottom-nav-item ${location.pathname === "/marketplace" ? "active" : ""}`}
    >
      🏪<span>Browse</span>
    </Link>
    <Link to="/sell" className="home-bottom-nav-post">
      +
    </Link>
    <Link
      to="/marketplace?saved=1"
      className={`home-bottom-nav-item ${location.pathname === "/marketplace" && location.search.includes("saved=1") ? "active" : ""}`}
    >
      🤍<span>Saved</span>
    </Link>
    <button
      className={`home-bottom-nav-item ${profileOpen ? "active" : ""}`}
      onClick={() => setProfileOpen(true)}
    >
      👤<span>Profile</span>
    </button>
  </div>
</nav>
{joinModalOpen && (
  <div className="kraal-modal-backdrop" onClick={() => setJoinModalOpen(false)}>
    <div className="kraal-modal-box" onClick={(e) => e.stopPropagation()}>
      <button
        className="kraal-modal-close"
        onClick={() => setJoinModalOpen(false)}
        aria-label="Close"
      >
        ✕
      </button>
      <KraalOnboardingForm
        onComplete={({ role, profile }) => {
          setJoinModalOpen(false);
          navigate("/dashboard");
        }}
      />
    </div>
  </div>
)}
<a
  href="https://wa.me/27676056777?text=Hi%20Kraal%2C%20I%20need%20help%20with%20a%20listing"
  target="_blank"
  rel="noopener noreferrer"
  className="whatsapp-float"
  aria-label="Chat with Kraal on WhatsApp"
>
  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.057 23.428a.75.75 0 0 0 .916.916l5.569-1.474A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.964-1.365l-.355-.212-3.668.971.982-3.584-.232-.368A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
  <span className="wa-label">Need help?</span>
</a>
 <CookieConsent />
    </div>
  );
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
function nameToColor(name = "") {
  const colors = [
    "#2D5A27", "#C85A2A", "#7A5C1E", "#1A5C6B",
    "#5C1A6B", "#1A3A6B", "#6B1A1A", "#2A5C4A",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
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
