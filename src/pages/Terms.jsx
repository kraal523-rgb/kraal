import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Terms.css";
import logo from "../assets/kraal-logo.svg";
const SECTIONS = [
  {
    id: "introduction",
    title: "Introduction",
    content: `Welcome to Kraal Market ("Kraal", "we", "our", or "us"). By accessing or using our platform at kraalmarket.com, you agree to be bound by these Terms of Service. Please read them carefully.

Kraal is a digital marketplace that connects livestock sellers and buyers across Zimbabwe and the broader African region. We provide tools for listing animals, communicating with buyers, and managing your seller profile.

These Terms apply to all users of the Kraal platform, including sellers, buyers, and visitors. If you do not agree with any part of these Terms, you may not use our services.`,
  },
  {
    id: "accounts",
    title: "Accounts & Registration",
    content: `To list animals on Kraal, you must create a seller account. You agree to provide accurate, current, and complete information during registration, and to keep your account details updated.

You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. If you suspect unauthorised access, notify us immediately at hello@kraalmarket.com.

We reserve the right to suspend or terminate accounts that provide false information, violate these Terms, or engage in activity harmful to other users or the platform.

Users must be at least 18 years old to create an account. By registering, you confirm that you meet this requirement.`,
  },
  {
    id: "listings",
    title: "Listings & Content",
    content: `Sellers are solely responsible for the accuracy of their listings. All information — including animal species, breed, age, weight, health status, and price — must be truthful and not misleading.

You must own or have the legal right to sell any animal you list on Kraal. Listing animals you do not have possession of, or creating fraudulent listings, is strictly prohibited and may result in immediate account termination and legal action.

Kraal reserves the right to remove any listing that we believe, in our sole discretion, violates these Terms, misrepresents the animal, or is otherwise harmful to users. We may edit listing titles or descriptions for clarity without notice.

Photos uploaded must be authentic images of the actual animals being sold. Stock photos or images of other animals are not permitted.`,
  },
  {
    id: "transactions",
    title: "Transactions & Payments",
    content: `Kraal is a listing and discovery platform. We do not process payments between buyers and sellers directly. All transactions are negotiated and completed between the parties involved.

We strongly advise all users to meet in person before completing any transaction, and to receive full payment before transferring ownership of any animal. Kraal is not liable for any loss arising from transactions conducted outside our recommended process.

Sellers agree that by listing on Kraal, they accept responsibility for the animals they sell, including ensuring animals are in the health and condition described at the time of sale.

Kraal charges no listing fee. A small success fee may apply to confirmed transactions facilitated through the platform. Fee structures will be communicated clearly and in advance.`,
  },
  {
    id: "conduct",
    title: "User Conduct",
    content: `All users of Kraal agree to behave honestly, respectfully, and in good faith. The following are strictly prohibited:

• Creating fake or duplicate accounts
• Posting misleading, inaccurate, or fraudulent listings
• Harassing, threatening, or abusing other users
• Attempting to circumvent platform fees by conducting deals off-platform after initial contact through Kraal
• Scraping, copying, or reproducing platform content without written permission
• Using the platform for any unlawful purpose

Violations may result in immediate suspension, permanent banning, and where appropriate, referral to law enforcement.`,
  },
  {
    id: "privacy",
    title: "Privacy & Data",
    content: `Your privacy matters to us. We collect only the data necessary to operate the platform, including your name, email address, phone number, location, and listing information.

We do not sell your personal data to third parties. We may share data with service providers who help us operate the platform (such as cloud storage and analytics), subject to strict confidentiality agreements.

By using Kraal, you consent to the collection and use of your data as described above. You may request deletion of your data at any time by contacting hello@kraalmarket.com.

We use industry-standard security measures to protect your data, but cannot guarantee absolute security. Use strong, unique passwords and keep your account credentials private.`,
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    content: `Kraal provides its platform on an "as is" and "as available" basis. We make no warranties, express or implied, regarding the accuracy of listings, the behaviour of other users, or uninterrupted access to the platform.

To the fullest extent permitted by law, Kraal shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including but not limited to loss of revenue, loss of data, or financial losses resulting from transactions with other users.

Our total liability to you for any claim arising out of or relating to these Terms or your use of Kraal shall not exceed the amount of any fees you have paid to us in the twelve months preceding the claim.`,
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    content: `We may update these Terms of Service from time to time. When we make material changes, we will notify registered users by email and display a notice on the platform.

Continued use of Kraal after changes are posted constitutes your acceptance of the revised Terms. If you do not agree to the updated Terms, you should stop using the platform and may request account deletion.

The date of the most recent update is shown at the top of this page. We encourage you to review these Terms periodically.`,
  },
  {
    id: "governing",
    title: "Governing Law",
    content: `These Terms are governed by and construed in accordance with the laws of Zimbabwe. Any disputes arising from or relating to these Terms or your use of Kraal shall be subject to the exclusive jurisdiction of the courts of Zimbabwe.

If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.

For questions about these Terms, contact us at legal@kraalmarket.com or write to: Kraal Market Ltd, 4th Floor, Sam Levy's Village, Borrowdale, Harare, Zimbabwe.`,
  },
];

export default function Terms() {
  const [active, setActive] = useState("introduction");

  const activeSection = SECTIONS.find((s) => s.id === active);

  return (
    <div className="terms-page">
      {/* ── NAV ── */}
      <nav className="terms-nav">
        <Link to="/" className="terms-logo">
          <KraalMark />
          <span>Kraal</span>
        </Link>
        <div className="terms-nav-links">
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </nav>

      {/* ── HEADER ── */}
      <div className="terms-header">
        <div className="terms-header-inner">
          <p className="terms-eyebrow">Legal</p>
          <h1>Terms of Service</h1>
          <p className="terms-updated">Last updated: 1 January 2025</p>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="terms-body">
        {/* Sidebar */}
        <nav className="terms-sidebar">
          <p className="terms-sidebar-label">Contents</p>
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              className={`terms-nav-item ${active === s.id ? "active" : ""}`}
              onClick={() => setActive(s.id)}
            >
              <span className="tni-num">{String(i + 1).padStart(2, "0")}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="terms-content">
          <div className="terms-section" key={activeSection.id}>
            <h2>{activeSection.title}</h2>
            {activeSection.content.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <div className="terms-nav-btns">
            {SECTIONS.findIndex((s) => s.id === active) > 0 && (
              <button
                className="terms-prev-btn"
                onClick={() => {
                  const i = SECTIONS.findIndex((s) => s.id === active);
                  setActive(SECTIONS[i - 1].id);
                }}
              >
                ← Previous
              </button>
            )}
            {SECTIONS.findIndex((s) => s.id === active) <
              SECTIONS.length - 1 && (
              <button
                className="terms-next-btn"
                onClick={() => {
                  const i = SECTIONS.findIndex((s) => s.id === active);
                  setActive(SECTIONS[i + 1].id);
                }}
              >
                Next →
              </button>
            )}
          </div>

          <div className="terms-contact-note">
            <span>📬</span>
            <p>
              Questions about these terms?{" "}
              <Link to="/contact">Contact our team</Link> — we're happy to
              explain anything.
            </p>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="terms-footer">
        <div className="terms-footer-inner">
          <span>© 2025 Kraal Market Ltd · Harare, Zimbabwe</span>
          <div className="terms-footer-links">
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/marketplace">Marketplace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function KraalMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="17" fill="#2D5A27" />
      <text
        x="17"
        y="23"
        textAnchor="middle"
        fontSize="18"
        fill="white"
        fontFamily="Georgia, serif"
        fontWeight="bold"
      >
        K
      </text>
    </svg>
  );
}
