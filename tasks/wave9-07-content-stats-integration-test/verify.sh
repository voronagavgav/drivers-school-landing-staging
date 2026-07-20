#!/usr/bin/env bash
# verify.sh — wave9-07 (content-stats integration test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TEST="lib/server/content-stats.integration.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Exists.
[ -f "$TEST" ] || fail "$TEST missing"

# 2-5. Static guardrails against a vacuous test.
grep -q 'getContentHealth' "$TEST" || fail "$TEST must call the real getContentHealth"
grep -q 'createOfficialQuestion' "$TEST" || fail "$TEST must reuse the createOfficialQuestion fixture"
grep -q 'selectedOptionId' "$TEST" || fail "$TEST must set TestAnswer.selectedOptionId"
grep -q 'timeSpentSeconds' "$TEST" || fail "$TEST must set timeSpentSeconds (avg-time assertion)"
grep -q 'WRONG_KEY_SUSPECTED' "$TEST" || fail "$TEST must assert the WRONG_KEY_SUSPECTED flag"
grep -Eiq 'accuracy' "$TEST" || fail "$TEST must assert reported accuracy"
grep -Eiq 'picks|pickRate' "$TEST" || fail "$TEST must assert per-option picks"
grep -Eiq 'healthy|no.?flag|toHaveLength\(0\)|toEqual\(\[\]\)' "$TEST" || fail "$TEST must assert a healthy question has no flags"
grep -q 'afterAll' "$TEST" || fail "$TEST must clean up in afterAll (FK-safe)"

# 7. Seed, then run the integration suite; prove inclusion + zero failures.
npm run db:seed 2>&1 | tail -3
vlist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$vlist" | grep -q "content-stats.integration.test.ts" \
  || fail "content-stats.integration.test.ts not in the integration suite"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -14
echo "$iout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "integration suite reported failures" || true

echo "PASS: wave9-07 integration test present, exercises getContentHealth, proves WRONG_KEY_SUSPECTED + healthy; suite green"
