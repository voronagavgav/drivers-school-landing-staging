#!/usr/bin/env bash
# verify.sh — wave4-test-05 (progress aggregation at volume integration test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TEST="lib/server/progress-volume.integration.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. File present with the right imports/shape.
[ -f "$TEST" ] || fail "$TEST missing"
grep -q "computeProgress" "$TEST" || fail "$TEST does not call computeProgress"
grep -q "topicStats" "$TEST" || fail "$TEST does not assert per-topic stats"
grep -q "weakTopics" "$TEST" || fail "$TEST does not assert weak-topic detection"
grep -q "readiness" "$TEST" || fail "$TEST does not assert readiness"

# 8. Typecheck.
npm run typecheck 2>&1 | tail -3

# 8. Integration suite passes + includes this file.
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -12
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"
listing="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$listing" | grep -q "progress-volume.integration.test.ts" \
  || fail "progress-volume.integration.test.ts did not run under the integration config"

echo "PASS: wave4-test-05 progress aggregation at volume integration test"
