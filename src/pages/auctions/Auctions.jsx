import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import { DAY } from "../../services/auctionService";
import {
  CATEGORIES,
  fetchUpcomingAuctions,
  fetchInterestedBuyers,
  hasInterest,
  registerInterest,
  removeInterest,
  cancelAuction,
} from "../../services/auctionService";
import "./Auctions.css";
const SALE_TYPES = {
  commercial: "Commercial",
  stud: "Stud",
  slaughter: "Slaughter only",
};

const formatDate = (d) =>
  d
    ? d.toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Date to be confirmed";

const telLink = (raw) => `tel:${(raw || "").replace(/\s/g, "")}`;

// 077 123 4567 -> 263771234567
const whatsappLink = (raw) => {
  const digits = (raw || "").replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `263${digits.slice(1)}` : digits}`;
};

function AuctionCard({ auction, onChanged }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.userProfile);
  const [interested, setInterested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [buyers, setBuyers] = useState(null);
  const [message, setMessage] = useState(null);
  const cancelled = auction.status === "cancelled";
  const mine = !!user && auction.auctioneerId === user.uid;
  // Never turn stored text into a link unless it is a normal web address
  const registrationUrl = /^https:\/\//i.test(auction.registrationUrl || "")
    ? auction.registrationUrl
    : null;
  const counts = CATEGORIES.filter((c) => auction.headCount?.[c] > 0);
  // Only show images that come from a normal web address
  const photos = (auction.photos || []).filter((u) => /^https:\/\//i.test(u));

  useEffect(() => {
    let alive = true;
    if (user && !mine) {
      hasInterest(auction.id)
        .then((v) => alive && setInterested(v))
        .catch((e) => console.warn("Interest check failed:", e?.code));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInterested(false);
    }
    return () => {
      alive = false;
    };
  }, [auction.id, user, mine]);

  const run = async (task) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch (e) {
      console.warn("Auction action failed:", e?.code, e?.message);
      setMessage("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggleInterest = () => {
    if (!user) return navigate("/login");
    if (interested) {
      return run(async () => {
        await removeInterest(auction.id);
        setInterested(false);
      });
    }
    const phone = profile?.phone || user.phoneNumber;
    if (!phone) {
      return setMessage(
        "Your profile has no phone number. Use Call or WhatsApp instead.",
      );
    }
    const who = auction.auctioneerName || "The auctioneer";
    if (
      !window.confirm(
        `${who} will see your name and ${phone} so they can contact you. Share them?`,
      )
    )
      return;
    return run(async () => {
      const expireAt = new Date(
        (auction.startsAt?.getTime() ?? Date.now()) + 1 * DAY,
      );
      await registerInterest(auction.id, {
        name: profile?.displayName || "",
        phone,
      }, expireAt);
      setInterested(true);
    });
  };

  const cancel = () => {
    if (
      !window.confirm(
        "Cancel this sale? Buyers will see it marked as cancelled.",
      )
    )
      return;
    run(async () => {
      await cancelAuction(auction.id);
      await onChanged();
    });
  };

  const toggleBuyers = () => {
    if (buyers) return setBuyers(null);
    return run(async () => setBuyers(await fetchInterestedBuyers(auction.id)));
  };

  return (
    <article className={`auc-card ${cancelled ? "auc-card--cancelled" : ""}`}>
      {photos.length > 0 && (
        <div className="auc-cover">
          <img src={photos[0]} alt={auction.title} loading="lazy" />
          {photos.length > 1 && (
            <span className="auc-cover-count">+{photos.length - 1} more</span>
          )}
        </div>
      )}
      <div className="auc-badges">
        <span className="auc-badge">
          {SALE_TYPES[auction.saleType] || "Sale"}
        </span>
        {cancelled && (
          <span className="auc-badge auc-badge--cancelled">Cancelled</span>
        )}
      </div>

      <h2>{auction.title}</h2>
      {auction.auctioneerName && (
        <p className="auc-muted">{auction.auctioneerName}</p>
      )}

      <dl className="auc-info">
        <dt>When</dt>
        <dd>{formatDate(auction.startsAt)}</dd>
        <dt>Where</dt>
        <dd>{[auction.venue, auction.province].filter(Boolean).join(", ")}</dd>
      </dl>

      {auction.totalHead > 0 && (
        <p className="auc-head">
          {auction.totalHead} head:{" "}
          {counts.map((c) => `${auction.headCount[c]} ${c}`).join(" · ")}
        </p>
      )}
      {auction.notes && <p className="auc-muted auc-notes">{auction.notes}</p>}
      {cancelled && auction.cancelReason && (
        <p className="auc-muted">Reason: {auction.cancelReason}</p>
      )}

      <div className="auc-actions">
        {!cancelled && !mine && (
          <button
            type="button"
            className={`auc-action ${interested ? "is-active" : ""}`}
            onClick={toggleInterest}
            disabled={busy}
          >
            {interested ? "✓ Requested (click to undo)" : "Contact me"}
          </button>
        )}
        {auction.contactPhone && (
          <a className="auc-action" href={telLink(auction.contactPhone)}>
            Call
          </a>
        )}
        {auction.whatsapp && (
          <a
            className="auc-action"
            href={whatsappLink(auction.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        )}
        {!cancelled && registrationUrl && (
          <a
            className="auc-action"
            href={registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Register to bid
          </a>
        )}
        {mine && (
          <button
            type="button"
            className="auc-action"
            onClick={toggleBuyers}
            disabled={busy}
          >
            {buyers ? "Hide buyers" : "Interested buyers"}
          </button>
        )}
        {mine && !cancelled && (
          <button
            type="button"
            className="auc-action auc-action--danger"
            onClick={cancel}
            disabled={busy}
          >
            Cancel sale
          </button>
        )}
      </div>

      {message && (
        <p className="auc-error" role="alert">
          {message}
        </p>
      )}

      {mine && buyers && (
        <ul className="auc-buyers">
          {buyers.length === 0 && (
            <li className="auc-muted">No requests yet.</li>
          )}
          {buyers.map((b) => (
            <li key={b.uid}>
              <span>{b.name || "Buyer"}</span>
              <a href={telLink(b.phone)}>{b.phone}</a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function Auctions() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.userProfile);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuctioneer = !!user && profile?.role === "auctioneer";
  const canPost = isAuctioneer && profile?.verified === true;

  const load = useCallback(async () => {
    try {
      setAuctions(await fetchUpcomingAuctions());
      setError(null);
    } catch (e) {
      console.warn("Loading auctions failed:", e?.code, e?.message);
      setError("Could not load sales. Refresh the page to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Picks up approval without the auctioneer having to sign in again
  useEffect(() => {
    const { userProfile, fetchUserProfile } = useAuthStore.getState();
    if (user && userProfile?.role === "auctioneer" && !userProfile.verified) {
      fetchUserProfile(user.uid).catch((e) =>
        console.warn("Profile refresh failed:", e?.code),
      );
    }
  }, [user]);

  return (
    <main className="auc-page">
      <header className="auc-header">
        <div>
          <h1>Livestock sales</h1>
          <p className="auc-muted">Upcoming auctions across Zimbabwe</p>
        </div>
        {canPost && (
          <Link className="auc-button" to="/auctions/new">
            + Create sale
          </Link>
        )}
      </header>

      {isAuctioneer && !canPost && (
        <p className="auc-notice">
          Your auctioneer account is waiting for verification.
        </p>
      )}
      {error && (
        <p className="auc-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="auc-muted">Loading sales…</p>
      ) : (
        !error &&
        auctions.length === 0 && (
          <p className="auc-muted">No upcoming sales yet.</p>
        )
      )}

      <div className="auc-grid">
        {auctions.map((a) => (
          <AuctionCard key={a.id} auction={a} onChanged={load} />
        ))}
      </div>
    </main>
  );
}