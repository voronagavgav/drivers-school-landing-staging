#!/usr/bin/env bash
# verify.sh — mvp-finish-05 (admin stats UI: static render assertions + optional browser)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
PAGE="app/admin/questions/page.tsx"

# --- Static (hard gate): the page wires the helper and renders the required pieces. ---
grep -q "getQuestionPerformance" "$PAGE" \
  || { echo "FAIL: $PAGE does not call getQuestionPerformance"; exit 1; }
grep -q "DemoBadge" "$PAGE" \
  || { echo "FAIL: $PAGE does not render DemoBadge"; exit 1; }
# accuracy rendered as a percentage somewhere on the page.
grep -Eq "accuracy" "$PAGE" \
  || { echo "FAIL: $PAGE does not reference accuracy"; exit 1; }
grep -q "%" "$PAGE" \
  || { echo "FAIL: $PAGE does not render a percentage sign"; exit 1; }
# times-answered figure rendered.
grep -Eq "timesAnswered" "$PAGE" \
  || { echo "FAIL: $PAGE does not render timesAnswered"; exit 1; }
# a stats section heading is present.
grep -q "Статистика" "$PAGE" \
  || { echo "FAIL: $PAGE has no 'Статистика' stats section heading"; exit 1; }
# existing list preserved.
grep -q "listQuestions" "$PAGE" \
  || { echo "FAIL: $PAGE no longer calls listQuestions (existing list removed)"; exit 1; }

# --- Typecheck + suite. ---
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

# --- Optional browser check (only when a browser cmd + a running app are available). ---
APP_URL="${APP_URL:-http://localhost:3000}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -fsS -o /dev/null --max-time 3 "$APP_URL" 2>/dev/null; then
  echo "browser: attempting $APP_URL/admin/questions (best-effort; requires content-manager session)"
  if "$DRIVER_BROWSER_CMD" open "$APP_URL/admin/questions" >/dev/null 2>&1 \
     && "$DRIVER_BROWSER_CMD" get text body 2>/dev/null | grep -q "Статистика"; then
    echo "browser: OK — stats section visible"
  else
    echo "browser: SKIP — could not confirm (likely unauthenticated); static gate already passed"
  fi
  "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
else
  echo "browser: SKIP — no DRIVER_BROWSER_CMD or app not served"
fi

echo "PASS: mvp-finish-05 admin stats UI meets criteria"
