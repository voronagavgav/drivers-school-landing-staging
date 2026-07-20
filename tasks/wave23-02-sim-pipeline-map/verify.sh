#!/usr/bin/env bash
# wave23-02: investigation — FINDINGS.md exists, has the Acceptance + Sim contract sections, and every
# cited real symbol actually exists in the repo.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="tasks/wave23-02-sim-pipeline-map/FINDINGS.md"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

grep -q "## Acceptance" "$F" || { echo "FAIL: no ## Acceptance section"; exit 1; }
grep -q "## Sim contract" "$F" || { echo "FAIL: no ## Sim contract section"; exit 1; }

# Cited symbols must be real exports/definitions in the repo.
for sym in retrievability schedule selectReviewQueue releaseDial; do
  grep -q "$sym" "$F" || { echo "FAIL: FINDINGS does not cite $sym"; exit 1; }
  grep -rqE "export (function|const|interface|type) $sym|export .*\b$sym\b" lib \
    || { echo "FAIL: cited symbol $sym not a real export under lib/"; exit 1; }
done

# Blueprint quotas + threshold documented.
grep -qE "pdr 10|pdr.*10" "$F" || { echo "FAIL: blueprint quotas not documented"; exit 1; }

echo "PASS wave23-02"
