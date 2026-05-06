// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/kraal-logo.svg";
import imgCattle from "../assets/pngegg__5.png";
import imgGoats from "../assets/pngegg__6.png";
import imgSheep from "../assets/pngegg__7.png";
import imgDucks from "../assets/pngegg__11.png";
import imgGuinea from "../assets/pngegg__13.png";
import imgRabbits from "../assets/pngegg__14.png";
import imghen from "../assets/pngegg__9.png";
import imgHorse from "../assets/pngegg__20.png";
import imgTurkey from "../assets/pngegg__16.png";
import imgPig from "../assets/pngegg__18.png";
import imgDog from "../assets/pngegg__4.png";
import imgDonkey from "../assets/pngegg__3.png";
import "./Marketplace.css";

// ─── DATA ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all", img: null, label: "All Animals", emoji: "🐾" },
  { id: "cattle", img: imgCattle, label: "Cattle" },
  { id: "goats", img: imgGoats, label: "Goats" },
  { id: "sheep", img: imgSheep, label: "Sheep" },
  { id: "chicken", img: imghen, label: "Road Runner" },
  { id: "guinea", img: imgGuinea, label: "Guinea Fowl" },
  { id: "ducks", img: imgDucks, label: "Ducks" },
  { id: "rabbits", img: imgRabbits, label: "Rabbits" },
  { id: "turkey", img: imgTurkey, label: "Turkey" },
  { id: "pigs", img: imgPig, label: "Pigs" },
  { id: "horses", img: imgHorse, label: "Horses" },
  { id: "dogs", img: imgDog, label: "Dogs" },
  { id: "donkeys", img: imgDonkey, label: "Donkeys" },
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

