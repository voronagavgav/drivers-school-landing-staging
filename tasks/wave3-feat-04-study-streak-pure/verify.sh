#!/usr/bin/env bash
# verify.sh — wave3-feat-04 (pure studyStreak + DAILY_GOAL_ANSWERS constant + tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/streak.ts"
TEST="lib/streak.test.ts"
CONST="lib/constants.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Export present.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq "export function studyStreak|export const studyStreak" "$SRC" \
  || fail "$SRC does not export studyStreak"

# 4. Purity + determinism.
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$SRC" \
  && fail "$SRC is not pure (server/DB token present)"
grep -Eq "Date\.now\(\)|new Date\(\)" "$SRC" \
  && fail "$SRC reads the clock (Date.now()/new Date()) — must be deterministic"

# 2. Timezone documented.
grep -Eqi "utc" "$SRC" || fail "$SRC does not document the UTC day-bucketing timezone"

# 5. Configurable daily-goal constant.
[ -f "$CONST" ] || fail "$CONST missing"
grep -Eq "export const DAILY_GOAL_ANSWERS\b" "$CONST" \
  || fail "$CONST does not export DAILY_GOAL_ANSWERS"

# 6. Test references the function via the @/ alias.
[ -f "$TEST" ] || fail "$TEST missing"
grep -q "@/lib/streak" "$TEST" || fail "$TEST does not import from @/lib/streak"
grep -q "studyStreak" "$TEST" || fail "$TEST does not reference studyStreak"

# 7b. Typecheck.
npm run typecheck 2>&1 | tail -3

# 7. Fast unit suite passes + includes streak.test.ts.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"
listing="$(npx vitest list 2>/dev/null || true)"
echo "$listing" | grep -q "streak.test.ts" || fail "streak.test.ts did not run"

echo "PASS: wave3-feat-04 studyStreak pure + constant + tests"
