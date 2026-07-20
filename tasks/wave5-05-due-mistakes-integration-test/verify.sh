#!/usr/bin/env bash
# verify.sh — wave5-05 (countDueMistakes integration test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TEST="lib/server/due-mistakes.integration.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1/2/3/4. File present with the right shape.
[ -f "$TEST" ] || fail "$TEST missing"
grep -q "countDueMistakes" "$TEST" || fail "$TEST does not exercise countDueMistakes"
grep -q "userMistake" "$TEST" || fail "$TEST does not create UserMistake fixtures"
grep -q "lastMistakeAt" "$TEST" || fail "$TEST does not control lastMistakeAt"
grep -Eq "RESOLVED" "$TEST" || fail "$TEST does not cover the RESOLVED-excluded case"
grep -Eq "isDemo: *false|sourceType: *\"OFFICIAL\"" "$TEST" \
  || fail "$TEST does not self-provision OFFICIAL fixtures"

# 5. Typecheck.
npm run typecheck 2>&1 | tail -3

# 6. Integration suite passes + includes this file.
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"
listing="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$listing" | grep -q "due-mistakes.integration.test.ts" \
  || fail "due-mistakes.integration.test.ts did not run under the integration config"

echo "PASS: wave5-05 countDueMistakes integration test"
