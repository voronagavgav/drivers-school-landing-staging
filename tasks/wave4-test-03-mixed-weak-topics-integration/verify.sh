#!/usr/bin/env bash
# verify.sh — wave4-test-03 (MIXED prioritises weak topics integration test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TEST="lib/server/mixed-weak-topics.integration.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. File present with the right imports/shape.
[ -f "$TEST" ] || fail "$TEST missing"
grep -q "MIXED_PRACTICE" "$TEST" || fail "$TEST does not exercise MIXED_PRACTICE"
grep -q "computeWeakTopicIds" "$TEST" || fail "$TEST does not assert weak-topic detection"
grep -q "displayOrder" "$TEST" || fail "$TEST does not assert by displayOrder band"

# 7. Typecheck.
npm run typecheck 2>&1 | tail -3

# 6. Integration suite passes + includes this file.
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -12
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"
listing="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$listing" | grep -q "mixed-weak-topics.integration.test.ts" \
  || fail "mixed-weak-topics.integration.test.ts did not run under the integration config"

echo "PASS: wave4-test-03 MIXED weak-topics integration test"
