#!/usr/bin/env bash
# wave14-07 — nightly calibrationSlope refresh feeding the readiness discount.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

S=lib/server/calibration.ts
N=scripts/nightly-readiness.ts
grep -qF "refreshCalibrationSlope" "$S" || { echo "FAIL: refreshCalibrationSlope not exported"; exit 1; }
grep -qF "refreshCalibrationSlope" "$N" || { echo "FAIL: nightly script must call refreshCalibrationSlope"; exit 1; }

# slope refresh runs BEFORE recomputeReadiness in the per-user loop (first-mention order)
a="$(grep -n 'refreshCalibrationSlope' "$N" | head -1 | cut -d: -f1)"
b="$(grep -n 'recomputeReadiness' "$N" | grep -v import | head -1 | cut -d: -f1)"
[ -n "$a" ] && [ -n "$b" ] && [ "$a" -lt "$b" ] || { echo "FAIL: slope refresh must precede recomputeReadiness ($a vs $b)"; exit 1; }

# frozen oracle protected
if ! git diff --quiet HEAD -- lib/calibration.test.ts 2>/dev/null; then
  echo "FAIL: lib/calibration.test.ts modified — frozen oracle"; exit 1
fi

# clamp oracle literal (0.6) asserted in the integration test
grep -qF "0.6" lib/server/calibration.integration.test.ts || { echo "FAIL: 0.6 clamp literal missing from integration test"; exit 1; }
grep -qF "refreshCalibrationSlope" lib/server/calibration.integration.test.ts || { echo "FAIL: slope refresh untested"; exit 1; }
grep -qF "recomputeReadiness" lib/server/calibration.integration.test.ts || { echo "FAIL: production-path snapshot assertion (3d) missing"; exit 1; }

m="$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[ "$m" = "9" ] || { echo "FAIL: migration dir count $m != 9"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }

# the nightly script itself still runs green end-to-end against the dev DB
npx tsx --conditions=react-server scripts/nightly-readiness.ts || { echo "FAIL: nightly script errored"; exit 1; }
echo "PASS wave14-07"
