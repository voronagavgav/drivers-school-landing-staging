#!/usr/bin/env bash
# Verify wave19a-06: recordExamOutcome capture unit — auth/IDOR-safe, snapshots the prediction, integration-tested.
set -euo pipefail
cd "$(dirname "$0")/../.."

fail() { echo "FAIL: $1" >&2; exit 1; }

MOD="$(git grep -lE 'export (async function|function|const) recordExamOutcome' -- lib/server app/actions | head -1)"
[ -n "$MOD" ] || fail "recordExamOutcome export not found in lib/server or app/actions"

# Self-only: no userId parameter smuggling; identity via requireUser.
grep -q 'requireUser' "$MOD" || fail "recordExamOutcome does not call requireUser"
grep -Eq 'getLatestReadiness' "$MOD" || fail "recordExamOutcome does not read getLatestReadiness"
grep -Eq 'passProbability' "$MOD" || fail "recordExamOutcome does not snapshot passProbability"
grep -Eq 'passOutcome\.create|prisma\.passOutcome' "$MOD" || fail "recordExamOutcome does not insert a PassOutcome"

# New analytics event registered FIRST.
grep -Fq 'pass_outcome_captured' lib/constants.ts || fail "pass_outcome_captured not in ANALYTICS_EVENTS"

# Integration test present + collected.
TEST=lib/server/pass-outcome.integration.test.ts
[ -f "$TEST" ] || fail "pass-outcome.integration.test.ts missing"
grep -Eq '0\.73|predictedPassProbability' "$TEST" || fail "integration test does not assert the snapshotted probability"

npm run -s typecheck || fail "typecheck failed"
npm run -s db:seed || fail "db:seed failed"
npm run -s test:integration || fail "integration suite failed"

ILIST="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ILIST" | grep -q 'pass-outcome.integration' || fail "pass-outcome integration suite not collected"

echo "PASS: wave19a-06 recordExamOutcome capture unit verified"
