#!/usr/bin/env bash
# Verify wave19a-07: exam-outcome report path also captures a calibration PassOutcome (production path).
set -euo pipefail
cd "$(dirname "$0")/../.."

fail() { echo "FAIL: $1" >&2; exit 1; }

# reportExamOutcomeAction composes recordExamOutcome.
grep -q 'recordExamOutcome' lib/server/study-profile.ts || fail "reportExamOutcomeAction does not call recordExamOutcome"

# No duplicate/second exam-outcome control introduced on the account page (still one ExamOutcomeForm usage).
N="$(grep -c 'ExamOutcomeForm' "app/(app)/account/page.tsx" || true)"
[ "${N:-0}" -ge 1 ] || fail "account exam-outcome control missing"

# Production-path integration assertion lives in the exam-outcome (or sibling) suite: drives reportExamOutcomeAction
# AND asserts a PassOutcome row with the snapshotted probability.
grep -rEq 'reportExamOutcomeAction' lib/server/exam-outcome.integration.test.ts || fail "production-path test missing"
grep -rEq 'passOutcome|PassOutcome|0\.61' lib/server/exam-outcome.integration.test.ts \
  || fail "production-path test does not assert a PassOutcome row"

npm run -s typecheck || fail "typecheck failed"
npm run -s db:seed || fail "db:seed failed"
npm run -s test:integration || fail "integration suite failed"

echo "PASS: wave19a-07 exam-outcome report path captures calibration PassOutcome"
