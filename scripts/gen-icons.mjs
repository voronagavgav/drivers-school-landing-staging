// PWA ICON GENERATION (wave13-05, spec §B). Rasterizes the «Світлик» mascot onto a
// calm token background into the three COMMITTED install icons:
//   public/icons/icon-192.png (192×192, maskable)
//   public/icons/icon-512.png (512×512, maskable)
//   public/icons/apple-touch-icon.png (180×180 — iOS ignores manifest icons)
// Build/content step — NEVER on the request path (sharp is a devDependency only).
// Usage: npm run gen:icons
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Tokens copied from app/globals.css :root — keep literally in sync.
const BG = "#9AD9B8"; // --color-green-soft (calm pastel fill; mascot body is slate, not white)

// The mascot markup below is the `<symbol id="svitlyk">` content from
// components/svitlyk.tsx, serialized to plain SVG (JSX camelCase → kebab-case
// attributes). Keep in sync with that file if the mascot ever changes.
// The `<g transform>` scales the 100×100 artwork to 80% and centers it, so the
// mascot fits the inner 80% safe zone required for `purpose: "maskable"`.
const svgFor = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="mbody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#475a63"/>
      <stop offset="1" stop-color="#33424a"/>
    </linearGradient>
    <filter id="mglow" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="4" stdDeviation="4.5" flood-color="#3a525a" flood-opacity=".28"/>
    </filter>
  </defs>
  <rect width="100" height="100" fill="${BG}"/>
  <g transform="translate(10 10) scale(0.8)">
    <ellipse cx="50" cy="93" rx="24" ry="5" fill="#2B2F36" opacity=".12"/>
    <g filter="url(#mglow)">
      <rect x="28" y="10" width="44" height="80" rx="22" fill="url(#mbody)"/>
      <rect x="31" y="13" width="38" height="30" rx="16" fill="#fff" opacity=".05"/>
      <ellipse cx="40" cy="20" rx="9" ry="5" fill="#fff" opacity=".14"/>
      <circle cx="50" cy="29" r="11" fill="#FFB89A"/>
      <circle cx="50" cy="51" r="11" fill="#FFE08A"/>
      <circle cx="50" cy="73" r="11" fill="#9AD9B8"/>
      <circle cx="46.3" cy="71.5" r="1.7" fill="#1f5b45"/>
      <circle cx="53.7" cy="71.5" r="1.7" fill="#1f5b45"/>
      <path d="M45 75.5 q5 4 10 0" stroke="#1f5b45" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <rect x="68" y="44" width="14" height="6" rx="3" fill="url(#mbody)" transform="rotate(-22 68 47)"/>
    </g>
  </g>
</svg>`;

const OUT_DIR = path.join("public", "icons");
const TARGETS = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const { file, size } of TARGETS) {
    // Rasterize directly at the target size (SVG root width/height = size) —
    // one crisp render per icon, no double resampling.
    const buf = await sharp(Buffer.from(svgFor(size))).png().toBuffer();
    const outPath = path.join(OUT_DIR, file);
    writeFileSync(outPath, buf);
    console.log(`gen-icons: wrote ${outPath} (${size}×${size}, ${buf.length}B)`);
  }
}

await main();
