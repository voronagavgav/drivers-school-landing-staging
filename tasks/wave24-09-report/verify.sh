#!/usr/bin/env bash
# wave24-09: the weight-fit harness report — numbers traceable to the committed validation results.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

REPORT="docs/research/WEIGHTFIT-HARNESS-2026-07-14.md"
RES="tasks/wave24-08-validation-run/VALIDATION-RESULTS.json"
PY="scripts/fsrs-fit/.venv/bin/python"
[ -x "$PY" ] || PY="python3"

[ -f "$REPORT" ] || { echo "FAIL: $REPORT missing"; exit 1; }
[ -f "$RES" ]    || { echo "FAIL: $RES missing (wave24-08 must be done)"; exit 1; }

# 3-6. Required sections/anchors.
grep -Eqi "review.count|200|2000" "$REPORT" || { echo "FAIL: review-count curve rows missing"; exit 1; }
grep -Eqi "data.gate" "$REPORT" || { echo "FAIL: data-gate section missing"; exit 1; }
grep -Eqi "future|data-gated|does not change live|no live scheduling" "$REPORT" \
  || { echo "FAIL: future/data-gated live-scheduling caveat missing"; exit 1; }
grep -Eqi "independen" "$REPORT" || { echo "FAIL: generator/fitter independence claim missing"; exit 1; }
grep -qF "BEYOND-CURRENT-RESEARCH-2026-07-13.md" "$REPORT" || { echo "FAIL: source signal not cited"; exit 1; }
grep -Eqi "same-day|refuted" "$REPORT" || { echo "FAIL: refuted-claim note missing"; exit 1; }

# 2. Headline numbers traceable to the committed results (verbatim, to printed precision).
FW20="$("$PY" -c "import json;print(f\"{json.load(open('$RES'))['recovery']['fitted_w20']:.4f}\")")"
grep -qF "$FW20" "$REPORT" || { echo "FAIL: fitted_w20 ($FW20) not present in report"; exit 1; }

echo "PASS wave24-09"
