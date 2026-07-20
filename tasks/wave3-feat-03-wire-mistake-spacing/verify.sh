#!/usr/bin/env bash
# verify.sh — wave3-feat-03 (wire spacedMistakeOrder into MISTAKE_PRACTICE)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/server/test-engine.ts"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$SRC" ] || fail "$SRC missing"

# 1. Imports the pure helper from the engine.
grep -q "spacedMistakeOrder" "$SRC" || fail "$SRC does not use spacedMistakeOrder"
grep -Eq "from \"@/lib/test-engine/selection\"" "$SRC" \
  || fail "$SRC does not import from @/lib/test-engine/selection"

# 2. The wiring layer supplies the clock: spacedMistakeOrder is CALLED and Date.now() is present
#    (the engine module itself is clockless — task 02 forbids Date.now() there; here it is required).
grep -Eq "spacedMistakeOrder\(" "$SRC" || fail "$SRC never calls spacedMistakeOrder()"
grep -qF "Date.now()" "$SRC" || fail "$SRC should pass Date.now() into spacedMistakeOrder (wiring supplies 'now')"

# 3. Other modes untouched: these markers must still be present.
for tok in "EXAM_SIMULATION" "SAVED_QUESTIONS" "MIXED_PRACTICE" "computeWeakTopicIds" "selectQuestions"; do
  grep -q "$tok" "$SRC" || fail "$SRC missing '$tok' — other-mode logic must remain intact"
done

# 4. Typecheck.
npm run typecheck 2>&1 | tail -3

# 5. Fast unit suite.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

# 6. Integration suite (engine pool gating still holds for MISTAKE_PRACTICE).
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -8
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"

echo "PASS: wave3-feat-03 mistake spacing wired"