const LISTINGS = [
  // Cattle
  {
    id: 1,
    category: "cattle",
    emoji: "🐄",
    title: "10× Brahman Bulls",
    location: "Marondera, Mashonaland",
    price: 1200,
    currency: "USD",
    unit: "per head",
    badge: "Verified",
    age: "3 yrs",
    weight: "520kg",
    qty: 10,
    daysAgo: 1,
    seller: "Takudzwa M.",
    sellerRating: 4.9,
    views: 234,
    breed: "Brahman",
    desc: "Excellent temperament, all vaccinated and dewormed. Ready for breeding or fattening.",
  },
  {
    id: 2,
    category: "cattle",
    emoji: "🐄",
    title: "5× Nguni Cows",
    location: "Gweru, Midlands",
    price: 850,
    currency: "USD",
    unit: "per head",
    badge: "Pedigree",
    age: "4 yrs",
    weight: "380kg",
    qty: 5,
    daysAgo: 2,
    seller: "Farai C.",
    sellerRating: 4.7,
    views: 189,
    breed: "Nguni",
    desc: "Indigenous breed, disease-resistant and low maintenance. Perfect for communal farming.",
  },
  {
    id: 3,
    category: "cattle",
    emoji: "🐂",
    title: "2× Ankole Bulls",
    location: "Bulawayo, Matabeleland",
    price: 1500,
    currency: "USD",
    unit: "per head",
    badge: "Premium",
    age: "5 yrs",
    weight: "600kg",
    qty: 2,
    daysAgo: 3,
    seller: "Sithembile N.",
    sellerRating: 5.0,
    views: 312,
    breed: "Ankole",
    desc: "Majestic long-horned Ankole bulls. Exceptional genetics, excellent for upgrading your herd.",
  },
  {
    id: 4,
    category: "cattle",
    emoji: "🐄",
    title: "20× Hereford Heifers",
    location: "Harare, Mashonaland",
    price: 720,
    currency: "USD",
    unit: "per head",
    badge: "Vaccinated",
    age: "18 mo",
    weight: "280kg",
    qty: 20,
    daysAgo: 1,
    seller: "Joseph M.",
    sellerRating: 4.8,
    views: 156,
    breed: "Hereford",
    desc: "Young heifers ready for breeding. All up to date on vaccinations and dipping.",
  },
  {
    id: 5,
    category: "cattle",
    emoji: "🐄",
    title: "8× Simmental Cows",
    location: "Chinhoyi, Mashonaland",
    price: 980,
    currency: "USD",
    unit: "per head",
    badge: "Milking",
    age: "3 yrs",
    weight: "450kg",
    qty: 8,
    daysAgo: 4,
    seller: "Blessing N.",
    sellerRating: 4.6,
    views: 98,
    breed: "Simmental",
    desc: "High-yielding dairy crosses. Currently producing 12–15L/day. Calm and easy to handle.",
  },

  // Goats
  {
    id: 6,
    category: "goats",
    emoji: "🐐",
    title: "25× Boer Goats",
    location: "Gweru, Midlands",
    price: 175,
    currency: "USD",
    unit: "per head",
    badge: "Vaccinated",
    age: "18 mo",
    weight: "45kg",
    qty: 25,
    daysAgo: 2,
    seller: "Rudo T.",
    sellerRating: 4.8,
    views: 201,
    breed: "Boer",
    desc: "Top-quality meat goats. Healthy and robust with great conformation.",
  },
  {
    id: 7,
    category: "goats",
    emoji: "🐐",
    title: "12× Kalahari Red Does",
    location: "Masvingo, Masvingo",
    price: 220,
    currency: "USD",
    unit: "per head",
    badge: "Registered",
    age: "2 yrs",
    weight: "55kg",
    qty: 12,
    daysAgo: 1,
    seller: "Chipo M.",
    sellerRating: 4.9,
    views: 145,
    breed: "Kalahari",
    desc: "Registered Kalahari Red does with papers. Excellent mothering ability.",
  },
  {
    id: 8,
    category: "goats",
    emoji: "🐐",
    title: "50× Indigenous Goats",
    location: "Beitbridge, Matabeleland",
    price: 85,
    currency: "USD",
    unit: "per head",
    badge: "Bulk Deal",
    age: "Mixed",
    weight: "30kg",
    qty: 50,
    daysAgo: 3,
    seller: "Admire K.",
    sellerRating: 4.5,
    views: 87,
    breed: "Indigenous",
    desc: "Hardy local goats adapted to dry conditions. Suitable for meat or milk production.",
  },

  // Sheep
  {
    id: 9,
    category: "sheep",
    emoji: "🐑",
    title: "15× Merino Ewes",
    location: "Bulawayo, Matabeleland",
    price: 220,
    currency: "USD",
    unit: "per head",
    badge: "Pedigree",
    age: "2 yrs",
    weight: "60kg",
    qty: 15,
    daysAgo: 3,
    seller: "Thandi N.",
    sellerRating: 4.7,
    views: 122,
    breed: "Merino",
    desc: "Fine wool Merino ewes with excellent fleece quality. All in-lamb.",
  },
  {
    id: 10,
    category: "sheep",
    emoji: "🐑",
    title: "30× Dorper Lambs",
    location: "Marondera, Mashonaland",
    price: 120,
    currency: "USD",
    unit: "per head",
    badge: "Weaned",
    age: "3 mo",
    weight: "18kg",
    qty: 30,
    daysAgo: 2,
    seller: "Takudzwa M.",
    sellerRating: 4.9,
    views: 168,
    breed: "Dorper",
    desc: "Fast-growing Dorper lambs ready for fattening. Good muscle development.",
  },
  {
    id: 11,
    category: "sheep",
    emoji: "🐑",
    title: "6× Mutton Merino Rams",
    location: "Gweru, Midlands",
    price: 350,
    currency: "USD",
    unit: "per head",
    badge: "Registered",
    age: "3 yrs",
    weight: "90kg",
    qty: 6,
    daysAgo: 5,
    seller: "Farai C.",
    sellerRating: 4.7,
    views: 76,
    breed: "Mutton Merino",
    desc: "Stud rams with registration papers. Proven breeders with multiple seasons.",
  },

  // Chickens
  {
    id: 12,
    category: "chicken",
    emoji: "🐓",
    title: "200× Road Runners",
    location: "Mutare, Manicaland",
    price: 8,
    currency: "USD",
    unit: "per bird",
    badge: "Bulk Discount",
    age: "16 wks",
    weight: "1.2kg",
    qty: 200,
    daysAgo: 1,
    seller: "Sithembile N.",
    sellerRating: 5.0,
    views: 389,
    breed: "Indigenous",
    desc: "Free-range Road Runners raised on natural feed. No antibiotics, no hormones.",
  },
  {
    id: 13,
    category: "chicken",
    emoji: "🐓",
    title: "500× Day-Old Chicks",
    location: "Harare, Mashonaland",
    price: 1.5,
    currency: "USD",
    unit: "per bird",
    badge: "Hatchery",
    age: "1 day",
    weight: "0.05kg",
    qty: 500,
    daysAgo: 1,
    seller: "Sunrise Farm",
    sellerRating: 4.8,
    views: 512,
    breed: "Broiler",
    desc: "Day-old Cobb 500 broiler chicks from certified hatchery. 95%+ hatch rate.",
  },
  {
    id: 14,
    category: "chicken",
    emoji: "🐔",
    title: "80× Point-of-Lay Hens",
    location: "Chinhoyi, Mashonaland",
    price: 12,
    currency: "USD",
    unit: "per bird",
    badge: "Laying",
    age: "18 wks",
    weight: "1.8kg",
    qty: 80,
    daysAgo: 2,
    seller: "Green Valley",
    sellerRating: 4.6,
    views: 234,
    breed: "Hyline",
    desc: "Hyline laying hens at point of lay. Currently producing 90%+ lay rate.",
  },

  // Pigs
  {
    id: 15,
    category: "pigs",
    emoji: "🐖",
    title: "8× Duroc Piglets",
    location: "Chinhoyi, Mashonaland",
    price: 95,
    currency: "USD",
    unit: "per head",
    badge: "Weaned",
    age: "8 wks",
    weight: "12kg",
    qty: 8,
    daysAgo: 2,
    seller: "Joseph M.",
    sellerRating: 4.8,
    views: 143,
    breed: "Duroc",
    desc: "Purebred Duroc piglets, weaned and eating well. Great growth rates expected.",
  },
  {
    id: 16,
    category: "pigs",
    emoji: "🐷",
    title: "3× Large White Sows",
    location: "Harare, Mashonaland",
    price: 380,
    currency: "USD",
    unit: "per head",
    badge: "Proven",
    age: "2 yrs",
    weight: "180kg",
    qty: 3,
    daysAgo: 4,
    seller: "Kudzai P.",
    sellerRating: 4.9,
    views: 98,
    breed: "Large White",
    desc: "Proven sows with 2 litters recorded. Average of 11 piglets per litter.",
  },
  {
    id: 17,
    category: "pigs",
    emoji: "🐖",
    title: "1× Landrace Boar",
    location: "Gweru, Midlands",
    price: 650,
    currency: "USD",
    unit: "per head",
    badge: "Registered",
    age: "18 mo",
    weight: "220kg",
    qty: 1,
    daysAgo: 6,
    seller: "Rudo T.",
    sellerRating: 4.8,
    views: 67,
    breed: "Landrace",
    desc: "Stud boar with registration papers. Excellent libido and semen quality.",
  },

  // Horses
  {
    id: 18,
    category: "horses",
    emoji: "🐴",
    title: "3× Thoroughbred Mares",
    location: "Harare, Mashonaland",
    price: 3800,
    currency: "USD",
    unit: "per head",
    badge: "Registered",
    age: "5 yrs",
    weight: "500kg",
    qty: 3,
    daysAgo: 4,
    seller: "Harare Stud",
    sellerRating: 5.0,
    views: 201,
    breed: "Thoroughbred",
    desc: "Registered Thoroughbred mares with full racing history available on request.",
  },
  {
    id: 19,
    category: "horses",
    emoji: "🐎",
    title: "2× Quarter Horse Geldings",
    location: "Bulawayo, Matabeleland",
    price: 2200,
    currency: "USD",
    unit: "per head",
    badge: "Broken In",
    age: "6 yrs",
    weight: "480kg",
    qty: 2,
    daysAgo: 7,
    seller: "Ndlovu Ranch",
    sellerRating: 4.7,
    views: 134,
    breed: "Quarter Horse",
    desc: "Well-trained geldings, suitable for trail riding, farm work, or leisure.",
  },

  // Ducks
  {
    id: 20,
    category: "ducks",
    emoji: "🦆",
    title: "40× Muscovy Ducks",
    location: "Mutare, Manicaland",
    price: 18,
    currency: "USD",
    unit: "per bird",
    badge: "Free Range",
    age: "12 wks",
    weight: "2.5kg",
    qty: 40,
    daysAgo: 2,
    seller: "Chipo M.",
    sellerRating: 4.9,
    views: 89,
    breed: "Muscovy",
    desc: "Hardy free-range Muscovy ducks, excellent foragers and good for meat.",
  },
  {
    id: 21,
    category: "ducks",
    emoji: "🦆",
    title: "20× Pekin Ducks",
    location: "Marondera, Mashonaland",
    price: 22,
    currency: "USD",
    unit: "per bird",
    badge: "Meat Breed",
    age: "10 wks",
    weight: "3kg",
    qty: 20,
    daysAgo: 5,
    seller: "Admire K.",
    sellerRating: 4.5,
    views: 56,
    breed: "Pekin",
    desc: "Fast-growing Pekin ducks, ready for processing or further fattening.",
  },

  // Guinea Fowl
  {
    id: 22,
    category: "guinea",
    emoji: "🐦",
    title: "100× Guinea Fowl Keets",
    location: "Gweru, Midlands",
    price: 4,
    currency: "USD",
    unit: "per bird",
    badge: "Hatchery",
    age: "2 wks",
    weight: "0.1kg",
    qty: 100,
    daysAgo: 1,
    seller: "Kudzai P.",
    sellerRating: 4.9,
    views: 178,
    breed: "Helmeted",
    desc: "2-week-old guinea fowl keets from disease-free parent flock.",
  },
  {
    id: 23,
    category: "guinea",
    emoji: "🐦",
    title: "30× Adult Guinea Fowl",
    location: "Masvingo, Masvingo",
    price: 15,
    currency: "USD",
    unit: "per bird",
    badge: "Free Range",
    age: "8 mo",
    weight: "1.5kg",
    qty: 30,
    daysAgo: 3,
    seller: "Blessing N.",
    sellerRating: 4.6,
    views: 67,
    breed: "Helmeted",
    desc: "Free-ranging adults, excellent tick control birds. Selling due to relocation.",
  },

  // Rabbits
  {
    id: 24,
    category: "rabbits",
    emoji: "🐇",
    title: "20× New Zealand Whites",
    location: "Harare, Mashonaland",
    price: 25,
    currency: "USD",
    unit: "per head",
    badge: "Breeding",
    age: "3 mo",
    weight: "2kg",
    qty: 20,
    daysAgo: 2,
    seller: "Sunrise Farm",
    sellerRating: 4.8,
    views: 112,
    breed: "NZ White",
    desc: "Young rabbits ready for breeding or meat. Fast growth rate, good FCR.",
  },
  {
    id: 25,
    category: "rabbits",
    emoji: "🐇",
    title: "5× Angora Rabbits",
    location: "Bulawayo, Matabeleland",
    price: 65,
    currency: "USD",
    unit: "per head",
    badge: "Fibre Breed",
    age: "6 mo",
    weight: "3.5kg",
    qty: 5,
    daysAgo: 4,
    seller: "Thandi N.",
    sellerRating: 4.7,
    views: 78,
    breed: "Angora",
    desc: "Fluffy Angora rabbits for wool production. Gentle temperament, easy to groom.",
  },

  // Turkey
  {
    id: 26,
    category: "turkey",
    emoji: "🦃",
    title: "15× Bronze Turkeys",
    location: "Chinhoyi, Mashonaland",
    price: 45,
    currency: "USD",
    unit: "per bird",
    badge: "Free Range",
    age: "20 wks",
    weight: "6kg",
    qty: 15,
    daysAgo: 3,
    seller: "Green Valley",
    sellerRating: 4.6,
    views: 89,
    breed: "Bronze",
    desc: "Heritage Bronze turkeys raised free-range. Perfect for festive season.",
  },
  {
    id: 27,
    category: "turkey",
    emoji: "🦃",
    title: "50× Turkey Poults",
    location: "Marondera, Mashonaland",
    price: 12,
    currency: "USD",
    unit: "per bird",
    badge: "Vaccinated",
    age: "4 wks",
    weight: "0.5kg",
    qty: 50,
    daysAgo: 2,
    seller: "Joseph M.",
    sellerRating: 4.8,
    views: 134,
    breed: "Broad-Breasted White",
    desc: "4-week-old turkey poults, vaccinated against common diseases.",
  },

  // Dogs
  {
    id: 28,
    category: "dogs",
    emoji: "🐕",
    title: "6× Boerboel Puppies",
    location: "Harare, Mashonaland",
    price: 280,
    currency: "USD",
    unit: "per puppy",
    badge: "Registered",
    age: "8 wks",
    weight: "5kg",
    qty: 6,
    daysAgo: 1,
    seller: "Harare Stud",
    sellerRating: 5.0,
    views: 456,
    breed: "Boerboel",
    desc: "SABBS registered Boerboel puppies from champion parents. Both parents on site.",
  },
  {
    id: 29,
    category: "dogs",
    emoji: "🐕",
    title: "2× German Shepherd Adults",
    location: "Bulawayo, Matabeleland",
    price: 450,
    currency: "USD",
    unit: "per dog",
    badge: "Trained",
    age: "2 yrs",
    weight: "32kg",
    qty: 2,
    daysAgo: 5,
    seller: "Ndlovu Ranch",
    sellerRating: 4.7,
    views: 201,
    breed: "German Shepherd",
    desc: "Trained guard dogs with KUSA papers. Excellent with families and livestock.",
  },

  // Donkeys
  {
    id: 30,
    category: "donkeys",
    emoji: "🫏",
    title: "4× Working Donkeys",
    location: "Masvingo, Masvingo",
    price: 180,
    currency: "USD",
    unit: "per head",
    badge: "Trained",
    age: "4 yrs",
    weight: "180kg",
    qty: 4,
    daysAgo: 3,
    seller: "Admire K.",
    sellerRating: 4.5,
    views: 67,
    breed: "Standard",
    desc: "Strong working donkeys trained for cart and pack work. Well-tempered.",
  },
  {
    id: 31,
    category: "donkeys",
    emoji: "🫏",
    title: "2× Miniature Donkeys",
    location: "Harare, Mashonaland",
    price: 350,
    currency: "USD",
    unit: "per head",
    badge: "Friendly",
    age: "3 yrs",
    weight: "80kg",
    qty: 2,
    daysAgo: 6,
    seller: "Chipo M.",
    sellerRating: 4.9,
    views: 89,
    breed: "Miniature",
    desc: "Charming miniature donkeys, great for petting farms or companionship.",
  },
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

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function Marketplace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(
    searchParams.get("category") || "all",
  );
  const [location, setLocation] = useState(
    searchParams.get("location") || "All Locations",
  );
  const [sortBy, setSortBy] = useState("newest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedItems, setSavedItems] = useState(new Set());
  const [activeModal, setActiveModal] = useState(null);
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  const cardRefs = useRef({});

  // Sync URL params
  useEffect(() => {
    const params = {};
    if (search) params.q = search;
    if (category && category !== "all") params.category = category;
    if (location && location !== "All Locations") params.location = location;
    setSearchParams(params, { replace: true });
    setPage(1);
  }, [search, category, location]);

  // Card entrance animations
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

  // Filtered + sorted listings
  const filtered = useMemo(() => {
    let list = [...LISTINGS];
    if (category && category !== "all")
      list = list.filter((l) => l.category === category);
    if (location && location !== "All Locations")
      list = list.filter((l) => l.location.includes(location));
    if (search.trim())
      list = list.filter((l) =>
        [l.title, l.breed, l.location, l.desc]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
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
        list.sort((a, b) => b.views - a.views);
        break;
      default:
        list.sort((a, b) => a.daysAgo - b.daysAgo);
        break;
    }
    return list;
  }, [category, location, search, priceMin, priceMax, sortBy]);

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

  const activeListing = activeModal
    ? LISTINGS.find((l) => l.id === activeModal)
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
          <a href="/" className="mp-nav-logo">
            <img src={logo} style={{ width: "120px" }} alt="Kraal" />
            <span>Market</span>
          </a>
          <div className={`mp-nav-links ${menuOpen ? "open" : ""}`}>
            <a href="/marketplace" className="active">
              Browse Animals
            </a>
            <a href="/marketplace?category=cattle">Cattle</a>
            <a href="/marketplace?category=goats">Goats</a>
            <a href="/about">About</a>
          </div>
          <div className="mp-nav-actions">
            <a href="/login" className="mp-nav-signin">
              Sign in
            </a>
            <a href="/register" className="mp-nav-cta">
              + Post a Listing
            </a>
            <button
              className="mp-hamburger"
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

      {/* ── PAGE HEADER ── */}
      <div className="mp-header">
        <div className="mp-header-inner">
          <div className="mp-header-text">
            <h1>
              {category && category !== "all"
                ? (CATEGORIES.find((c) => c.id === category)?.label ??
                  "Animals")
                : "All Animals"}
            </h1>
            <p className="mp-header-count">
              <strong>{filtered.length}</strong> listing
              {filtered.length !== 1 ? "s" : ""} found
              {location !== "All Locations"
                ? ` in ${location}`
                : " across Zimbabwe & Southern Africa"}
            </p>
          </div>

          {/* Main search bar */}
          <form
            className="mp-searchbar"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
            }}
          >
            <span className="mp-search-icon">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search cattle, Boer goats, road runners…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="mp-search-clear"
                onClick={() => setSearch("")}
              >
                ✕
              </button>
            )}
            <button type="submit" className="mp-search-btn">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* ── CATEGORY PILLS ── */}
      <div className="mp-cats-wrap">
        <div className="mp-cats">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
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

      {/* ── MAIN LAYOUT ── */}
      <div className="mp-layout">
        {/* ── SIDEBAR ── */}
        <aside className={`mp-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="mp-sidebar-header">
            <h3>Filters</h3>
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

          {/* Animal category */}
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
                  <span className="mp-cfi-count">
                    {LISTINGS.filter((l) => l.category === cat.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Saved */}
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
        </aside>

        {/* ── SIDEBAR OVERLAY ── */}
        {sidebarOpen && (
          <div
            className="mp-sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
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
                  📍 {location}{" "}
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

          {/* Empty state */}
          {paginated.length === 0 && (
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
          <div className="mp-grid">
            {paginated.map((listing, i) => (
              <div
                key={listing.id}
                ref={(el) => (cardRefs.current[listing.id] = el)}
                data-id={listing.id}
                className={`mp-card ${visibleCards.has(String(listing.id)) ? "visible" : ""}`}
                style={{ animationDelay: `${(i % PER_PAGE) * 0.05}s` }}
              >
                {/* Card image / emoji area */}
                <div
                  className="mp-card-media"
                  onClick={() => setActiveModal(listing.id)}
                >
                  <div className="mp-card-emoji-wrap">
                    <span className="mp-card-emoji">{listing.emoji}</span>
                  </div>
                  <div className="mp-card-badges">
                    <span className="mp-card-badge">{listing.badge}</span>
                    <span className="mp-card-days">
                      {listing.daysAgo === 0
                        ? "Today"
                        : listing.daysAgo === 1
                          ? "Today"
                          : `${listing.daysAgo}d ago`}
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
                  <p className="mp-card-location">📍 {listing.location}</p>

                  <div className="mp-card-meta">
                    <span className="mp-meta-tag">🏷 {listing.breed}</span>
                    <span className="mp-meta-tag">⚖️ {listing.weight}</span>
                    <span className="mp-meta-tag">📅 {listing.age}</span>
                  </div>

                  <p className="mp-card-desc">{listing.desc.slice(0, 80)}…</p>

                  <div className="mp-card-seller">
                    <div className="mp-seller-avatar">
                      {listing.seller
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="mp-seller-info">
                      <span className="mp-seller-name">{listing.seller}</span>
                      <span className="mp-seller-rating">
                        ★ {listing.sellerRating}
                      </span>
                    </div>
                    <span className="mp-card-views">👁 {listing.views}</span>
                  </div>
                </div>

                {/* Card footer */}
                <div className="mp-card-footer">
                  <div className="mp-card-price">
                    <strong>${listing.price.toLocaleString()}</strong>
                    <span>{listing.unit}</span>
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
            ))}
          </div>

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
              <div className="mp-modal-emoji">{activeListing.emoji}</div>
              <div className="mp-modal-title-block">
                <span className="mp-modal-badge">{activeListing.badge}</span>
                <h2>{activeListing.title}</h2>
                <p className="mp-modal-location">📍 {activeListing.location}</p>
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
                      value: `${activeListing.qty} available`,
                    },
                    {
                      label: "Listed",
                      value:
                        activeListing.daysAgo <= 1
                          ? "Today"
                          : `${activeListing.daysAgo} days ago`,
                    },
                    { label: "Views", value: `${activeListing.views} views` },
                  ].map((d) => (
                    <div key={d.label} className="mp-modal-detail">
                      <span className="mp-modal-detail-label">{d.label}</span>
                      <span className="mp-modal-detail-value">{d.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mp-modal-desc">
                  <h4>Description</h4>
                  <p>{activeListing.desc}</p>
                </div>

                <div className="mp-modal-seller">
                  <div className="mp-modal-seller-avatar">
                    {activeListing.seller
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <strong>{activeListing.seller}</strong>
                    <div className="mp-modal-stars">{"★".repeat(5)}</div>
                    <span className="mp-modal-rating">
                      {activeListing.sellerRating} / 5.0
                    </span>
                  </div>
                </div>
              </div>

              <div className="mp-modal-action-panel">
                <div className="mp-modal-price">
                  <strong>${activeListing.price.toLocaleString()}</strong>
                  <span>{activeListing.unit}</span>
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
              <a href="/marketplace">Browse all</a>
              <a href="/marketplace?category=cattle">Cattle</a>
              <a href="/marketplace?category=goats">Goats</a>
            </div>
            <div className="mp-footer-col">
              <strong>Sellers</strong>
              <a href="/register">Start selling</a>
              <a href="/sell">Post listing</a>
              <a href="/pricing">Pricing</a>
            </div>
            <div className="mp-footer-col">
              <strong>Company</strong>
              <a href="/about">About Kraal</a>
              <a href="/contact">Contact</a>
              <a href="/terms">Terms</a>
            </div>
          </div>
        </div>
        <div className="mp-footer-bottom">
          <span>
            © {new Date().getFullYear()} Kraal. Built with ❤️ in Zimbabwe 🇿🇼
          </span>
          <span>From the farm gate to the world.</span>
        </div>
      </footer>
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
