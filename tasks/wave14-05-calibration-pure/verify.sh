#!/usr/bin/env bash
# wave14-05 — pure calibration math + frozen golden vectors (planner-pinned 2026-07-02).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F=lib/calibration.ts
T=lib/calibration.test.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

for tok in CALIBRATION_MIN_SAMPLES CALIBRATION_EXPECTED_ACCURACY CALIBRATION_SLOPE_MIN CALIBRATION_OVERCONFIDENT_BELOW CALIBRATION_UNDERCONFIDENT_ABOVE; do
  grep -qF "$tok" lib/constants.ts || { echo "FAIL: lib/constants.ts missing $tok"; exit 1; }
done
grep -qF "CALIBRATION_MIN_SAMPLES = 20" lib/constants.ts || { echo "FAIL: CALIBRATION_MIN_SAMPLES must be 20"; exit 1; }
grep -qF "CALIBRATION_SLOPE_MIN = 0.6" lib/constants.ts || { echo "FAIL: CALIBRATION_SLOPE_MIN must be 0.6"; exit 1; }

grep -qF "export function computeCalibration" "$F" || { echo "FAIL: computeCalibration not exported"; exit 1; }

# purity (whole-file safe: no documented injectable defaults in this module)
if grep -nE 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date\(' "$F"; then
  echo "FAIL: purity violation in $F"; exit 1
fi

# frozen oracle literals must appear in the test file (hand-computed at plan time)
grep -qF "12.75" "$T" || { echo "FAIL: G1 expectedCorrect literal 12.75 missing"; exit 1; }
grep -qE '10 */ *11' "$T" || { echo "FAIL: G1 highConfidenceAccuracy literal 10/11 missing"; exit 1; }
grep -qF "0.35" "$T" || { echo "FAIL: G2 overconfident literal 0.35 missing"; exit 1; }
grep -qF "0.7843" "$T" || { echo "FAIL: G6 mid-range slope literal 0.7843 missing"; exit 1; }
grep -qF '"overconfident"' "$T" || { echo "FAIL: overconfident verdict vector missing"; exit 1; }
grep -qF '"underconfident"' "$T" || { echo "FAIL: underconfident verdict vector missing"; exit 1; }
grep -qF '"calibrated"' "$T" || { echo "FAIL: calibrated verdict vector missing"; exit 1; }
grep -qF "sampled: 19" "$T" || { echo "FAIL: insufficient-at-19 vector missing"; exit 1; }

x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -q "calibration.test.ts" || { echo "FAIL: calibration.test.ts not in vitest list"; exit 1; }

m="$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[ "$m" = "9" ] || { echo "FAIL: migration dir count $m != 9"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
echo "PASS wave14-05"
