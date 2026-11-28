import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CATEGORIES,
  fetchUpcomingAuctions,
} from "../../services/auctionService";
import "./AuctionsRow.css";

const SALE_TYPES = {
  commercial: "Commercial",
  stud: "Stud",
  slaughter: "Slaughter only",
};

const sameDay = (a, b) => a.toDateString() === b.toDateString();

function whenLabel(d) {
  if (!d) return "Date to be confirmed";
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (sameDay(d, now)) return `Today · ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow · ${time}`;
  const date = d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${date} · ${time}`;
}

/**
 * A horizontally scrolling row of upcoming livestock sales.
 * Renders nothing while loading, on error, or when there are no sales.
 */
export default function AuctionsRow({
  eyebrow = "Live auctions",
  title = "Upcoming livestock sales",
  max = 8,
}) {
  const [auctions, setAuctions] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchUpcomingAuctions(30)
      .then((list) => {
        if (!alive) return;
        setAuctions(list.filter((a) => a.status !== "cancelled").slice(0, max));
      })
      .catch((e) => console.warn("Auctions row failed:", e?.code, e?.message));
    return () => {
      alive = false;
    };
  }, [max]);

  if (auctions.length === 0) return null;

  return (
    <section className="ar-section" aria-label={title}>
      <div className="ar-wrap">
        <div className="ar-header">
          <div>
            <p className="ar-eyebrow">{eyebrow}</p>
            <h2 className="ar-title">{title}</h2>
          </div>
          <Link to="/auctions" className="ar-link">
            View all sales →
          </Link>
        </div>

        <div className="ar-track">
          {auctions.map((a) => {
            const cover = (a.photos || []).find((u) => /^https:\/\//i.test(u));
            const counts = CATEGORIES.filter((c) => a.headCount?.[c] > 0);
            return (
              <Link to="/auctions" key={a.id} className="ar-card">
                <div className="ar-media">
                  {cover ? (
                    <img src={cover} alt={a.title} loading="lazy" />
                  ) : (
                    <span className="ar-media-fallback" aria-hidden="true">
                      🐄
                    </span>
                  )}
                  <span className="ar-badge">
                    {SALE_TYPES[a.saleType] || "Sale"}
                  </span>
                </div>
                <div className="ar-body">
                  <h3 className="ar-card-title">{a.title}</h3>
                  {a.auctioneerName && (
                    <p className="ar-muted">{a.auctioneerName}</p>
                  )}
                  <p className="ar-when">{whenLabel(a.startsAt)}</p>
                  <p className="ar-muted">
                    📍 {[a.venue, a.province].filter(Boolean).join(", ")}
                  </p>
                  {a.totalHead > 0 && (
                    <p className="ar-head">
                      {a.totalHead} head
                      {counts.length > 0 &&
                        ` · ${counts
                          .slice(0, 2)
                          .map((c) => `${a.headCount[c]} ${c}`)
                          .join(", ")}`}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
