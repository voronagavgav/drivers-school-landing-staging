#!/usr/bin/env bash
# wave12a-12 — screen token sweep: no legacy literals, no white-on-green, result Світлик.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# 1. no raw blue-era hex in app/ or components/ (globals.css aliases are allowed to REFERENCE new values,
#    but these specific old literals must be gone from component/screen markup and from globals)
if grep -rniE '#1e5bbf|#17489a|#1b2430' app components 2>/dev/null; then
  echo "FAIL: legacy blue/asphalt hex literal remains"; exit 1; fi

# 2. no white-on-green/sign/danger at screen or admin level
if grep -rnE '(bg-(sign|green[a-z-]*|danger|go|lane))[^"'"'"']*text-white|text-white[^"'"'"']*(bg-(sign|green[a-z-]*|danger|go|lane))' "app/(app)" app/admin 2>/dev/null; then
  echo "FAIL: white text on a green/sign/danger fill in a screen"; exit 1; fi

# 3. result screen renders Світлик
RES="app/(app)/test/[id]/result/page.tsx"
[ -f "$RES" ] || { echo "FAIL: $RES missing"; exit 1; }
grep -qiE 'svitlyk' "$RES" || { echo "FAIL: result screen must render <Svitlyk/> (calm framing)"; exit 1; }

# 6. legal disclaimer intact
grep -rqF 'не гарантує' app || { echo "FAIL: legal disclaimer text missing (must stay intact)"; exit 1; }

npm run typecheck
npm run build
npm test
echo "PASS wave12a-12"
