// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useRef, useCallback } from "react";
import InstallButton from '../components/InstallButton'
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp  } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/kraal-logo.svg";
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
import imgDonkey from "../assets/pngegg__3.png"
import videoCattle from "../assets/videos/cattle-1.mp4";
import imgGeese from "../assets/geese.png";
import imgCats from "../assets/cat.jpg";
import imgPigeons from "../assets/pigeon.jpg";
import imgGuineaPig from "../assets/guineapig.png";
import imgOstrich from "../assets/ostrich.png";
import imgQuail from "../assets/quail.png";
import "./Home.css";
import Marketplace from "./Marketplace";
import "./Marketplace.css";
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
  const [featuredListings, setFeaturedListings] = useState([]);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertSubmitted, setAlertSubmitted] = useState(false);
  const [ setVisibleSections] = useState({});
  const observerRef = useRef(null);
  const [fetchError, setFetchError] = useState(false);
  // Rotate testimonials
  useEffect(() => {
    const t = setInterval(
      () => setActiveTestimonial((i) => (i + 1) % TESTIMONIALS.length),
      5000,
    );
    return () => clearInterval(t);
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
            setVisibleSections((prev) => ({
              ...prev,
              [entry.target.id]: true,
            }));
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
      {/* ── PRICE TICKER BAND ── */}
      <div className="price-ticker-band" aria-label="Live market prices">
        <div className="price-ticker-label">📊 Live Prices</div>
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
<Link to="/signin" className="nav-signin">Sign In</Link>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="nav-signin">Sign in</Link>
            <Link to="/register" className="nav-cta">
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

      {/* ── HERO ── */}
     <section className="hero">
  {/* Video background */}
  <video
    className="hero-video"
    src={videoCattle}
    autoPlay
    muted
    loop
    playsInline
  />
  <div className="hero-video-overlay" aria-hidden="true" />

  <div className="hero-grain" aria-hidden="true" />
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-pattern" aria-hidden="true" />

        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              Zimbabwe's #1 Livestock Marketplace
            </div>
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
                {["TM", "SN", "FC", "JM", "BN"].map((i, idx) => (
                  <span
                    key={idx}
                    className="proof-avatar"
                    style={{ zIndex: 5 - idx }}
                  >
                    {i}
                  </span>
                ))}
              </div>
              <span className="proof-text">
                Joined by <strong>12,000+</strong> farmers this season
              </span>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-card-stack">
              {FEATURED_LISTINGS.slice(0, 3).map((listing, i) => (
                <div
                  key={listing.id}
                  className="hero-mini-card"
                  style={{ "--card-i": i }}
                  onClick={() =>
                    navigate(`/marketplace?category=${listing.tag}`)
                  }
                >
                  <span className="hmc-emoji">{listing.emoji}</span>
                  <div className="hmc-info">
                    <strong>{listing.title}</strong>
                    <span>{listing.location}</span>
                  </div>
                  <div className="hmc-price">
                    <strong>{listing.price}</strong>
                    <span>{listing.unit}</span>
                  </div>
                  <span className="hmc-badge">{listing.badge}</span>
                </div>
              ))}
              <div className="hero-card-glow" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Decorative orbs */}
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />
        <div className="hero-orb hero-orb-3" aria-hidden="true" />
      </section>

      {/* ── STATS ── */}
      <section className="stats-band">
        {STATS.map((s) => (
          <div key={s.label} className="stat-item">
            <span className="stat-icon">{s.icon}</span>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── CATEGORIES ── */}
      <section className="categories-section" id="categories" data-observe>
        <div className="section-inner">
          <div className="section-header">
            <div>
              <p className="section-eyebrow">What are you looking for?</p>
              <h2 className="section-title">Browse by Animal</h2>
            </div>
           <Link to="/marketplace" className="section-link">
              View all listings →
            </Link>
          </div>
          <div className="categories-grid">
            {CATEGORIES.map((cat, i) => (
              <button
  key={cat.id}
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
          <Link to="/register" className="btn-cta-primary">
              Create Free Account
            </Link>
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

      {/* ── FOOTER ── */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <img
                src={logo}
                style={{ width: "120px", filter: "brightness(0) invert(1)" }}
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
             <Link to="#" aria-label="Facebook">
                f
              </Link>
             <Link to="#" aria-label="Twitter">
                𝕏
              </Link>
             <Link to="#" aria-label="WhatsApp">
                W
              </Link>
            </div>
          </div>
          <div className="footer-links">
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
