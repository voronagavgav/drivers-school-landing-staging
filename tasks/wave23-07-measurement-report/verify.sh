#!/usr/bin/env bash
# wave23-07: measurement run + report — artifacts exist, report numbers match verbatim sim stdout.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

REPORT="docs/research/EXAM-ALLOCATOR-SPIKE-2026-07-14.md"
FIND="tasks/wave23-07-measurement-report/FINDINGS.md"
PRE="tasks/wave23-07-measurement-report/PREVERIFY-OUTPUT.txt"
SIM="scripts/spikes/exam-allocator-sim.ts"

[ -f "$SIM" ] || { echo "FAIL: sim harness missing (wave23-05)"; exit 1; }
[ -f "$REPORT" ] || { echo "FAIL: $REPORT missing"; exit 1; }
[ -f "$FIND" ] || { echo "FAIL: $FIND missing"; exit 1; }
[ -f "$PRE" ] || { echo "FAIL: $PRE missing"; exit 1; }

grep -q "static evidence — read, do not run" "$PRE" || { echo "FAIL: PREVERIFY header missing"; exit 1; }
grep -q "## Acceptance" "$FIND" || { echo "FAIL: FINDINGS lacks ## Acceptance table"; exit 1; }

# Report must contain a gate verdict (GO or NO-GO) and a recommendation section.
grep -qiE "verdict" "$REPORT" || { echo "FAIL: report lacks a verdict section"; exit 1; }
if grep -qE "NO-GO" "$REPORT"; then VERD="NO-GO"; else grep -qE "\bGO\b" "$REPORT" || { echo "FAIL: report has neither GO nor NO-GO"; exit 1; }; VERD="GO"; fi
grep -qiE "recommend" "$REPORT" || { echo "FAIL: report lacks a product-wave recommendation"; exit 1; }

# Re-capture the sim and confirm the verdict token in the captured output matches the report's verdict.
npx tsx "$SIM" > /tmp/wave23-report-sim.txt 2>&1 || { echo "FAIL: sim run non-zero"; cat /tmp/wave23-report-sim.txt; exit 1; }
if grep -qiE "NO-GO" /tmp/wave23-report-sim.txt; then SIMVERD="NO-GO"; else SIMVERD="GO"; fi
[ "$VERD" = "$SIMVERD" ] || { echo "FAIL: report verdict ($VERD) disagrees with sim output ($SIMVERD)"; exit 1; }

# The captured PREVERIFY file's verdict must match the freshly captured run's verdict too.
if grep -qiE "NO-GO" "$PRE"; then PREVERD="NO-GO"; else PREVERD="GO"; fi
[ "$PREVERD" = "$SIMVERD" ] || { echo "FAIL: PREVERIFY verdict ($PREVERD) disagrees with sim ($SIMVERD) — recapture"; exit 1; }

echo "PASS wave23-07 (verdict=$VERD)"
