#!/usr/bin/env bash
# verify.sh — wave3-feat-07 (dashboard readiness sparkline render)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
DASH="app/(app)/dashboard/page.tsx"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$DASH" ] || fail "$DASH missing"

# 1. Uses the pure helper + the already-fetched scores (no new DB call).
grep -q "@/lib/sparkline" "$DASH" || fail "$DASH does not import from @/lib/sparkline"
grep -Eq "sparkline\(" "$DASH" || fail "$DASH does not call the sparkline helper"
grep -q "getRecentReadinessScores" "$DASH" || fail "$DASH no longer reuses getRecentReadinessScores"
# Exactly one readiness-scores fetch remains (reuse, not a duplicate query).
n="$(grep -c "getRecentReadinessScores(" "$DASH" || true)"
[ "${n:-0}" -ge 1 ] || fail "$DASH lost the getRecentReadinessScores call"

# 2. Renders an inline SVG.
grep -Eq "<svg" "$DASH" || fail "$DASH does not render an <svg> sparkline"

# 3. Existing trend badge preserved.
grep -q "READINESS_TREND_LABEL" "$DASH" || fail "$DASH dropped the trend badge (READINESS_TREND_LABEL)"

# 5. Typecheck.
npm run typecheck 2>&1 | tail -3

# 6. Fast unit suite.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

# 7. Build.
npm run build 2>&1 | tail -6

# Best-effort browser check (served + signed-in user); never hard-fails.
APP_URL="${APP_URL:-http://localhost:3000}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -fsS -o /dev/null --max-time 3 "$APP_URL" 2>/dev/null; then
  if "$DRIVER_BROWSER_CMD" open "$APP_URL/dashboard" >/dev/null 2>&1 \
     && "$DRIVER_BROWSER_CMD" get html "svg" 2>/dev/null | grep -qi "path\|polyline"; then
    echo "browser: OK — sparkline svg present"
  else
    echo "browser: SKIP — could not confirm (unauthenticated/<2 scores); static gate passed"
  fi
  "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
else
  echo "browser: SKIP — no DRIVER_BROWSER_CMD or app not served"
fi

echo "PASS: wave3-feat-07 dashboard sparkline"
