#!/usr/bin/env bash
# verify.sh — wave5-06 (pure topicMastery + MASTERY_STRONG_ACCURACY_THRESHOLD + unit tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/mastery.ts"
CONST="lib/constants.ts"
TEST="lib/mastery.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. New tunable.
grep -Eq "export const MASTERY_STRONG_ACCURACY_THRESHOLD" "$CONST" \
  || fail "$CONST does not export MASTERY_STRONG_ACCURACY_THRESHOLD"

# 2. Exports.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq "export function topicMastery|export const topicMastery" "$SRC" \
  || fail "$SRC does not export topicMastery"
grep -q "MasteryBand" "$SRC" || fail "$SRC does not define MasteryBand"
grep -q "MASTERY_LABEL" "$SRC" || fail "$SRC does not export MASTERY_LABEL"
# Reuses the existing weak thresholds.
grep -Eq "WEAK_TOPIC_MIN_ANSWERS" "$SRC" || fail "$SRC does not reuse WEAK_TOPIC_MIN_ANSWERS"
grep -Eq "WEAK_TOPIC_ACCURACY_THRESHOLD" "$SRC" || fail "$SRC does not reuse WEAK_TOPIC_ACCURACY_THRESHOLD"

# 4. Purity.
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$SRC" \
  && fail "$SRC is not pure (server/DB token present)"
grep -nE "Math\.random|Date\.now|new Date\(" "$SRC" \
  && fail "$SRC uses a clock or global randomness — must be pure/deterministic"

# 5. New test file references topicMastery.
[ -f "$TEST" ] || fail "$TEST missing (the new B unit test file)"
grep -q "topicMastery" "$TEST" || fail "$TEST does not reference topicMastery"

# 6. Typecheck.
npm run typecheck 2>&1 | tail -3

# 7. Fast unit suite + inclusion.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"
listing="$(npx vitest list 2>/dev/null || true)"
echo "$listing" | grep -q "lib/mastery.test.ts" || fail "mastery.test.ts did not run"

echo "PASS: wave5-06 topicMastery pure + tests"
