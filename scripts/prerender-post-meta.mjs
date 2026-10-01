// scripts/prerender-post-meta.mjs
// WHY THIS EXISTS: WhatsApp, Facebook and X do not run JavaScript when they
// build a link preview. In a React single-page app, <Helmet> tags are only
// added by JavaScript, so those crawlers see your generic index.html and show
// the same preview for every blog post. Google is also faster and more
// reliable when the tags are already in the HTML.
//
// This script runs AFTER the build. For every blog post it copies
// dist/index.html to dist/blog/<id>/index.html with the post's own title,
// description and share image written into <head>. Your React app still loads
// and runs normally on that page.
//
// Usage (after `npm run build`): node scripts/prerender-post-meta.mjs
// Auto:  "postbuild": "node scripts/prerender-post-meta.mjs"
//
// Hosting: static hosts like Netlify, Vercel and Firebase serve
// /blog/<id>/index.html for /blog/<id>. After deploying, test one post in the
// Facebook Sharing Debugger (developers.facebook.com/tools/debug) to confirm.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Config ──────────────────────────────────────────────────
const SITE_URL = "https://kraalmarket.com"; // no trailing slash
const SITE_NAME = "Kraal Market";
const BLOG_FILE = path.join(ROOT, "src/pages/Blog.jsx");
const DIST_DIR = path.join(ROOT, "dist"); // use "build" if you're on Create React App
const INDEX_FILE = path.join(DIST_DIR, "index.html");

// ── Helpers ─────────────────────────────────────────────────
const unescapeJs = (s) => s.replace(/\\(.)/g, "$1");
const escAttr = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

if (!fs.existsSync(INDEX_FILE)) {
  console.error(`Could not find ${INDEX_FILE}. Run your build first, or fix DIST_DIR.`);
  process.exit(1);
}
if (!fs.existsSync(BLOG_FILE)) {
  console.error(`Could not find ${BLOG_FILE}. Update BLOG_FILE in this script.`);
  process.exit(1);
}

// ── Read posts ──────────────────────────────────────────────
const source = fs.readFileSync(BLOG_FILE, "utf8");
const postRegex =
  /\bid:\s*"([a-z0-9-]+)",\s*title:\s*"((?:[^"\\]|\\.)*)",\s*excerpt:\s*"((?:[^"\\]|\\.)*)"/g;

const posts = [];
let m;
while ((m = postRegex.exec(source)) !== null) {
  posts.push({
    id: m[1],
    title: unescapeJs(m[2]),
    excerpt: unescapeJs(m[3]).replace(/\s+/g, " ").trim(),
  });
}

if (posts.length === 0) {
  console.error("No blog posts found. Check BLOG_FILE or the regex.");
  process.exit(1);
}

// ── Build one HTML file per post ────────────────────────────
const baseHtml = fs.readFileSync(INDEX_FILE, "utf8");

// Remove existing generic tags so crawlers don't see conflicting ones
const cleaned = baseHtml
  .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
  .replace(
    /<meta[^>]+(?:property|name)=["'](?:og:[^"']*|twitter:[^"']*|description)["'][^>]*>\s*/gi,
    "",
  )
  .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, "");

for (const post of posts) {
  const url = `${SITE_URL}/blog/${post.id}`;
  const image = `${SITE_URL}/og/${post.id}.png`;
  const title = `${post.title} | ${SITE_NAME}`;

  const tags = `
    <title>${escAttr(title)}</title>
    <meta name="description" content="${escAttr(post.excerpt)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${escAttr(post.title)}" />
    <meta property="og:description" content="${escAttr(post.excerpt)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escAttr(post.title)}" />
    <meta name="twitter:description" content="${escAttr(post.excerpt)}" />
    <meta name="twitter:image" content="${image}" />
  `;

  const html = cleaned.replace(/<\/head>/i, `${tags}</head>`);

  const outDir = path.join(DIST_DIR, "blog", post.id);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
}

console.log(`Wrote meta-tagged pages for ${posts.length} blog posts in ${path.join(DIST_DIR, "blog")}`);
