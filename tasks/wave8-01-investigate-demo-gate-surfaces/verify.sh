#!/usr/bin/env bash
# verify.sh — wave8-01 investigation: the FINDINGS.md artifact exists and covers the required points.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="tasks/wave8-01-investigate-demo-gate-surfaces/FINDINGS.md"

[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# (3)+(4) production sites incl. the spec-missed mastery.ts
for needle in "mastery.ts" "test-engine.ts" "constants.ts" "practice/page.tsx"; do
  grep -q "$needle" "$F" || { echo "FAIL: FINDINGS.md does not mention production site $needle"; exit 1; }
done

# (5) the typecheck-ordering / demo-retired delete-first constraint
grep -q "demo-retired" "$F" || { echo "FAIL: FINDINGS.md does not mention demo-retired delete ordering"; exit 1; }

# (6) at least four shared-helper candidate suites named
hits=0
for s in access-control analytics-dashboard engine due-mistakes exam-blueprint \
         mixed-weak-topics finish-idempotency exam-short-pool progress-volume saved-excludes; do
  grep -q "$s" "$F" && hits=$((hits+1))
done
[ "$hits" -ge 4 ] || { echo "FAIL: <4 shared-helper candidate suites named ($hits)"; exit 1; }

# (7) the PRESERVE list (data fields + validation refine kept)
grep -qi "sourceType" "$F" || { echo "FAIL: PRESERVE list missing sourceType"; exit 1; }
grep -qi "isDemo"     "$F" || { echo "FAIL: PRESERVE list missing isDemo"; exit 1; }
grep -qi "validation" "$F" || { echo "FAIL: PRESERVE list missing the validation refine"; exit 1; }

echo "PASS: wave8-01 FINDINGS.md present and complete"
