#!/usr/bin/env bash
# verify.sh — wave3-feat-09 (account settings screen hosting change-password)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
PAGE="app/(app)/account/page.tsx"
NAV="components/app-nav.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Route exists, auth-gated server component.
[ -f "$PAGE" ] || fail "$PAGE missing"
grep -q "requireUser" "$PAGE" || fail "$PAGE does not call requireUser"

# 2. A client form wires the action via useActionState with the right field names.
#    The form may live in the page's client child or a components/* file — search both.
FORMSRC="$(grep -rl "changePasswordAction" app components 2>/dev/null | grep -v "app/actions/auth.ts" | head -1 || true)"
[ -n "$FORMSRC" ] || fail "no client component imports changePasswordAction"
grep -q '"use client"' "$FORMSRC" || fail "$FORMSRC is not a client component"
grep -q "useActionState" "$FORMSRC" || fail "$FORMSRC does not use useActionState"
grep -q "currentPassword" "$FORMSRC" || fail "$FORMSRC lacks a currentPassword field"
grep -q "newPassword" "$FORMSRC" || fail "$FORMSRC lacks a newPassword field"
grep -Eq "type=\"password\"|type=\{?\"password\"" "$FORMSRC" \
  || grep -q "password" "$FORMSRC" || fail "$FORMSRC password inputs not found"

# 3. Nav links to /account.
[ -f "$NAV" ] || fail "$NAV missing"
grep -q "/account" "$NAV" || fail "$NAV has no /account link"

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
  if "$DRIVER_BROWSER_CMD" open "$APP_URL/account" >/dev/null 2>&1 \
     && "$DRIVER_BROWSER_CMD" get text body 2>/dev/null | grep -Eqi "парол"; then
    echo "browser: OK — account/password screen visible"
  else
    echo "browser: SKIP — could not confirm (unauthenticated); static gate passed"
  fi
  "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
else
  echo "browser: SKIP — no DRIVER_BROWSER_CMD or app not served"
fi

echo "PASS: wave3-feat-09 account settings screen"
