#!/usr/bin/env bash
# verify.sh — wave2-ux-08 (admin-segment route error boundary)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
F="app/admin/error.tsx"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$F" ] || fail "$F missing"
head -3 "$F" | grep -q '"use client"' || fail "$F is missing the \"use client\" directive"
grep -q "reset" "$F" || fail "$F does not use the reset() prop"
grep -Eq "export default" "$F" || fail "$F has no default export"
grep -Eq "[А-Яа-яІіЇїЄєҐґ]" "$F" || fail "$F has no Ukrainian fallback copy"
grep -q "error.stack" "$F" && fail "$F renders the raw error.stack"

npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

echo "PASS: wave2-ux-08 admin error boundary"
