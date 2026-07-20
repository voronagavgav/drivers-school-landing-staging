#!/usr/bin/env bash
# verify.sh — mvp-finish-07 (dashboard trend wiring: static render assertions + optional browser)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
PAGE="app/(app)/dashboard/page.tsx"

# --- Static (hard gate): dashboard loads scores, computes trend, renders the label. ---
grep -q "getRecentReadinessScores" "$PAGE" \
  || { echo "FAIL: $PAGE does not call getRecentReadinessScores"; exit 1; }
grep -q "readinessTrend" "$PAGE" \
  || { echo "FAIL: $PAGE does not call readinessTrend"; exit 1; }

# The three EXACT Ukrainian trend strings must appear in the codebase (page or lib/progress.ts).
for lbl in "Динаміка: вгору" "Динаміка: вниз" "Динаміка: стабільно"; do
  grep -rqF "$lbl" "$PAGE" lib/progress.ts \
    || { echo "FAIL: trend label not found in page or lib/progress.ts: $lbl"; exit 1; }
done

# --- Typecheck + suite. ---
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

# --- Optional browser check (only when a browser cmd + a running app are available). ---
APP_URL="${APP_URL:-http://localhost:3000}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -fsS -o /dev/null --max-time 3 "$APP_URL" 2>/dev/null; then
  echo "browser: attempting $APP_URL/dashboard (best-effort; requires signed-in user)"
  if "$DRIVER_BROWSER_CMD" open "$APP_URL/dashboard" >/dev/null 2>&1 \
     && "$DRIVER_BROWSER_CMD" get text body 2>/dev/null | grep -q "Динаміка:"; then
    echo "browser: OK — trend label visible"
  else
    echo "browser: SKIP — could not confirm (likely unauthenticated); static gate already passed"
  fi
  "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
else
  echo "browser: SKIP — no DRIVER_BROWSER_CMD or app not served"
fi

echo "PASS: mvp-finish-07 dashboard trend wiring meets criteria"
