#!/usr/bin/env bash
# verify.sh — wave3-feat-11 (richer demo seed + content invariants, idempotent)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SEED="prisma/seed.ts"
TEST="lib/server/seed-content.integration.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$SEED" ] || fail "$SEED missing"

# No schema change.
[ -z "$(git status --porcelain prisma/schema.prisma 2>/dev/null)" ] \
  || fail "prisma/schema.prisma is dirty — no schema change allowed"

# 2. First seed: parse "Done. N demo questions, M topics".
out1="$(npm run db:seed 2>&1)"; echo "$out1" | tail -3
line1="$(echo "$out1" | grep -E "Done\. [0-9]+ demo questions" | tail -1)"
[ -n "$line1" ] || fail "seed did not print the 'Done. N demo questions' line"
N1="$(echo "$line1" | sed -E 's/.*Done\. ([0-9]+) demo questions.*/\1/')"
M1="$(echo "$line1" | sed -E 's/.*demo questions, ([0-9]+) topics.*/\1/')"
[ "${N1:-0}" -ge 24 ] || fail "only $N1 demo questions (need >= 24)"
[ "${M1:-0}" -ge 7 ] || fail "only $M1 topics (need >= 7)"

# 3. Second seed: idempotent — exits 0, same count.
out2="$(npm run db:seed 2>&1)"; echo "$out2" | tail -3
N2="$(echo "$out2" | grep -E "Done\. [0-9]+ demo questions" | tail -1 | sed -E 's/.*Done\. ([0-9]+) demo questions.*/\1/')"
[ "${N2:-0}" = "${N1:-0}" ] || fail "re-seed not idempotent ($N1 then $N2 questions)"

# 4. Content-invariant integration test exists with the right assertions.
[ -f "$TEST" ] || fail "$TEST missing"
grep -Eq "isCorrect" "$TEST" || fail "$TEST does not check the one-correct-option invariant"
grep -Eq "isDemo" "$TEST" || fail "$TEST does not assert isDemo"
grep -Eq "DEMO" "$TEST" || fail "$TEST does not assert sourceType DEMO"

# 6. Typecheck.
npm run typecheck 2>&1 | tail -3

# 5. Integration suite passes + includes the content test.
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"
listing="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$listing" | grep -q "seed-content.integration.test.ts" \
  || fail "seed-content.integration.test.ts did not run"

echo "PASS: wave3-feat-11 richer demo seed ($N1 questions, $M1 topics) + invariants"
