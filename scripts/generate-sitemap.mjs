import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Config ──────────────────────────────────────────────────
const SITE_URL = "https://kraalmarket.com"; // no trailing slash
const BLOG_FILE = path.join(ROOT, "src/pages/Blog.jsx"); // adjust if different
const OUT_DIR = path.join(ROOT, "public");

// Public pages (path, changefreq, priority). Add or remove as needed.
const STATIC_PAGES = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/marketplace", changefreq: "daily", priority: "0.9" },
  { loc: "/marketplace?category=cattle", changefreq: "daily", priority: "0.8" },
  { loc: "/marketplace?category=goats", changefreq: "daily", priority: "0.8" },
  { loc: "/marketplace?category=chicken", changefreq: "daily", priority: "0.8" },
  { loc: "/marketplace?category=sheep", changefreq: "daily", priority: "0.8" },
  { loc: "/blog", changefreq: "weekly", priority: "0.8" },
  { loc: "/about", changefreq: "monthly", priority: "0.5" },
  { loc: "/contact", changefreq: "monthly", priority: "0.5" },
  { loc: "/pricing", changefreq: "monthly", priority: "0.5" },
  { loc: "/terms", changefreq: "yearly", priority: "0.2" },
  { loc: "/privacy", changefreq: "yearly", priority: "0.2" },
];

// ── Helpers ─────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");

function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Escape characters that are illegal inside XML text (e.g. & in URLs)
function xmlEscape(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── Read blog posts straight from Blog.jsx ──────────────────
// Blog.jsx imports images, so Node can't import it directly.
// Instead we read the file as text and pull out each id + date.
if (!fs.existsSync(BLOG_FILE)) {
  console.error(`Could not find ${BLOG_FILE}. Update BLOG_FILE in this script.`);
  process.exit(1);
}

const source = fs.readFileSync(BLOG_FILE, "utf8");
const postRegex = /\bid:\s*["']([a-z0-9-]+)["'][\s\S]*?\bdate:\s*["']([^"']+)["']/g;

const posts = [];
let match;
while ((match = postRegex.exec(source)) !== null) {
  const [, id, dateStr] = match;
  const parsed = new Date(dateStr);
  posts.push({
    id,
    lastmod: isNaN(parsed) ? toISODate(new Date()) : toISODate(parsed),
  });
}

if (posts.length === 0) {
  console.error("No blog posts found. Check the regex or BLOG_FILE path.");
  process.exit(1);
}

// Warn about duplicate ids, because they break routing
const seen = new Set();
for (const p of posts) {
  if (seen.has(p.id)) console.warn(`Duplicate post id found: ${p.id}`);
  seen.add(p.id);
}

// ── Build sitemap.xml ───────────────────────────────────────
const today = toISODate(new Date());
const urls = [];

for (const page of STATIC_PAGES) {
  urls.push(`  <url>
    <loc>${xmlEscape(SITE_URL + page.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
}

for (const post of posts) {
  urls.push(`  <url>
    <loc>${xmlEscape(`${SITE_URL}/blog/${post.id}`)}</loc>
    <lastmod>${post.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

// ── Build robots.txt ────────────────────────────────────────
// Keeps private pages out of search. Adjust the Disallow lines
// to match your real private routes.
const robots = `User-agent: *
Allow: /
Disallow: /seller/dashboard
Disallow: /login
Disallow: /register

Sitemap: ${SITE_URL}/sitemap.xml
`;

// ── Write files ─────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "sitemap.xml"), sitemap, "utf8");
fs.writeFileSync(path.join(OUT_DIR, "robots.txt"), robots, "utf8");

console.log(
  `Sitemap written with ${STATIC_PAGES.length} static pages and ${posts.length} blog posts.`,
);
console.log(`  ${path.join(OUT_DIR, "sitemap.xml")}`);
console.log(`  ${path.join(OUT_DIR, "robots.txt")}`);
