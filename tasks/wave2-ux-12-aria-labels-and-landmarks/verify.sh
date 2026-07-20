#!/usr/bin/env bash
# verify.sh — wave2-ux-12 (aria-labels on controls, aria-live timer, skip-to-content + main landmark)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TR="components/test-runner.tsx"
LAYOUT="app/(app)/layout.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. aria-labels present in the test runner (save/flag controls).
grep -q "aria-label" "$TR" || fail "$TR has no aria-label on its controls"

# 2. Timer announced via aria-live.
grep -q 'aria-live' "$TR" || fail "$TR Timer is not an aria-live region"

# 3. Skip link + matching main landmark id.
grep -qF 'href="#main-content"' "$LAYOUT" || fail "$LAYOUT has no skip link to #main-content"
grep -qF 'id="main-content"' "$LAYOUT" || fail "$LAYOUT <main> has no matching id=main-content"
grep -q "sr-only" "$LAYOUT" || fail "$LAYOUT skip link is not visually-hidden (sr-only)"

# 4. Typecheck.
npm run typecheck 2>&1 | tail -3

# 5. Fast unit suite green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

echo "PASS: wave2-ux-12 aria-labels + landmarks"
