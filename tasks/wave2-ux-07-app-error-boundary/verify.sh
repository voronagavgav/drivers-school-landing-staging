#!/usr/bin/env bash
# verify.sh — wave2-ux-07 (app-segment route error boundary)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
F="app/(app)/error.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. File exists + is a client component.
[ -f "$F" ] || fail "$F missing"
head -3 "$F" | grep -q '"use client"' || fail "$F is missing the \"use client\" directive"

# 1/2. Receives reset + calls it; default export present.
grep -q "reset" "$F" || fail "$F does not use the reset() prop"
grep -Eq "export default" "$F" || fail "$F has no default export"

# 2. Friendly Ukrainian copy (Cyrillic present) — a generic message, not just the raw error.
grep -Eq "[А-Яа-яІіЇїЄєҐґ]" "$F" || fail "$F has no Ukrainian fallback copy"

# 3. Does not dump the raw stack.
grep -q "error.stack" "$F" && fail "$F renders the raw error.stack (should show a friendly message)"

# 4. Typecheck.
npm run typecheck 2>&1 | tail -3

# 5. Fast unit suite green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

echo "PASS: wave2-ux-07 app error boundary"
