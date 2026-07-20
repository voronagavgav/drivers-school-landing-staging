#!/usr/bin/env bash
# wave12b-15 — Ukrainian client-side validation on auth/account forms.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
AF="components/auth-forms.tsx"
grep -qE 'noValidate' "$AF" || { echo "FAIL: forms must be noValidate (custom messages)"; exit 1; }
grep -qE 'noValidate' components/account-forms.tsx || { echo "FAIL: account forms must be noValidate"; exit 1; }
# Ukrainian messages reachable from the client layer
if ! grep -rqF 'Заповніть це поле' components lib/client 2>/dev/null; then
  echo "FAIL: required-field Ukrainian message missing"; exit 1; fi
if ! grep -rqF 'електронну адресу' components lib/client 2>/dev/null; then
  echo "FAIL: email Ukrainian message missing"; exit 1; fi
grep -rqE 'role="alert"|aria-live' components/auth-forms.tsx components/account-forms.tsx || { echo "FAIL: errors must render as DOM alerts"; exit 1; }
# unit test collected
x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -qE 'form-validation' || { echo "FAIL: form-validation unit test not collected"; exit 1; }
npm run typecheck
npm test
npm run build
ORIGIN="${DS_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -sS -m 6 -o /dev/null "$ORIGIN/login" 2>/dev/null; then
  "$DRIVER_BROWSER_CMD" open "$ORIGIN/register" >/dev/null 2>&1 || true
  "$DRIVER_BROWSER_CMD" click 'button[type="submit"]' >/dev/null 2>&1 || true
  body="$("$DRIVER_BROWSER_CMD" get text body 2>/dev/null || true)"
  echo "$body" | grep -qF 'Заповніть це поле' || { echo "FAIL: empty-submit did not show the Ukrainian message"; exit 1; }
  "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
fi
echo "PASS wave12b-15"
