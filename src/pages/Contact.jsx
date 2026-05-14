import  { useState } from "react";
import { Link } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import emailjs from "@emailjs/browser";
import "./Contact.css";
import ProfileSheet from "../components/ProfileSheet";
import logo from "../assets/kraal-logo.svg";
const CONTACT_OPTIONS = [
  {
    icon: "💬",
    title: "WhatsApp Support",
    desc: "Fastest response. Mon–Sat, 7am–7pm CAT.",
    action: "Chat now",
    href: "https://wa.me/2637712345678?text=Hi Kraal support team,",
  },
  {
    icon: "📧",
    title: "Email us",
    desc: "We reply within 24 hours on business days.",
    action: "hello@kraalmarket.com",
    href: "mailto:hello@kraalmarket.com",
  },
  {
    icon: "📍",
    title: "Visit us",
    desc: "4th Floor, Sam Levy's Village, Borrowdale, Harare",
    action: null,
    href: null,
  },
];

const FAQS = [
  {
    q: "Is listing on Kraal free?",
    a: "Yes. Creating a seller account and posting listings is completely free. We charge a small success fee only when a deal is confirmed through the platform.",
  },
  {
    q: "How do I verify my seller account?",
    a: "After registering, our team manually reviews your profile within 1–2 business days. You'll receive a WhatsApp message once you're verified.",
  },
  {
    q: "What happens if a buyer doesn't pay?",
    a: "We strongly recommend meeting in person and receiving payment before transferring animals. Never release livestock before payment is cleared.",
  },
  {
    q: "Can I list animals from outside Zimbabwe?",
    a: "Currently we support sellers in Zimbabwe, Zambia, Botswana, South Africa, and Mozambique. More countries coming soon.",
  },
  {
    q: "How do I delete a listing?",
    a: "Go to your Seller Dashboard → My Listings → click the 🗑 delete button on the listing. It is removed immediately.",
  },
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
const [profileOpen, setProfileOpen] = useState(false);
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // Save to Firestore
    await addDoc(collection(db, "contact_messages"), {
      ...form,
      createdAt: serverTimestamp(),
      read: false,
    });
   await emailjs.send(
  import.meta.env.VITE_EMAILJS_SERVICE_ID,
  import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  {
    from_name: form.name,
    from_email: form.email,
    subject: form.subject,
    message: form.message,
  },
  import.meta.env.VITE_EMAILJS_PUBLIC_KEY
);
    setSent(true);
  } catch (err) {
    console.error("Failed:", err);
  }
};

  return (
    <div className="contact-page">
      {/* ── NAV ── */}
      <nav className="contact-nav">
        <Link to="/" className="contact-logo">
           <img src={logo} style={{ width: "140px" }} alt="Kraal" />
        </Link>
        <div className="contact-nav-links">
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/about">About</Link>
          <Link to="/register" className="contact-nav-cta">
            Start selling
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="contact-hero">
        <div className="contact-hero-inner">
          <p className="contact-eyebrow">We're here to help</p>
          <h1>Get in touch</h1>
          <p className="contact-hero-sub">
            Whether you're a seller with a question or a buyer needing support —
            our team responds fast.
          </p>
        </div>
      </section>

      {/* ── CONTACT OPTIONS ── */}
      <section className="contact-options-section">
        <div className="contact-options-inner">
          {CONTACT_OPTIONS.map((opt) => (
            <div key={opt.title} className="contact-option-card">
              <span className="coc-icon">{opt.icon}</span>
              <h3>{opt.title}</h3>
              <p>{opt.desc}</p>
              {opt.href ? (
                <a
                  href={opt.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="coc-link"
                >
                  {opt.action} →
                </a>
              ) : (
                <span className="coc-address">{opt.action}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FORM + FAQ ── */}
      <section className="contact-body">
        <div className="contact-body-inner">
          {/* Form */}
          <div className="contact-form-wrap">
            <h2>Send us a message</h2>
            <p className="contact-form-sub">
              We'll get back to you within 24 hours.
            </p>

            {sent ? (
              <div className="contact-sent">
                <div className="sent-check">✓</div>
                <h3>Message sent!</h3>
                <p>
                  Thanks for reaching out. We'll reply to{" "}
                  <strong>{form.email}</strong> shortly.
                </p>
                <button
                  className="contact-send-btn"
                  onClick={() => {
                    setSent(false);
                    setForm({ name: "", email: "", subject: "", message: "" });
                  }}
                >
                  Send another
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit} noValidate>
                <div className="cf-row">
                  <div className="cf-group">
                    <label>Your name</label>
                    <input
                      type="text"
                      placeholder="Tendai Moyo"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="cf-group">
                    <label>Email address</label>
                    <input
                      type="email"
                      placeholder="tendai@example.com"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="cf-group">
                  <label>Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, subject: e.target.value }))
                    }
                    required
                  >
                    <option value="">Select a topic…</option>
                    <option>Account / Registration</option>
                    <option>Listing a problem</option>
                    <option>Payment / Fees</option>
                    <option>Report a user</option>
                    <option>Partnership inquiry</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="cf-group">
                  <label>Message</label>
                  <textarea
                    rows={5}
                    placeholder="Tell us what's on your mind…"
                    value={form.message}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, message: e.target.value }))
                    }
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="contact-send-btn"
                  disabled={
                    !form.name || !form.email || !form.subject || !form.message
                  }
                >
                  Send message →
                </button>
              </form>
            )}
          </div>

          {/* FAQ */}
          <div className="contact-faq">
            <h2>Common questions</h2>
            <div className="faq-list">
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className={`faq-item ${openFaq === i ? "open" : ""}`}
                >
                  <button
                    className="faq-q"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-chevron">
                      {openFaq === i ? "−" : "+"}
                    </span>
                  </button>
                  {openFaq === i && <div className="faq-a">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="contact-footer">
        <div className="contact-footer-inner">
          <span>© 2026 Kraal Market Ltd · Harare, Zimbabwe</span>
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
      </footer>
      <ProfileSheet isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      <nav className="home-bottom-nav">
        <div className="home-bottom-nav-inner">
          <Link to="/" className="home-bottom-nav-item active">
            🏠<span>Home</span>
          </Link>
          <Link to="/marketplace" className="home-bottom-nav-item">
            🏪<span>Browse</span>
          </Link>
          <Link to="/sell" className="home-bottom-nav-post">
            +
          </Link>
          <Link to="/marketplace?saved=1" className="home-bottom-nav-item">
            🤍<span>Saved</span>
          </Link>
         <Link className="mp-bottom-nav-item" onClick={() => setProfileOpen(true)}>
        👤<span>Profile</span>
      </Link>
        </div>
      </nav>
    </div>
  );
}

