// scripts/generate-social-images.mjs
// Creates one 1200x630 share image per blog post in public/og/<post-id>.png
// Titles and categories are read straight from Blog.jsx, so new posts
// get an image automatically.
//
// Setup:   npm install --save-dev sharp
// Usage:   node scripts/generate-social-images.mjs
// Auto:    "prebuild": "node scripts/generate-sitemap.mjs && node scripts/generate-social-images.mjs"
//
// Fonts: the script asks for Georgia, which exists on Windows and macOS.
// On a Linux build server (Vercel, Netlify, GitHub Actions) Georgia is
// usually missing, so it falls back to DejaVu Serif if installed.
// If text shows as empty boxes, install fonts (e.g. apt-get install fonts-dejavu)
// or generate the images locally and commit public/og/.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Config ──────────────────────────────────────────────────
const BLOG_FILE = path.join(ROOT, "src/pages/Blog.jsx");
const LOGO_FILE = path.join(ROOT, "src/assets/kraal-logo-black.svg"); // optional
const OUT_DIR = path.join(ROOT, "public/og");

const COLORS = {
  bg: "#f2e8d5", // straw
  soil: "#2c1a0e",
  clay: "#8b4513",
  ochre: "#c8842a",
  tan: "#d4b483",
};

const TITLE_FONT = "Georgia, 'Times New Roman', 'DejaVu Serif', serif";
const MONO_FONT = "'Courier New', 'DejaVu Sans Mono', monospace";

// ── Helpers ─────────────────────────────────────────────────
const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const unescapeJs = (s) => s.replace(/\\(.)/g, "$1");

function wrap(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Pick the largest font size that fits the title in 4 lines or fewer
function layoutTitle(title) {
  const options = [
    { size: 68, max: 22 },
    { size: 58, max: 26 },
    { size: 50, max: 31 },
    { size: 42, max: 37 },
  ];
  for (const opt of options) {
    const lines = wrap(title, opt.max);
    if (lines.length <= 4) return { ...opt, lines };
  }
  const last = options[options.length - 1];
  return { ...last, lines: wrap(title, last.max).slice(0, 5) };
}

function buildSvg({ title, category }) {
  const { size, lines } = layoutTitle(title);
  const lineHeight = Math.round(size * 1.18);
  const startY = 255;

  const pillText = category.toUpperCase();
  const pillWidth = pillText.length * 16 + 48;

  const titleSvg = lines
    .map(
      (l, i) =>
        `<text x="80" y="${startY + i * lineHeight}" font-family="${TITLE_FONT}" font-size="${size}" font-weight="700" fill="${COLORS.soil}">${esc(l)}</text>`,
    )
    .join("\n  ");

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${COLORS.bg}"/>
  <rect x="0" y="0" width="24" height="540" fill="${COLORS.ochre}"/>

  <rect x="80" y="110" width="${pillWidth}" height="44" rx="22" fill="${COLORS.ochre}" fill-opacity="0.18"/>
  <text x="${80 + pillWidth / 2}" y="139" text-anchor="middle" font-family="${MONO_FONT}" font-size="20" font-weight="700" letter-spacing="2" fill="${COLORS.clay}">${esc(pillText)}</text>

  ${titleSvg}

  <rect x="0" y="540" width="1200" height="90" fill="${COLORS.soil}"/>
  <text x="80" y="595" font-family="${MONO_FONT}" font-size="24" font-weight="700" letter-spacing="3" fill="${COLORS.bg}">KRAALMARKET.COM</text>
  <text x="1120" y="595" text-anchor="end" font-family="${TITLE_FONT}" font-size="24" font-style="italic" fill="${COLORS.tan}">${esc("Zimbabwe's livestock marketplace")}</text>
</svg>`;
}

// ── Read posts from Blog.jsx ────────────────────────────────
if (!fs.existsSync(BLOG_FILE)) {
  console.error(`Could not find ${BLOG_FILE}. Update BLOG_FILE in this script.`);
  process.exit(1);
}

const source = fs.readFileSync(BLOG_FILE, "utf8");
const postRegex =
  /\bid:\s*"([a-z0-9-]+)",\s*title:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?\bcategory:\s*"([^"]*)"/g;

const posts = [];
let m;
while ((m = postRegex.exec(source)) !== null) {
  posts.push({ id: m[1], title: unescapeJs(m[2]), category: unescapeJs(m[3]) });
}

if (posts.length === 0) {
  console.error("No blog posts found. Check BLOG_FILE or the regex.");
  process.exit(1);
}

// ── Optional logo ───────────────────────────────────────────
let logoBuffer = null;
if (fs.existsSync(LOGO_FILE)) {
  try {
    logoBuffer = await sharp(LOGO_FILE).resize({ width: 180 }).png().toBuffer();
  } catch (err) {
    console.warn("Logo could not be loaded, continuing without it:", err.message);
  }
}

// ── Generate ────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const post of posts) {
  let img = sharp(Buffer.from(buildSvg(post)));
  if (logoBuffer) {
    img = img.composite([{ input: logoBuffer, left: 940, top: 105 }]);
  }
  const outFile = path.join(OUT_DIR, `${post.id}.png`);
  await img.png({ compressionLevel: 9 }).toFile(outFile);
  console.log(`  ${post.id}.png`);
}

console.log(`\nCreated ${posts.length} share images in ${OUT_DIR}`);
