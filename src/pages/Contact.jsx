import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import emailjs from "@emailjs/browser";
// eslint-disable-next-line no-unused-vars
import UserMenu from "../components/UserMenu";
import "./Contact.css";
import "./ContactDeletion.css";
import ProfileSheet from "../components/ProfileSheet";
import logo from "../assets/kraal-logo-black.svg";
import HomeNav from "../components/HomeNav";
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
  {
    q: "How do I delete my account and data?",
    a: "Use the “Delete your account & data” section further down this page and submit a request. We'll verify it's you, then delete your account and personal data.",
  },
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  // eslint-disable-next-line no-unused-vars
  const [menuOpen, setMenuOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  /* ── Account & data deletion request ── */
  const [delForm, setDelForm] = useState({
    name: "",
    email: "",
    phone: "",
    reason: "",
    confirm: false,
  });
  const [delSending, setDelSending] = useState(false);
  const [delSent, setDelSent] = useState(false);
  const [delError, setDelError] = useState("");

  // Make /contact#delete-account scroll to the section (needed for app-store deletion URLs)
  useEffect(() => {
    if (window.location.hash === "#delete-account") {
      const t = setTimeout(
        () =>
          document
            .getElementById("delete-account")
            ?.scrollIntoView({ behavior: "smooth" }),
        150,
      );
      return () => clearTimeout(t);
    }
  }, []);

  const handleDeleteRequest = async (e) => {
    e.preventDefault();
    setDelError("");
    setDelSending(true);
    try {
      // Firestore is the source of truth for the request
      await addDoc(collection(db, "deletion_requests"), {
        name: delForm.name,
        email: delForm.email,
        phone: delForm.phone,
        reason: delForm.reason,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      // Email notification is best-effort — don't fail the request if it errors
      try {
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          {
            from_name: delForm.name,
            from_email: delForm.email,
            subject: "Account & data deletion request",
            message: `Deletion request.\nPhone: ${delForm.phone || "n/a"}\nReason: ${delForm.reason || "n/a"}`,
          },
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
        );
      } catch (mailErr) {
        console.error("Deletion email notice failed:", mailErr);
      }
      setDelSent(true);
    } catch (err) {
      console.error("Deletion request failed:", err);
      setDelError(
        "Something went wrong sending your request. Please try again or email hello@kraalmarket.com.",
      );
    } finally {
      setDelSending(false);
    }
  };
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
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      );
      setSent(true);
    } catch (err) {
      console.error("Failed:", err);
    }
  };

  return (
    <div className="contact-page">
      <HomeNav />

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
                    <option>Delete my account / data</option>
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

      {/* ── DELETE ACCOUNT / DATA REQUEST ── */}
      <section className="contact-delete" id="delete-account">
        <div className="contact-delete-inner">
          <div className="cd-statement">
            <p className="contact-eyebrow">Your data, your choice</p>
            <h2>Delete your account &amp; data</h2>
            <p>
              You can ask us to permanently delete your Kraal account and the
              personal data linked to it at any time. Submit a request using the
              form and we will confirm it's you, then process it.
            </p>

            <h3>What gets deleted</h3>
            <ul>
              <li>
                Your profile and login details (name, email, phone number)
              </li>
              <li>Your seller profile, listings and uploaded photos</li>
              <li>Saved items, messages and preferences</li>
            </ul>

            <h3>What we may keep</h3>
            <p>
              Where the law requires it, or to prevent fraud and resolve
              disputes, we may retain limited records such as completed
              transaction and payment details. Anything we keep is only used for
              those purposes and is not used to identify you for marketing.
            </p>

            <h3>How long it takes</h3>
            <p>
              We aim to complete verified requests within 30 days. Deletion is
              permanent and cannot be undone, so download anything you need
              first. You can also email{" "}
              <a href="mailto:hello@kraalmarket.com?subject=Account%20and%20data%20deletion%20request">
                hello@kraalmarket.com
              </a>{" "}
              from the address registered on your account.
            </p>
          </div>

          <div className="cd-form-wrap">
            {delSent ? (
              <div className="contact-sent">
                <div className="sent-check">✓</div>
                <h3>Request received</h3>
                <p>
                  We've logged your deletion request for{" "}
                  <strong>{delForm.email}</strong>. We may email you to verify
                  your identity before we delete anything.
                </p>
              </div>
            ) : (
              <form
                className="contact-form"
                onSubmit={handleDeleteRequest}
                noValidate
              >
                <h3 className="cd-form-title">Request deletion</h3>
                <div className="cf-group">
                  <label htmlFor="del-name">Full name</label>
                  <input
                    id="del-name"
                    type="text"
                    placeholder="Tendai Moyo"
                    value={delForm.name}
                    onChange={(e) =>
                      setDelForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="cf-group">
                  <label htmlFor="del-email">Account email</label>
                  <input
                    id="del-email"
                    type="email"
                    placeholder="The email you signed up with"
                    value={delForm.email}
                    onChange={(e) =>
                      setDelForm((f) => ({ ...f, email: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="cf-group">
                  <label htmlFor="del-phone">Phone number (optional)</label>
                  <input
                    id="del-phone"
                    type="tel"
                    placeholder="+263 77 123 4567"
                    value={delForm.phone}
                    onChange={(e) =>
                      setDelForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="cf-group">
                  <label htmlFor="del-reason">Reason (optional)</label>
                  <textarea
                    id="del-reason"
                    rows={3}
                    placeholder="Help us improve — why are you leaving?"
                    value={delForm.reason}
                    onChange={(e) =>
                      setDelForm((f) => ({ ...f, reason: e.target.value }))
                    }
                  />
                </div>
                <label className="cd-confirm">
                  <input
                    type="checkbox"
                    checked={delForm.confirm}
                    onChange={(e) =>
                      setDelForm((f) => ({ ...f, confirm: e.target.checked }))
                    }
                  />
                  <span>
                    I understand my account and data will be permanently deleted
                    and this can't be undone.
                  </span>
                </label>
                {delError && (
                  <p className="cd-error" role="alert">
                    {delError}
                  </p>
                )}
                <button
                  type="submit"
                  className="contact-send-btn cd-submit"
                  disabled={
                    delSending ||
                    !delForm.name ||
                    !delForm.email ||
                    !delForm.confirm
                  }
                >
                  {delSending ? "Sending…" : "Request account deletion"}
                </button>
              </form>
            )}
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
              <Link
                to="https://www.facebook.com/profile.php?id=61589812884808"
                aria-label="Facebook"
              >
                f
              </Link>
              <Link to="https://www.x.com/@Kraalmarketzim" aria-label="Twitter">
                𝕏
              </Link>
              <Link to="https://wa.me/263776109275" aria-label="WhatsApp">
                W
              </Link>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <strong>Socials</strong>
              <Link to="https://www.x.com/@Kraalmarketzim">X / Twitter</Link>
              <Link to="https://www.linkedin.com/company/kraal">LinkedIn</Link>
              <Link to="https://www.youtube.com/channel/UCq0f7mTpFuPRDNCVkgpdyYw">
                Youtube
              </Link>
              <Link to="https://www.instagram.com/kraalmarket?utm_source=qr">
                Instagram
              </Link>
              <Link to="https://www.facebook.com/profile.php?id=61589812884808">
                Facebook
              </Link>
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
              <Link to="/contact#delete-account">Delete account</Link>
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
      <ProfileSheet
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
}
