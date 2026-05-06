import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./About.css";
import logo from "../assets/kraal-logo.svg";
const TEAM = [
  {
    name: "Tendai Moyo",
    role: "Co-founder & CEO",
    bio: "Third-generation cattle farmer from Masvingo. Built Kraal to give every farmer the reach of a city trader.",
    initials: "TM",
    color: "#2D5A27",
  },
  {
    name: "Rudo Chikwanda",
    role: "Co-founder & CTO",
    bio: "Software engineer who grew up on a goat farm in Matabeleland. Believes technology should serve the land.",
    initials: "RC",
    color: "#5A8A27",
  },
  {
    name: "Farai Mutasa",
    role: "Head of Seller Success",
    bio: "Former agricultural extension officer. Has helped over 3,000 farmers list their first animal online.",
    initials: "FM",
    color: "#8A6A27",
  },
];

const VALUES = [
  {
    icon: "🤝",
    title: "Trust first",
    desc: "Every verified seller goes through a manual review. We'd rather grow slowly than grow recklessly.",
  },
  {
    icon: "🌍",
    title: "Africa-built",
    desc: "Designed for low-bandwidth, mobile-first, and the realities of rural connectivity across the continent.",
  },
  {
    icon: "🐾",
    title: "Farmer-led",
    desc: "Our decisions are driven by farmers, not investors. We ask before we build.",
  },
  {
    icon: "💚",
    title: "Fair pricing",
    desc: "Listing on Kraal is free. We only charge a small success fee when a deal is confirmed.",
  },
];

const STATS = [
  { number: "12,000+", label: "Active sellers" },
  { number: "45,000+", label: "Animals listed" },
  { number: "5", label: "Countries reached" },
  { number: "2021", label: "Founded in Harare" },
];

export default function About() {
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 },
    );

    document.querySelectorAll("[data-reveal]").forEach((el) => {
      observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="about-page">
      {/* ── NAV ── */}
      <nav className="about-nav">
        <Link to="/" className="about-logo">
          <KraalMark />
          <span>Kraal</span>
        </Link>
        <div className="about-nav-links">
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/register" className="about-nav-cta">
            Start selling
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="about-hero">
        <div className="about-hero-inner">
          <div className="about-hero-eyebrow">Our story</div>
          <h1 className="about-hero-title">
            Built on the land.
            <br />
            <span className="hero-accent">Built for the farmer.</span>
          </h1>
          <p className="about-hero-sub">
            Kraal started with a simple frustration: why should a cattle farmer
            in Masvingo have to rely on word-of-mouth and middlemen when buyers
            in Harare are searching online every day? We built the bridge.
          </p>
        </div>
        <div className="about-hero-art" aria-hidden="true">
          <span className="ha ha-1">🐄</span>
          <span className="ha ha-2">🐐</span>
          <span className="ha ha-3">🐑</span>
          <span className="ha ha-4">🐓</span>
          <span className="ha ha-5">🐖</span>
          <span className="ha ha-6">🦆</span>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="about-stats" data-reveal>
        {STATS.map((s) => (
          <div key={s.label} className="astat">
            <span className="astat-num">{s.number}</span>
            <span className="astat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── MISSION ── */}
      <section className="about-mission">
        <div className="about-mission-inner">
          <div className="about-mission-text" data-reveal>
            <p className="section-eyebrow">Why we exist</p>
            <h2>
              Livestock markets haven't changed in decades.
              <br />
              We think they should.
            </h2>
            <p>
              Across Zimbabwe and the region, billions of dollars in livestock
              trade happens through handshakes, phone calls, and cattle auctions
              that only reach a fraction of potential buyers. Meanwhile, farmers
              with exceptional animals struggle to get fair prices simply
              because of geography.
            </p>
            <p>
              Kraal is a digital marketplace purpose-built for African
              livestock. We handle the visibility so farmers can focus on what
              they do best — raising healthy animals and running their land.
            </p>
          </div>
          <div className="about-mission-img" data-reveal>
            <div className="mission-img-block">
              <div className="mib-inner">
                <span className="mib-emoji">🌿</span>
                <blockquote>
                  "Before Kraal, I drove 3 hours to every auction. Now buyers
                  find me."
                </blockquote>
                <cite>— Admire K., Cattle farmer, Gweru</cite>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="about-values">
        <div className="about-values-inner">
          <p className="section-eyebrow" data-reveal>
            What drives us
          </p>
          <h2 data-reveal>Our values</h2>
          <div className="values-grid">
            {VALUES.map((v, i) => (
              <div
                key={v.title}
                className="value-card"
                data-reveal
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <span className="value-icon">{v.icon}</span>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="about-team">
        <div className="about-team-inner">
          <p className="section-eyebrow" data-reveal>
            The people
          </p>
          <h2 data-reveal>Who's behind Kraal</h2>
          <div className="team-grid">
            {TEAM.map((member, i) => (
              <div
                key={member.name}
                className="team-card"
                data-reveal
                style={{ transitionDelay: `${i * 0.12}s` }}
              >
                <div
                  className="team-avatar"
                  style={{ background: member.color }}
                >
                  {member.initials}
                </div>
                <h3>{member.name}</h3>
                <span className="team-role">{member.role}</span>
                <p>{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="about-cta" data-reveal>
        <div className="about-cta-inner">
          <h2>Ready to reach more buyers?</h2>
          <p>
            Join thousands of farmers already selling on Kraal. It's free to
            list.
          </p>
          <div className="about-cta-btns">
            <Link to="/register" className="cta-btn-primary">
              Start selling free →
            </Link>
            <Link to="/marketplace" className="cta-btn-ghost">
              Browse listings
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="about-footer">
        <div className="about-footer-inner">
          <span>© 2025 Kraal Market Ltd · Harare, Zimbabwe</span>
          <div className="about-footer-links">
            <Link to="/terms">Terms</Link>
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
