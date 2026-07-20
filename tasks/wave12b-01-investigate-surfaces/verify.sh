#!/usr/bin/env bash
# wave12b-01 — investigation report exists with all required sections.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="docs/app-plan/WAVE12B-SURFACES.md"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
for h in "## Dashboard current" "## Readiness data" "## Plan data" "## Finish path" "## Runner regions" "## Result data" "## Due counts" "## Audit + shots" "## Settings + forms"; do
  grep -qF "$h" "$F" || { echo "FAIL: missing section: $h"; exit 1; }
done
# substance spot-checks (not just headings): premise verdict + decisions present
grep -qE "getOrCreateProfile" "$F" || { echo "FAIL: finish-path section must cite getOrCreateProfile sites"; exit 1; }
grep -qE "READINESS_MIN_SEEN" "$F" || { echo "FAIL: readiness section must cite READINESS_MIN_SEEN"; exit 1; }
grep -qE "DECISION:" "$F" || { echo "FAIL: sections must end with DECISION: lines"; exit 1; }
n="$(grep -cE "DECISION:" "$F" || true)"
[ "${n:-0}" -ge 4 ] || { echo "FAIL: expected >=4 DECISION lines, got $n"; exit 1; }
# read-only: no source files changed in the working tree beyond docs/ and tasks/
if git status --porcelain -- app components lib bin prisma | grep -qE '.'; then
  echo "FAIL: investigation task must not touch app/ components/ lib/ bin/ prisma/"; exit 1; fi
echo "PASS wave12b-01"
