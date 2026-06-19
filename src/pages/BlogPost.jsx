import  { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import UserMenu from "../components/UserMenu";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import useAuthStore from "../store/useAuthStore";
import { BLOG_POSTS } from "./Blog";
import logo from "../assets/kraal-logo-black.svg";
import "./Blog.css";
import ProfileSheet from "../components/ProfileSheet";
export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const post = BLOG_POSTS.find((p) => p.id === slug);
const [menuOpen, setMenuOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    if (!post) {
      navigate("/blog");
      return;
    }
  }, [post, navigate]);

  // Real-time comments from Firestore
  useEffect(() => {
    if (!post) return;
    const q = query(
      collection(db, "blog_comments"),
      where("postId", "==", post.id),
      where("approved", "==", true),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [post]);

  if (!post) return null;

  // Render markdown-style content
  const renderContent = (content) => {
    return content
      .trim()
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="post-h2">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i}>
              <strong>{line.slice(2, -2)}</strong>
            </p>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <li key={i} className="post-li">
              {line.slice(2)}
            </li>
          );
        }
        if (line.trim() === "") return null;
        return (
          <p key={i} className="post-p">
            {line}
          </p>
        );
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = user?.displayName || guestName.trim();
    if (!commentText.trim() || !name) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "blog_comments"), {
        postId: post.id,
        postTitle: post.title,
        authorId: user?.uid || null,
        authorName: name,
        authorEmail: user?.email || null,
        text: commentText.trim(),
        approved: false, // you approve from Firebase console
        createdAt: serverTimestamp(),
      });
      setCommentText("");
      setGuestName("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      console.error("Comment failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const timeAgo = (ts) => {
    if (!ts?.seconds) return "";
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() / 1000 - ts.seconds;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="blog-page">
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
     <Link to="/contact">Contact Us</Link>
<Link to="/blog">Blog</Link>
               </div>
               
               <div className="nav-actions">
                <UserMenu />
                 <Link to="/sell" className="nav-cta">
                   <span>+ Post</span>
                 </Link>
                
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

      <div className="post-wrap">
        {/* Back */}
        <Link to="/blog" className="post-back">
          ← All articles
        </Link>

        {/* Header */}
        <div className="post-header">
          <span className="blog-category-badge">{post.category}</span>
          <h1 className="post-title">{post.title}</h1>
          <div className="post-meta">
            <span>✍️ {post.author}</span>
            <span>·</span>
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.readTime}</span>
          </div>
        </div>

        {/* Cover */}
        <div className="post-cover">
          {post.cover ? (
            <img src={post.cover} alt={post.title} />
          ) : (
            <span className="post-cover-emoji">{post.emoji}</span>
          )}
        </div>

        {/* Content */}
        <article className="post-content">
          {renderContent(post.content)}
        </article>

        {/* Share */}
        <div className="post-share">
          <span>Share this article:</span>
          <button
            className="share-btn-sm wa"
            onClick={() =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(post.title + " " + window.location.href)}`,
              )
            }
          >
            WhatsApp
          </button>
          <button
            className="share-btn-sm copy"
            onClick={() => navigator.clipboard.writeText(window.location.href)}
          >
            Copy link
          </button>
        </div>

        {/* Related posts */}
        <div className="post-related">
          <h3>More articles</h3>
          <div className="related-posts-grid">
            {BLOG_POSTS.filter((p) => p.id !== post.id)
              .slice(0, 3)
              .map((p) => (
                <Link
                  key={p.id}
                  to={`/blog/${p.id}`}
                  className="related-post-card"
                >
                  <span className="rpc-emoji">{p.emoji}</span>
                  <div>
                    <p className="rpc-title">{p.title}</p>
                    <p className="rpc-meta">{p.readTime}</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>

        {/* ── COMMENTS ── */}
        <div className="comments-section">
          <h3 className="comments-title">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h3>

          {/* Comment list */}
          {comments.length === 0 ? (
            <p className="no-comments">
              No comments yet. Be the first to share your thoughts.
            </p>
          ) : (
            <div className="comments-list">
              {comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-avatar">
                    {c.authorName?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="comment-body">
                    <div className="comment-header">
                      <strong>{c.authorName}</strong>
                      <span className="comment-time">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="comment-text">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment form */}
          <form className="comment-form" onSubmit={handleSubmit}>
            <h4 className="comment-form-title">Leave a comment</h4>

            {!user && (
              <div className="field">
                <label>
                  Your name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tendai Moyo"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </div>
            )}

            {user && (
              <p className="comment-signed-in">
                Commenting as <strong>{user.displayName || user.email}</strong>
                {" · "}
                <Link to="/login">Not you?</Link>
              </p>
            )}

            <div className="field">
              <label>
                Comment <span className="required">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Share your experience or ask a question…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
              />
            </div>

            {submitted && (
              <div className="comment-success">
                ✅ Comment submitted — it will appear after review.
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={
                submitting ||
                !commentText.trim() ||
                (!user && !guestName.trim())
              }
            >
              {submitting ? "Submitting…" : "Post comment"}
            </button>

            <p className="comment-note">
              Comments are reviewed before appearing publicly.
            </p>
          </form>
        </div>
      </div>

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
