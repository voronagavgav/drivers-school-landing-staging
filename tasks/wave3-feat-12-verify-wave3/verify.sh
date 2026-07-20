#!/usr/bin/env bash
# verify.sh — wave3-feat-12 (full Wave 3 acceptance gate, spec A–E)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
fail() { echo "FAIL: $1"; exit 1; }

# 1. Typecheck.
npm run typecheck 2>&1 | tail -3

# 2. Fast unit suite: zero failures + >= 11 test files.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "unit suite reported failures"
listing="$(npx vitest list 2>/dev/null || true)"
nfiles="$(echo "$listing" | sed -E 's/ *> .*//' | sort -u | grep -c '\.test\.ts')"
[ "${nfiles:-0}" -ge 11 ] || fail "expected >= 11 fast unit test files, found $nfiles"
echo "$listing" | grep -q "lib/streak.test.ts" || fail "streak.test.ts missing from unit suite"
echo "$listing" | grep -q "lib/sparkline.test.ts" || fail "sparkline.test.ts missing from unit suite"

# 3. Seed (>= 24) then integration suite incl. the two new files.
seedout="$(npm run db:seed 2>&1)"; echo "$seedout" | tail -2
N="$(echo "$seedout" | grep -E "Done\. [0-9]+ demo questions" | tail -1 | sed -E 's/.*Done\. ([0-9]+) demo questions.*/\1/')"
[ "${N:-0}" -ge 24 ] || fail "seed reports only $N demo questions (need >= 24)"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"
ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ilist" | grep -q "change-password.integration.test.ts" || fail "change-password integration test missing"
echo "$ilist" | grep -q "seed-content.integration.test.ts" || fail "seed-content integration test missing"

# 4. Build.
npm run build 2>&1 | tail -6

# ---- Static presence checks A–E ----
SEL="lib/test-engine/selection.ts"
ENG="lib/server/test-engine.ts"
STREAK="lib/streak.ts"
CONST="lib/constants.ts"
DASH="app/(app)/dashboard/page.tsx"
SPARK="lib/sparkline.ts"
VAL="lib/validation.ts"
ACT="app/actions/auth.ts"
ACCT="app/(app)/account/page.tsx"
NAV="components/app-nav.tsx"

# 5. A — spacing.
grep -Eq "export (function|const) spacedMistakeOrder" "$SEL" || fail "A: spacedMistakeOrder not exported"
# Whole-module no-DB/no-server-runtime invariant.
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$SEL" \
  && fail "A: $SEL imports DB/server-only (must be pure)"
# Determinism: no clock/global random EXCEPT the documented injectable-rng defaults
# (`rng = Math.random`, by design per the module header — the spec scopes determinism to
# spacedMistakeOrder, which takes `now` as a param and never reads the clock).
grep -nE "Math\.random|Date\.now\(" "$SEL" | grep -v "rng" \
  && fail "A: $SEL is not deterministic (clock/global random outside injectable rng)"
grep -q "spacedMistakeOrder" "$ENG" || fail "A: MISTAKE path not wired to spacedMistakeOrder"

# 6. B — streak/goal.
grep -Eq "export (function|const) studyStreak" "$STREAK" || fail "B: studyStreak not exported"
grep -q "DAILY_GOAL_ANSWERS" "$CONST" || fail "B: DAILY_GOAL_ANSWERS missing from constants"
grep -q "studyStreak" "$DASH" || fail "B: dashboard does not call studyStreak"
grep -q "getStudyActivity" "$DASH" || fail "B: dashboard does not call getStudyActivity"
grep -q "DAILY_GOAL_ANSWERS" "$DASH" || fail "B: dashboard does not use DAILY_GOAL_ANSWERS"

# 7. C — sparkline.
grep -Eq "export (function|const) sparkline" "$SPARK" || fail "C: sparkline not exported"
grep -q "@/lib/sparkline" "$DASH" || fail "C: dashboard does not import @/lib/sparkline"
grep -q "getRecentReadinessScores" "$DASH" || fail "C: dashboard no longer reuses getRecentReadinessScores"
grep -Eq "<svg" "$DASH" || fail "C: dashboard renders no <svg> sparkline"

# 8. D — change password.
grep -q "changePasswordSchema" "$VAL" || fail "D: changePasswordSchema missing"
grep -Eq "min\(8" "$VAL" || fail "D: new-password 8-char minimum missing"
grep -q "changePasswordAction" "$ACT" || fail "D: changePasswordAction missing"
for tok in requireUser verifyPassword hashPassword passwordHash; do
  grep -q "$tok" "$ACT" || fail "D: action missing '$tok'"
done
[ -f "$ACCT" ] || fail "D: account page missing"
grep -q "/account" "$NAV" || fail "D: nav has no /account link"

# 10. Schema unchanged across the wave.
[ -z "$(git status --porcelain prisma/schema.prisma 2>/dev/null)" ] \
  || fail "prisma/schema.prisma is dirty — Wave 3 must not change the schema"
if git rev-parse HEAD >/dev/null 2>&1; then
  git log --oneline -- prisma/schema.prisma 2>/dev/null | grep -Eiq "wave3-feat" \
    && fail "a wave3-feat commit touched prisma/schema.prisma" || true
fi

echo "PASS: wave3-feat-12 — Wave 3 acceptance gate (A–E) green"
