#!/usr/bin/env bash
# verify.sh — wave9-01 (investigation: findings.md covers items 1–6)
set -euo pipefail
cd "$(dirname "$0")"   # task dir (findings.md lives beside this script)
F="findings.md"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$F" ] || fail "$F missing"
[ -s "$F" ] || fail "$F is empty"

# Each item must be substantively covered — grep for the anchor tokens it must mention.
grep -q "summarizeQuestionPerformance" "$F" || fail "must cite summarizeQuestionPerformance (reuse point)"
grep -q "getQuestionPerformance"        "$F" || fail "must reference getQuestionPerformance in lib/server/admin.ts"
grep -q "TestAnswer"                    "$F" || fail "must document the TestAnswer aggregation source"
grep -q "optionKey"                     "$F" || fail "must document the QuestionOption.optionKey join"
grep -q "questionKey"                   "$F" || fail "must document the Question.questionKey join"
grep -Eq "timeSpentSeconds"             "$F" || fail "must document the timeSpentSeconds field"
grep -q "requireContentManager"         "$F" || fail "must document the requireContentManager admin gate"
grep -q "NAV_LINKS"                     "$F" || fail "must identify the NAV_LINKS array to extend"
grep -q "analytics/page.tsx"            "$F" || fail "must reference the analytics page to mirror"
grep -q "createOfficialQuestion"        "$F" || fail "must point at the createOfficialQuestion test fixture"
grep -q "vitest list"                   "$F" || fail "must document the npx vitest list inclusion idiom"
grep -Eiq "no schema change|без зміни схеми|NO schema" "$F" || fail "must state NO schema change is required"
grep -q "summarizeQuestion"             "$F" || fail "must propose the lib/content-stats.ts export name"
grep -q "flagQuestion"                  "$F" || fail "must propose the lib/content-flags.ts export name"
grep -q "getContentHealth"              "$F" || fail "must propose the lib/server/content-stats.ts export name"

# NOTE: intentionally does NOT assert the impl files are absent — tasks 02–06 create them legitimately,
# and this gate must stay GREEN on a later re-run. The deliverable here is findings.md, nothing else.

echo "PASS: wave9-01 findings.md covers the reuse/join/UI/test surfaces"
