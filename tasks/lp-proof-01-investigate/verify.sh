#!/usr/bin/env bash
# lp-proof-01 verify — investigation deliverable is a readable FINDINGS.md with all anchors,
# and this task touched no source. Static evidence the evaluator can READ.
set -euo pipefail
cd "$(dirname "$0")/../.."

F=tasks/lp-proof-01-investigate/FINDINGS.md
[ -f "$F" ] || { echo "FAIL: FINDINGS.md missing"; exit 1; }

# Required factual anchors (each must be present as substance, not just a heading).
req=(
  "proof-grid"          # current markup class named
  "proof-cell"
  "proof.stats"         # copy key shape referenced
  "BANK_B_FMT"          # the three constants
  "IMG_FMT"
  "SECTIONS"
  "1 757"               # verbatim figures
  "986"
  "45"
  "funnel-donot-guard"  # guard scope finding
  "FUNNEL_FILES"
  "/lp/v36"             # route
  "DRIVER_BROWSER_CMD"  # browser convention
  "set viewport"
)
for tok in "${req[@]}"; do
  grep -qF "$tok" "$F" || { echo "FAIL: FINDINGS.md missing anchor: $tok"; exit 1; }
done

# The external-consumer finding must explicitly state v6/v8 have their own copy (NONE share v36's).
grep -qiE "v6|v8" "$F" || { echo "FAIL: FINDINGS.md must document the v6/v8 separate-copy finding"; exit 1; }

# This task must not have modified any source file (only its own task dir).
DIRTY="$(git status --porcelain -- app lib components scripts bin 2>/dev/null || true)"
if [ -n "$DIRTY" ]; then
  echo "FAIL: investigation task modified source files:"; echo "$DIRTY"; exit 1
fi

echo "OK lp-proof-01"
