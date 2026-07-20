#!/usr/bin/env bash
# verify.sh — wave2-ux-03 (dashboard "Продовжити тест" resume card wired to a server helper)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
DASH="app/(app)/dashboard/page.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Server helper present + delegates to the pure selector.
grep -rEq "export (async )?function getResumableSession" lib/server \
  || fail "getResumableSession not exported from any lib/server module"
SRV="$(grep -rl "function getResumableSession" lib/server | head -1)"
grep -q "selectResumableSession" "$SRV" \
  || fail "$SRV does not use selectResumableSession (must reuse the pure helper from task 02)"

# 2. Dashboard calls it + renders the resume card linking to /test/<id>.
grep -q "getResumableSession" "$DASH" || fail "$DASH does not call getResumableSession"
grep -qF "Продовжити тест" "$DASH" || fail "$DASH missing the «Продовжити тест» card text"
grep -qF '/test/${' "$DASH" || fail "$DASH does not link to /test/\${id}"

# 4. Typecheck.
npm run typecheck 2>&1 | tail -3

# 5. Fast unit suite still green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

# Best-effort browser check (requires served app + signed-in user; never hard-fails).
APP_URL="${APP_URL:-http://localhost:3000}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -fsS -o /dev/null --max-time 3 "$APP_URL" 2>/dev/null; then
  if "$DRIVER_BROWSER_CMD" open "$APP_URL/dashboard" >/dev/null 2>&1 \
     && "$DRIVER_BROWSER_CMD" get text body 2>/dev/null | grep -q "Продовжити"; then
    echo "browser: OK — resume card visible (an in-progress session exists)"
  else
    echo "browser: SKIP — could not confirm (unauthenticated, or no in-progress session); static gate passed"
  fi
  "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
else
  echo "browser: SKIP — no DRIVER_BROWSER_CMD or app not served"
fi

echo "PASS: wave2-ux-03 dashboard resume card wired"
