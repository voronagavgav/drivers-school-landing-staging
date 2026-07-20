#!/usr/bin/env bash
# verify.sh — wave2-ux-04 (confirm-before-finish + unanswered warning in the test runner)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TR="components/test-runner.tsx"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$TR" ] || fail "$TR missing"

# 1. A confirmation gate exists (some confirm/dialog state). Loose match to avoid over-constraining impl.
grep -Eiq "confirm|<dialog|showFinish|Підтверд" "$TR" \
  || fail "$TR has no confirm/dialog gate before finishing"

# 2. Unanswered warning string (capital «Ви відповіли на … з …»).
grep -qF "Ви відповіли на" "$TR" || fail "$TR missing «Ви відповіли на …» warning"

# 3. A cancel control exists.
grep -qF "Скасувати" "$TR" || fail "$TR missing a «Скасувати» (cancel) control"

# 4. Idempotency latch preserved.
grep -q "finishingRef" "$TR" || fail "$TR lost the finishingRef idempotency latch"

# 5. Typecheck.
npm run typecheck 2>&1 | tail -3

# 6. Fast unit suite green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

echo "PASS: wave2-ux-04 confirm-before-finish"
