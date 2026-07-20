#!/usr/bin/env bash
# verify.sh — wave3-feat-10 (change-password integration test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TEST="lib/server/change-password.integration.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1/2. File present with the right imports/shape.
[ -f "$TEST" ] || fail "$TEST missing"
grep -q "changePasswordAction" "$TEST" || fail "$TEST does not exercise changePasswordAction"
grep -q "verifyPassword" "$TEST" || fail "$TEST does not assert via verifyPassword"
grep -q "passwordHash" "$TEST" || fail "$TEST does not check passwordHash changes"
grep -q "getCurrentUser" "$TEST" || fail "$TEST does not mock the getCurrentUser boundary"

# 6. Typecheck.
npm run typecheck 2>&1 | tail -3

# 5. Integration suite passes + includes this file.
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"
listing="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$listing" | grep -q "change-password.integration.test.ts" \
  || fail "change-password.integration.test.ts did not run under the integration config"

echo "PASS: wave3-feat-10 change-password integration test"
