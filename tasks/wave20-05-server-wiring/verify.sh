#!/usr/bin/env bash
# wave20-05: server wiring — optionCount threaded, wrong routed through slipAdjustedLapse, engine tag bumped.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

S="lib/server/study.ts"
T="lib/server/test-engine.ts"
C="lib/fsrs/constants.ts"
P="lib/server/srs-review.integration.test.ts"

# optionCount threaded on the params + fed from the loaded options.
grep -q "optionCount" "$S" || { echo "FAIL: optionCount not threaded in $S"; exit 1; }
grep -Eq "optionCount:\s*question\.options\.length" "$T" || { echo "FAIL: submitAnswer does not pass question.options.length"; exit 1; }
# Wrong answers routed through the pure lapse layer.
grep -q "slipAdjustedLapse" "$S" || { echo "FAIL: recordReview does not call slipAdjustedLapse"; exit 1; }
# Engine tag bumped in constants AND the integration pin updated consciously.
grep -q '"fsrs6-bkt2"' "$C" || { echo "FAIL: REVIEW_ENGINE_VERSION not bumped to fsrs6-bkt2 in $C"; exit 1; }
grep -q '"fsrs6-bkt2"' "$P" || { echo "FAIL: integration pin in $P not updated to fsrs6-bkt2"; exit 1; }
grep -q '"fsrs6-bkt1"' "$P" && { echo "FAIL: stale fsrs6-bkt1 pin still present in $P"; exit 1; } || true

npm run -s typecheck
npm run -s test

npm run -s db:seed
npm run -s test:integration   # script already pins --config vitest.integration.config.ts

echo "PASS: wave20-05"
