#!/usr/bin/env bash
# wave20-03: honest guess floor — FSRS_GUESS_MAX declared, g capped in gradePosterior, oracle block un-skipped.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

C="lib/fsrs/constants.ts"
G="lib/fsrs/grade.ts"
O="lib/fsrs/lapse-adjust.oracle.test.ts"

grep -Eq "FSRS_GUESS_MAX[[:space:]]*=[[:space:]]*0\.45" "$C" || { echo "FAIL: FSRS_GUESS_MAX=0.45 not in $C"; exit 1; }
# The g cap is applied in gradePosterior.
grep -Eq "Math\.min\([^)]*FSRS_GUESS_MAX" "$G" || { echo "FAIL: g not capped by FSRS_GUESS_MAX in $G"; exit 1; }
# Default (absent optionCount) path unchanged.
grep -q "FSRS_GUESS_DEFAULT" "$G" || { echo "FAIL: default guess floor path removed from $G"; exit 1; }

# The gradePosterior oracle block is un-skipped; the lapse-adjust block may still be skipped (task 04).
if grep -Eq 'describe\.skip\([^)]*gradePosterior' "$O"; then
  echo "FAIL: gradePosterior oracle block still skipped in $O"; exit 1
fi

npm run -s typecheck
npm run -s test

echo "PASS: wave20-03"
