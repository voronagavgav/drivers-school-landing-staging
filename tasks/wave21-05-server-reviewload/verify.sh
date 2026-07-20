#!/usr/bin/env bash
# wave21-05: getStudyPlan computes reviewLoad in the existing scan; integration anchors pass.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SRC="lib/server/study.ts"
[ -f "$SRC" ] || { echo "FAIL: $SRC missing"; exit 1; }

# stability joins the existing states select; reviewLoad passed through.
grep -q "reviewLoad" "$SRC" || { echo "FAIL: $SRC does not pass reviewLoad"; exit 1; }
grep -q "stability" "$SRC" || { echo "FAIL: $SRC states select must include stability"; exit 1; }

# No new reviewState query added: getStudyPlan must not grow a second reviewState scan. The file's
# PRE-TASK baseline is 4 reviewState.findMany calls (loadReviewCandidates, loadSignTrainerCandidates,
# countDueReviews, getStudyPlan) — this task only adds `stability` to getStudyPlan's EXISTING select,
# so the total must stay at 4 (an added scan pushes it to 5). (Planner's original `-le 2` baseline
# was wrong; corrected to the true pre-task count — tightens, not weakens, the query-count check.)
N_FIND="$(grep -cE "reviewState\.findMany" "$SRC" || true)"
[ "${N_FIND:-0}" -le 4 ] || { echo "FAIL: extra reviewState.findMany added (count=$N_FIND)"; exit 1; }

echo "=== typecheck ==="
npm run -s typecheck

echo "=== db:seed (before integration, CLAUDE.md ordering) ==="
npm run db:seed

echo "=== integration: reviewLoad wiring suite ==="
LIST="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
grep -q "reviewload\|review-load\|study-plan" <<<"$LIST" \
  || { echo "FAIL: reviewLoad wiring integration suite not collected"; exit 1; }
npm run test:integration

echo "PASS: wave21-05"
