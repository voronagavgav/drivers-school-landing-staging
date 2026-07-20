#!/usr/bin/env bash
# wave10f-03 verify: curve constants hardcoded + docs honesty.
set -euo pipefail
cd "$(dirname "$0")/../.."

# FSRS_FACTOR is the literal 19/81 and FSRS_DECAY the literal -0.5 (not derived from target retention).
grep -Eq "FSRS_FACTOR\s*=\s*19\s*/\s*81" lib/fsrs/retrievability.ts \
  || { echo "FAIL: FSRS_FACTOR must be literal 19 / 81"; exit 1; }
grep -Eq "FSRS_DECAY\s*=\s*-0\.5" lib/fsrs/retrievability.ts \
  || { echo "FAIL: FSRS_DECAY must be literal -0.5"; exit 1; }
if grep -q "Math.pow(FSRS_TARGET_RETENTION" lib/fsrs/retrievability.ts; then
  echo "FAIL: FSRS_FACTOR still derived from target retention"; exit 1
fi

# Docs honesty: enable_short_term stated in constants.ts.
grep -q "enable_short_term" lib/fsrs/constants.ts || { echo "FAIL: constants.ts must state enable_short_term"; exit 1; }

# A decoupling test exists and is collected.
x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -Eq "retrievability|curve|decoupl" || { echo "FAIL: no curve-constant test collected"; exit 1; }

npm test
npm run typecheck
echo "PASS wave10f-03"
