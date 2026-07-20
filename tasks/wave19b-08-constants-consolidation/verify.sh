#!/usr/bin/env bash
# wave19b-08 — single source for the READINESS_MIN threshold (no dangling independent literal).
set -euo pipefail
cd "$(dirname "$0")/../.."

# There must be exactly ONE literal `= 20` source for the readiness-min threshold: READINESS_MIN_SEEN.
grep -Eq "READINESS_MIN_SEEN *= *20" lib/constants.ts || { echo "FAIL: READINESS_MIN_SEEN=20 source missing"; exit 1; }

# READINESS_MIN_ANSWERS must NOT be a second independent `= 20` literal. Allowed: removed entirely, OR aliased
# to READINESS_MIN_SEEN on a single line.
if grep -Eq "READINESS_MIN_ANSWERS *= *20" lib/constants.ts; then
  echo "FAIL: READINESS_MIN_ANSWERS is still an independent = 20 literal (redundancy not consolidated)"; exit 1
fi

# Any surviving READINESS_MIN_ANSWERS reference must be the single alias definition only.
STRAY="$(grep -rn "READINESS_MIN_ANSWERS" lib app components --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v "READINESS_MIN_ANSWERS *= *READINESS_MIN_SEEN" || true)"
if [ -n "$STRAY" ]; then
  # references are only OK if the symbol still exists as an alias; if it was removed there must be NONE.
  if grep -Eq "READINESS_MIN_ANSWERS *= *READINESS_MIN_SEEN" lib/constants.ts; then
    :  # aliased — stray references to the alias are fine
  else
    echo "FAIL: READINESS_MIN_ANSWERS removed but still referenced:"; echo "$STRAY"; exit 1
  fi
fi

npm run -s typecheck
npm run -s test
npm run -s test:integration
echo "PASS wave19b-08"
