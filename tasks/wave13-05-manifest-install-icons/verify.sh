#!/usr/bin/env bash
# wave13-05 — manifest + maskable icons + iOS meta.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

[ -f app/manifest.ts ] || { echo "FAIL: app/manifest.ts missing"; exit 1; }
grep -qF '"standalone"' app/manifest.ts || { echo "FAIL: display standalone missing"; exit 1; }
grep -qF '"/dashboard"' app/manifest.ts || { echo "FAIL: start_url /dashboard missing"; exit 1; }
grep -qF '"education"' app/manifest.ts || { echo "FAIL: categories education missing"; exit 1; }
grep -qF 'maskable' app/manifest.ts || { echo "FAIL: maskable purpose missing"; exit 1; }
grep -qF 'icon-192.png' app/manifest.ts || { echo "FAIL: 192 icon not referenced"; exit 1; }
grep -qF 'icon-512.png' app/manifest.ts || { echo "FAIL: 512 icon not referenced"; exit 1; }
grep -qE 'theme_color' app/manifest.ts || { echo "FAIL: theme_color missing"; exit 1; }
grep -qE 'background_color' app/manifest.ts || { echo "FAIL: background_color missing"; exit 1; }

for f in public/icons/icon-192.png public/icons/icon-512.png public/icons/apple-touch-icon.png; do
  [ -f "$f" ] || { echo "FAIL: $f missing"; exit 1; }
  git check-ignore -q "$f" && { echo "FAIL: $f must be COMMITTED (not gitignored)"; exit 1; }
done
node -e '
const sharp = require("sharp");
const want = [["public/icons/icon-192.png",192],["public/icons/icon-512.png",512],["public/icons/apple-touch-icon.png",180]];
Promise.all(want.map(([f,d]) => sharp(f).metadata().then(m => {
  if (m.width !== d || m.height !== d) { console.error(`FAIL: ${f} is ${m.width}x${m.height}, want ${d}x${d}`); process.exit(1); }
  if (m.format !== "png") { console.error(`FAIL: ${f} format ${m.format} != png`); process.exit(1); }
})));
' || exit 1

[ -f scripts/gen-icons.mjs ] || { echo "FAIL: scripts/gen-icons.mjs missing"; exit 1; }
grep -qE '"gen:icons"' package.json || { echo "FAIL: npm script gen:icons missing"; exit 1; }

grep -qF "appleWebApp" app/layout.tsx || { echo "FAIL: appleWebApp metadata missing from root layout"; exit 1; }
grep -qF "apple-touch-icon" app/layout.tsx || { echo "FAIL: apple-touch-icon not wired in root layout"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
echo "PASS wave13-05"
