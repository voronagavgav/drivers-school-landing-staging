#!/usr/bin/env bash
# wave12b-07 — plan card + consolidated #exam section.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
D="app/(app)/dashboard/page.tsx"
grep -qF 'Сьогоднішній план' "$D" || { echo "FAIL: plan card heading missing"; exit 1; }
grep -qE 'getStudyPlan' "$D" || { echo "FAIL: plan card must use getStudyPlan"; exit 1; }
grep -qE 'PLAN_SECONDS_PER_QUESTION' lib/constants.ts || { echo "FAIL: PLAN_SECONDS_PER_QUESTION missing from constants"; exit 1; }
grep -qE 'PLAN_SECONDS_PER_QUESTION' "$D" || { echo "FAIL: minutes must derive from the constant"; exit 1; }
grep -qE 'ADAPTIVE_REVIEW' "$D" || { echo "FAIL: plan-card one-tap start (ADAPTIVE_REVIEW) missing"; exit 1; }
grep -qE 'id="exam"' "$D" || { echo "FAIL: #exam section missing"; exit 1; }
grep -qF 'тренування формату' "$D" || { echo "FAIL: exam graded-exposure copy missing"; exit 1; }
grep -qE 'DEFAULT_EXAM_QUESTION_COUNT' "$D" || { echo "FAIL: format chip must use constants"; exit 1; }
# exactly one «Почати симуляцію» and one EXAM_SIMULATION start on the dashboard
n="$(grep -o 'Почати симуляцію' "$D" | wc -l | tr -d ' ')"
[ "$n" -eq 1 ] || { echo "FAIL: «Почати симуляцію» must appear exactly once on the dashboard (got $n)"; exit 1; }
m="$(grep -o 'EXAM_SIMULATION' "$D" | wc -l | tr -d ' ')"
[ "$m" -le 2 ] || { echo "FAIL: too many EXAM_SIMULATION references ($m) — duplicate start form?"; exit 1; }
# detox: no punitive streak copy
if grep -nE 'втратите|згорить' "$D"; then echo "FAIL: punitive streak copy"; exit 1; fi
npm run typecheck
npm test
npm run build
ORIGIN="${DS_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -sS -m 6 -o /dev/null "$ORIGIN/login" 2>/dev/null; then
  bash bin/browser-audit.sh >/dev/null 2>&1 || { echo "FAIL: browser audit regressed"; exit 1; }
fi
echo "PASS wave12b-07"
