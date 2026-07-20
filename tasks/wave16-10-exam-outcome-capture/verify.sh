#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
grep -q 'reportExamOutcomeAction' lib/server/study-profile.ts || { echo "FAIL: action missing from study-profile.ts"; exit 1; }
grep -q 'exam_outcome_reported' lib/server/study-profile.ts || { echo "FAIL: typed analytics event not recorded"; exit 1; }
grep -q 'EXAM_OUTCOMES' lib/validation.ts || { echo "FAIL: outcome schema not tied to EXAM_OUTCOMES"; exit 1; }
grep -rq 'reportExamOutcomeAction\|ExamOutcome' 'app/(app)/account' components/account-forms.tsx 2>/dev/null || { echo "FAIL: account surface not wired"; exit 1; }
IT=lib/server/exam-outcome.integration.test.ts
[ -f "$IT" ] || { echo "FAIL: $IT missing"; exit 1; }
grep -q 'userId' "$IT" || { echo "FAIL: IDOR probe (smuggled userId) not present"; exit 1; }
grep -q 'waitFor' "$IT" || { echo "FAIL: fire-and-forget event assert must vi.waitFor-poll"; exit 1; }
# No nudge logic creep
nudge="$(git diff --name-only HEAD | grep -E 'lib/nudge-policy\.ts|lib/server/nudges\.ts' || true)"
[ -z "$nudge" ] || { echo "FAIL: nudge files touched (belongs to wave16-11): $nudge"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "OK wave16-10"
