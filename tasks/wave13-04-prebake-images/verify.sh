#!/usr/bin/env bash
# wave13-04 — prebake: sharp devDep, idempotent script, full bake present, spike oracle for 11_10_0.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

node -e '
const p = require("./package.json");
if (!p.devDependencies || !p.devDependencies.sharp) { console.error("FAIL: sharp not in devDependencies"); process.exit(1); }
if (p.dependencies && p.dependencies.sharp) { console.error("FAIL: sharp must NOT be a runtime dependency"); process.exit(1); }
' || exit 1
# nothing in the app runtime graph imports sharp
if grep -rE 'from "sharp"|require\("sharp"\)' app lib components 2>/dev/null | grep -qE '.'; then
  echo "FAIL: sharp imported from the app/lib runtime graph"; exit 1; fi

[ -f scripts/prebake-images.mjs ] || { echo "FAIL: scripts/prebake-images.mjs missing"; exit 1; }
grep -qE '"prebake:images"' package.json || { echo "FAIL: npm script prebake:images missing"; exit 1; }
git check-ignore -q public/img-cache/x || { echo "FAIL: public/img-cache must be gitignored"; exit 1; }

# idempotency oracle: second --only run encodes 0
npm run -s prebake:images -- --only 11_10_0 >/tmp/w13-bake1.log 2>&1 || { echo "FAIL: prebake --only 11_10_0 (run 1)"; tail -5 /tmp/w13-bake1.log; exit 1; }
npm run -s prebake:images -- --only 11_10_0 >/tmp/w13-bake2.log 2>&1 || { echo "FAIL: prebake --only 11_10_0 (run 2)"; tail -5 /tmp/w13-bake2.log; exit 1; }
grep -qE 'encoded 0' /tmp/w13-bake2.log || { echo "FAIL: second run must encode 0 (idempotency)"; cat /tmp/w13-bake2.log; exit 1; }

# full bake (idempotent — fast when already baked), then corpus count
npm run -s prebake:images >/tmp/w13-bakefull.log 2>&1 || { echo "FAIL: full prebake run"; tail -5 /tmp/w13-bakefull.log; exit 1; }
n="$(find public/img-cache -maxdepth 1 -name '*-540.avif' 2>/dev/null | wc -l | tr -d ' ')"
[ "${n:-0}" -ge 1000 ] || { echo "FAIL: expected >=1000 -540.avif variants, got $n"; exit 1; }

# spike oracle for 11_10_0 (SPIKES.md §2: 9536B at q50/e4; cap 30000 catches encoder drift)
V="public/img-cache/11_10_0-540.avif"
[ -f "$V" ] || { echo "FAIL: $V missing"; exit 1; }
sz="$(wc -c < "$V" | tr -d ' ')"
[ "$sz" -le 30000 ] || { echo "FAIL: $V is $sz bytes (>30000 — encoder drifted from spike params)"; exit 1; }
node -e '
const sharp = require("sharp");
sharp("public/img-cache/11_10_0-540.avif").metadata().then(m => {
  if (m.width !== 540) { console.error("FAIL: variant width " + m.width + " != 540"); process.exit(1); }
  if (!/avif|heif/.test(m.format)) { console.error("FAIL: variant format " + m.format + " not avif"); process.exit(1); }
});
' || exit 1
[ -f public/img-cache/11_10_0-540.webp ] || { echo "FAIL: webp fallback variant missing"; exit 1; }

# hard cap over the whole corpus: no .avif above 122880 bytes
big="$(find public/img-cache -name '*.avif' -size +122880c 2>/dev/null | wc -l | tr -d ' ')"
[ "${big:-0}" -eq 0 ] || { echo "FAIL: $big AVIF variants exceed the 120KB hard cap"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
echo "PASS wave13-04"
