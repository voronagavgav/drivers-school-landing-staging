#!/usr/bin/env bash
# wave12b-13 — onboarding optional plan steps.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
O="app/(app)/onboarding/page.tsx"
files="$(find "app/(app)/onboarding" components -maxdepth 1 -name '*.tsx' 2>/dev/null | tr '\n' ' ')"
hit() { local pat="$1"; shift; grep -qE -e "$pat" $files 2>/dev/null; }
hitF() { local pat="$1"; grep -qF -e "$pat" $files 2>/dev/null; }
hitF 'Крок' || { echo "FAIL: step indicator missing"; exit 1; }
hitF 'з 3' || { echo "FAIL: 3-step indicator missing"; exit 1; }
hitF 'Пропустити' || { echo "FAIL: skip affordance missing"; exit 1; }
hit 'setExamDateAction' || { echo "FAIL: exam-date step must use setExamDateAction"; exit 1; }
hit 'setDailyGoalAction' || { echo "FAIL: daily-goal step must use setDailyGoalAction"; exit 1; }
hit 'getStudyPlan|computeStudyPlan' || { echo "FAIL: first-plan message must derive from the plan"; exit 1; }
hitF 'встигаєш спокійно' || { echo "FAIL: first-plan copy missing"; exit 1; }
# B default preserved
grep -qE '"B"|defaultCategory' "$O" || { echo "FAIL: category B default lost?"; exit 1; }
npm run typecheck
npm test
npm run build
npm run db:seed >/dev/null 2>&1 || true
npm run test:integration
echo "PASS wave12b-13"
