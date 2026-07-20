#!/usr/bin/env bash
# verify.sh — wave11-15 admin readiness-shadow view (static + build + optional browser drive).
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }
PAGE="app/admin/readiness-shadow/page.tsx"
[ -f "$PAGE" ] || fail "$PAGE missing"

grep -Eq 'requireContentManager' "$PAGE" || fail "page not gated by requireContentManager"
grep -Eq 'getLatestReadiness' "$PAGE" || fail "page must read FSRS dial via getLatestReadiness"
# legacy-vs-FSRS delta present.
grep -Eiq 'delta|дельта|різниц' "$PAGE" || fail "page must show the legacy-vs-FSRS delta"

# nav link added after content-health.
grep -Eq '/admin/readiness-shadow' app/admin/layout.tsx || fail "nav link to /admin/readiness-shadow missing"
grep -Eq 'тінь' app/admin/layout.tsx || fail "nav label «Готовність (тінь)» missing"

# 17th browser-audit assertion appended.
grep -Eq 'readiness-shadow' bin/browser-audit.sh || fail "browser-audit.sh has no readiness-shadow assertion"

npm run typecheck 2>&1 | tail -3
npm run build 2>&1 | tail -6

# optional live browser drive (skips if the app isn't served / no browser cmd).
BCMD="${DRIVER_BROWSER_CMD:-}"
ORIGIN="${AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if [ -n "$BCMD" ] && curl -s -o /dev/null -w '%{http_code}' "$ORIGIN" 2>/dev/null | grep -Eq '^[23]'; then
  echo "== optional browser drive =="
  $BCMD open "$ORIGIN/admin/readiness-shadow" >/dev/null 2>&1 || true
  $BCMD get text body 2>/dev/null | grep -Eiq 'ГОТОВНІСТЬ|тінь' \
    && echo "browser: shadow page title present" \
    || echo "NOTE: browser drive inconclusive (auth/serve) — the wave gate runs audit:browser 17/17"
  $BCMD close --all >/dev/null 2>&1 || true
else
  echo "NOTE: skipping live browser drive (no DRIVER_BROWSER_CMD or app not served); wave gate covers 17/17"
fi
echo "PASS: admin shadow view static + build"
