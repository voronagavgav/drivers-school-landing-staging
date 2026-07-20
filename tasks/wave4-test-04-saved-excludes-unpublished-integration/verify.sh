#!/usr/bin/env bash
# verify.sh — wave4-test-04 (SAVED excludes unpublished/archived integration test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TEST="lib/server/saved-excludes-unpublished.integration.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. File present with the right imports/shape.
[ -f "$TEST" ] || fail "$TEST missing"
grep -q "SAVED_QUESTIONS" "$TEST" || fail "$TEST does not exercise SAVED_QUESTIONS"
grep -q "savedQuestion" "$TEST" || fail "$TEST does not create SavedQuestion rows"
grep -Eq "isPublished|archivedAt" "$TEST" || fail "$TEST does not unpublish/archive a saved question"

# 8. Typecheck.
npm run typecheck 2>&1 | tail -3

# 7. Integration suite passes + includes this file.
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -12
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"
listing="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$listing" | grep -q "saved-excludes-unpublished.integration.test.ts" \
  || fail "saved-excludes-unpublished.integration.test.ts did not run under the integration config"

echo "PASS: wave4-test-04 SAVED excludes unpublished/archived integration test"
