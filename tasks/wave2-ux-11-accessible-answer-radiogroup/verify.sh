#!/usr/bin/env bash
# verify.sh — wave2-ux-11 (accessible radiogroup answer options + keyboard + non-colour correctness)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TR="components/test-runner.tsx"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$TR" ] || fail "$TR missing"

# 1. radiogroup container.
grep -q 'role="radiogroup"' "$TR" || fail "$TR options container is not role=radiogroup"

# 2. per-option radio role + aria-checked.
grep -q 'role="radio"' "$TR" || fail "$TR options are not role=radio"
grep -q "aria-checked" "$TR" || fail "$TR options have no aria-checked"

# 3. keyboard arrow handling + Enter/Space.
grep -q "onKeyDown" "$TR" || fail "$TR has no onKeyDown handler"
grep -Eq "Arrow(Down|Up|Right|Left)" "$TR" || fail "$TR does not handle arrow keys"

# 4. non-colour correctness indicator (checkmark + cross glyphs).
grep -q "✓" "$TR" || fail "$TR has no ✓ correct indicator"
grep -q "✗" "$TR" || fail "$TR has no ✗ wrong indicator"

# 5. Typecheck.
npm run typecheck 2>&1 | tail -3

# 6. Fast unit suite green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

echo "PASS: wave2-ux-11 accessible answer radiogroup"
