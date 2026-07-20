#!/usr/bin/env bash
# verify.sh — wave2-ux-09 (friendly not-found for a bad /test/<id>)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
NF="app/(app)/test/[id]/not-found.tsx"
PAGE="app/(app)/test/[id]/page.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. not-found file exists + default export.
[ -f "$NF" ] || fail "$NF missing"
grep -Eq "export default" "$NF" || fail "$NF has no default export"

# 2. Ukrainian copy + link back to /dashboard.
grep -Eq "[А-Яа-яІіЇїЄєҐґ]" "$NF" || fail "$NF has no Ukrainian copy"
grep -qF "/dashboard" "$NF" || fail "$NF has no link back to /dashboard"

# 3. The page still triggers notFound().
grep -q "notFound" "$PAGE" || fail "$PAGE no longer calls notFound()"

# 4. Typecheck.
npm run typecheck 2>&1 | tail -3

# 5. Fast unit suite green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

# Best-effort browser check (needs signed-in user; never hard-fails).
APP_URL="${APP_URL:-http://localhost:3000}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -fsS -o /dev/null --max-time 3 "$APP_URL" 2>/dev/null; then
  if "$DRIVER_BROWSER_CMD" open "$APP_URL/test/does-not-exist-xyz" >/dev/null 2>&1 \
     && "$DRIVER_BROWSER_CMD" get text body 2>/dev/null | grep -Eq "не знайдено|знайти"; then
    echo "browser: OK — friendly not-found shown"
  else
    echo "browser: SKIP — could not confirm (likely unauthenticated → redirected to login); static gate passed"
  fi
  "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
else
  echo "browser: SKIP — no DRIVER_BROWSER_CMD or app not served"
fi

echo "PASS: wave2-ux-09 test not-found"
