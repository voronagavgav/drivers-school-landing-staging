#!/usr/bin/env bash
# wave19b-11 — whole-wave verify gate. Confirms all four deliverables landed + suite/build green.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Deliverable #1 — beta-binomial correlation.
[ -f lib/readiness-correlation.ts ] || { echo "FAIL(#1): lib/readiness-correlation.ts missing"; exit 1; }
grep -Eq "READINESS_TOPIC_CORRELATION" lib/constants.ts || { echo "FAIL(#1): ρ constant missing"; exit 1; }
grep -Eq "topicCorrelation" lib/server/mastery-readiness.ts || { echo "FAIL(#1): recomputeReadiness ρ not wired"; exit 1; }
grep -Eq "rho" lib/server/mastery-readiness.ts || { echo "FAIL(#1): inputsJson rho missing"; exit 1; }
grep -Eq "fsrs6" lib/server/mastery-readiness.ts || { echo "FAIL(#1): engine version tag missing"; exit 1; }

# Deliverable #2 — grade BKT.
grep -Eq "export function gradePosterior" lib/fsrs/grade.ts || { echo "FAIL(#2): gradePosterior missing"; exit 1; }
grep -Eq "priorKnow" lib/fsrs/grade.ts || { echo "FAIL(#2): deriveGrade priorKnow missing"; exit 1; }
grep -Eq "priorKnow" lib/server/study.ts || { echo "FAIL(#2): study.ts not passing priorKnow"; exit 1; }
grep -Eq "FSRS_GUESS_DEFAULT" lib/fsrs/constants.ts || { echo "FAIL(#2): FSRS_GUESS_DEFAULT missing"; exit 1; }
grep -Eqi "forward.only|not .*retro" lib/fsrs/grade.ts || { echo "FAIL(#2): forward-only note missing"; exit 1; }

# Deliverable #3 — bucketing.
grep -Eq "export function sectionFromQuestionKey" lib/content-key.ts || { echo "FAIL(#3): sectionFromQuestionKey missing"; exit 1; }
BODY="$(awk '/export function groupCandidatesByBlock/{f=1} f{print} f&&/^}/{exit}' lib/exam-blueprint.ts)"
grep -q "displayOrder" <<<"$BODY" && { echo "FAIL(#3): groupCandidatesByBlock still uses displayOrder"; exit 1; } || true
grep -Eq "sectionFromQuestionKey" lib/server/mastery-readiness.ts || { echo "FAIL(#3): recomputeReadiness not using section"; exit 1; }
grep -Eq "sectionFromQuestionKey" lib/server/test-engine.ts || { echo "FAIL(#3): exam composer not using section"; exit 1; }

# Deliverable #4 — constants + copy.
grep -Eq "READINESS_MIN_ANSWERS *= *20" lib/constants.ts && { echo "FAIL(#4): redundant = 20 literal remains"; exit 1; } || true
grep -nE 'гаранті' components/readiness-dial.tsx | grep -qE 'не[[:space:]]+гаранті|а не гаранті' || { echo "FAIL(#4): «не гарантія» disclaimer missing"; exit 1; }

# Suite + build.
npm run -s typecheck
npm run -s test

vitest_has(){ local tok="$1" out; for _ in 1 2 3 4 5; do out="$(npx vitest list 2>/dev/null || true)"; grep -q "$tok" <<<"$out" && return 0; done; return 1; }
for s in readiness-correlation grade-posterior readiness-model reference-vectors content-key; do
  vitest_has "$s" || { echo "FAIL: unit suite $s not collected"; exit 1; }
done

npm run -s db:seed
npm run -s test:integration

ILIST=""; for _ in 1 2 3 4 5; do ILIST="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"; grep -q exam-blueprint <<<"$ILIST" && break; done
grep -q exam-blueprint <<<"$ILIST" || { echo "FAIL: exam-blueprint integration not collected"; exit 1; }

npm run -s build

# Browser transport regression gate (env-dependent; skip cleanly if the audit script/origin is unavailable).
if [ -x bin/browser-audit.sh ] || npm run -s audit:browser --dry-run >/dev/null 2>&1; then
  npm run -s audit:browser || { echo "FAIL: audit:browser regressed"; exit 1; }
fi

echo "PASS wave19b-11"
