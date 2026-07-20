#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
J=tasks/wave15-01-investigate-surfaces/journal.md
grep -q '^## Findings' "$J" || { echo "FAIL: no ## Findings section"; exit 1; }
grep -q '^## Risks' "$J" || { echo "FAIL: no ## Risks section"; exit 1; }
# required coverage terms (NOTE: term presence does not prove substance — driver must answer each item)
for term in 'startSession' 'startTestSchema' 'loadReviewCandidates' 'createReviewSession' 'displayOrder' 'showsImmediateFeedback' 'test-runner' 'result' 'onboarding' 'ReadinessDial|readiness-dial' 'NudgeCard' 'browser-audit' 'difficulty' '132' '133' 'imageKey' 'READINESS_MIN_SEEN'; do
  grep -Eq -e "$term" "$J" || { echo "FAIL: Findings/Risks missing coverage of: $term"; exit 1; }
done
dirty="$(git status --porcelain | grep -Ev 'tasks/|scripts/restyle/state.json|_composite_t.mjs|_sheet.mjs|_zoom.mjs' || true)"
[ -z "$dirty" ] || { echo "FAIL: production changes present: $dirty"; exit 1; }
echo "OK wave15-01"
