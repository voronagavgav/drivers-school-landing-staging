#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
J=tasks/wave16-01-investigate-surfaces/journal.md
grep -q '## Findings' "$J" || { echo "FAIL: no Findings section"; exit 1; }
grep -q '## Risks' "$J" || { echo "FAIL: no Risks section"; exit 1; }
# Substance spot-checks: findings must carry the concrete pointers, not placeholders
for term in 'readiness-dial' 'getStudyPlan' 'listMistakes' 'nudge-card' 'trackEventSchema' 'q-image' 'requireUser' 'prisma/seed.ts'; do
  grep -q "$term" "$J" || { echo "FAIL: Findings missing pointer: $term"; exit 1; }
done
# Live questionKey examples recorded (format q_<sec>_<n>)
grep -Eq 'q_[0-9]+_[0-9]+' "$J" || { echo "FAIL: no live questionKey examples recorded"; exit 1; }
# No production changes outside tasks/ (allow known pre-existing dirt)
dirty="$(git status --porcelain | grep -vE '^(\?\?|.M) (tasks/|scripts/restyle/state\.json|_composite_t\.mjs|_sheet\.mjs|_zoom\.mjs)' || true)"
[ -z "$dirty" ] || { echo "FAIL: production changes present:"; echo "$dirty"; exit 1; }
echo "OK wave16-01"
