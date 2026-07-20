#!/usr/bin/env bash
# verify.sh — wave7-08 (re-import-preserves-progress integration test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TEST="lib/server/content-upsert.integration.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Test file exists.
[ -f "$TEST" ] || fail "$TEST missing"

# 2-4. It genuinely re-imports and checks the guarantee (static guardrails against a vacuous test).
grep -q "importOfficial" "$TEST" || fail "$TEST must re-run importOfficial (else it tests nothing)"
for m in UserMistake SavedQuestion TestAnswer; do
  grep -q "$m" "$TEST" || fail "$TEST must exercise the preserved model: $m"
done
grep -q "selectedOptionId" "$TEST" || fail "$TEST must set/check TestAnswer.selectedOptionId"
grep -Eiq "questionKey" "$TEST" || fail "$TEST must key off questionKey"
grep -Eiq "toBe\(.*[iI]d|\.id\b" "$TEST" || fail "$TEST must assert id equality (same id preserved)"
grep -q "overrides" "$TEST" || fail "$TEST must assert the override-edit-in-place case"

# 6. Suite includes the new file and passes (zero failures).
npm run db:seed 2>&1 | tail -3
vlist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$vlist" | grep -q "content-upsert.integration.test.ts" \
  || fail "content-upsert.integration.test.ts not in the integration suite"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -12
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures" || true

echo "PASS: wave7-08 content-upsert integration test present, re-imports, asserts id-stability + progress + override; suite green"
