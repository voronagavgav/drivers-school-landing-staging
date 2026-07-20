#!/usr/bin/env bash
# verify.sh — wave11-12 study-profile server (static + build; behavior proven in wave11-13).
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }
P="lib/server/study-profile.ts"
[ -f "$P" ] || fail "$P missing"

grep -Eq 'export (async )?function getOrCreateProfile' "$P" || fail "getOrCreateProfile missing"
grep -Eq 'export (async )?function setExamDateAction' "$P" || fail "setExamDateAction missing"
grep -Eq 'export (async )?function setDailyGoalAction' "$P" || fail "setDailyGoalAction missing"
grep -Eq 'export (async )?function bumpStudyDay' "$P" || fail "bumpStudyDay missing"

# self-only: actions resolve identity via requireUser (not a client userId).
grep -Eq 'requireUser' "$P" || fail "actions must derive identity via requireUser (self-only RBAC)"

# streak-policy + study-plan pure modules are used (not re-derived).
grep -Eq 'nextStreakState' lib/server/test-engine.ts || grep -Eq 'nextStreakState' "$P" \
  || fail "finishSession streak must use nextStreakState"
grep -Eq 'computeStudyPlan' lib/server/study.ts || fail "getStudyPlan must use pure computeStudyPlan"
grep -Eq 'export (async )?function getStudyPlan' lib/server/study.ts || fail "getStudyPlan not exported"

# StudyDay bump wired into submitAnswer.
grep -Eq 'bumpStudyDay' lib/server/test-engine.ts || fail "submitAnswer does not call bumpStudyDay"

# validation schemas added.
grep -Eq 'examDate|dailyGoal' lib/validation.ts || fail "validation schemas for examDate/dailyGoal missing"

npm run typecheck 2>&1 | tail -3
npm run build 2>&1 | tail -6
echo "PASS: study-profile server wiring (behavioral proof in wave11-13)"
