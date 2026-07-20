#!/usr/bin/env bash
# verify.sh — wave5-02 (pure dueMistakes + REVIEW_INTERVALS_HOURS + unit tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/test-engine/selection.ts"
CONST="lib/constants.ts"
TEST="lib/test-engine/due-mistakes.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Interval ladder constant present.
grep -Eq "export const REVIEW_INTERVALS_HOURS" "$CONST" \
  || fail "$CONST does not export REVIEW_INTERVALS_HOURS"

# 2. dueMistakes exported from the pure engine module.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq "export function dueMistakes|export const dueMistakes" "$SRC" \
  || fail "$SRC does not export dueMistakes"

# 4. Purity: no server/DB tokens, and no clock/global random EXCEPT the pre-existing injectable
#    rng defaults (exclude `rng` lines, per the wave3-feat-02/12 determinism-grep learning).
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$SRC" \
  && fail "$SRC is not pure (server/DB token present)"
grep -nE "Math\.random|Date\.now|new Date\(" "$SRC" | grep -v "rng" \
  && fail "$SRC uses a clock or non-injected randomness — dueMistakes must take now as a param"

# 5. New test file exists and references dueMistakes.
[ -f "$TEST" ] || fail "$TEST missing (the new A unit test file)"
grep -q "dueMistakes" "$TEST" || fail "$TEST does not reference dueMistakes"

# 6. Typecheck.
npm run typecheck 2>&1 | tail -3

# 7. Fast unit suite passes + includes the new file.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"
listing="$(npx vitest list 2>/dev/null || true)"
echo "$listing" | grep -q "test-engine/due-mistakes.test.ts" \
  || fail "due-mistakes.test.ts did not run"

echo "PASS: wave5-02 dueMistakes pure + ladder + tests"
