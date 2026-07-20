#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
M=app/manifest.ts
[ -f "$M" ] || { echo "FAIL: app/manifest.ts missing"; exit 1; }
grep -q '#FBFAF7' "$M" || { echo "FAIL: manifest theme_color not #FBFAF7"; exit 1; }
grep -q 'standalone' "$M" || { echo "FAIL: manifest display standalone missing"; exit 1; }
A=components/a2hs-prompt.tsx
[ -f "$A" ] || { echo "FAIL: a2hs-prompt component missing"; exit 1; }
grep -q 'beforeinstallprompt' "$A" || { echo "FAIL: A2HS must listen for beforeinstallprompt"; exit 1; }
grep -q 'Додати на головний екран' "$A" || { echo "FAIL: A2HS invite copy missing"; exit 1; }
if grep -En 'lib/server|@/lib/db|@/lib/rbac|@/lib/auth' "$A"; then echo "FAIL: A2HS imports server graph"; exit 1; fi
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
# served checks (skip gracefully if no server)
ORIGIN="${AUDIT_ORIGIN:-http://100.110.64.90:3100}"
code="$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/manifest.webmanifest" || true)"
if [ "$code" = "000" ]; then
  echo "WARN: server not reachable at $ORIGIN — served manifest/sw checks skipped"
else
  body="$(curl -s "$ORIGIN/manifest.webmanifest" || true)"
  echo "$body" | grep -q '#FBFAF7' || { echo "FAIL: served manifest missing #FBFAF7"; exit 1; }
  sw="$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/sw.js" || true)"
  [ "$sw" = "200" ] || { echo "FAIL: /sw.js not served (got $sw)"; exit 1; }
fi
echo "PASS: wave17-10 PWA manifest + A2HS"
