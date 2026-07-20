#!/usr/bin/env bash
# verify.sh — wave11-13 study-profile integration (runs this file only).
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }
F="lib/server/study-profile.integration.test.ts"
[ -f "$F" ] || fail "$F missing"

grep -Eq 'setDailyGoalAction|setExamDateAction' "$F" || fail "$F must drive the real profile actions"
grep -Eq 'finishSession' "$F" || fail "$F must drive streak via real finishSession"
grep -Eq 'submitAnswer' "$F" || fail "$F must prove StudyDay bump via real submitAnswer"
grep -Eq 'createOfficialQuestion' "$F" || fail "$F must self-provision fixtures"
grep -Eq 'freeze|Freeze' "$F" || fail "$F must assert the auto-freeze transition"

ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ilist" | grep -q "study-profile.integration.test.ts" || fail "not in integration list"

npm run db:seed 2>&1 | tail -2
out="$(npx vitest run --config vitest.integration.config.ts "$F" 2>&1)"; echo "$out" | tail -20
echo "$out" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "study-profile suite reported failures" || true
echo "PASS: study-profile integration green"
