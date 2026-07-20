#!/usr/bin/env bash
# verify.sh — readiness-trend-02-add-trend-threshold-constant
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

# 1. Constant is exported from lib/constants.ts with value 5.
grep -Eq "export const READINESS_TREND_THRESHOLD[[:space:]]*=[[:space:]]*5[[:space:]]*;" lib/constants.ts \
  || { echo "FAIL: lib/constants.ts must export 'READINESS_TREND_THRESHOLD = 5'"; exit 1; }

# 2. Function not implemented in this task — scope guard (progress.ts untouched here).
#    (Not fatal if present, but this task should not need it.) Informational only.

# 3. Typecheck clean.
npm run typecheck 2>&1 | tail -5
# 4. Tests still green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eq "Tests[[:space:]]+[0-9]+ passed" \
  || { echo "FAIL: npm test did not report passing tests"; exit 1; }

echo "PASS: READINESS_TREND_THRESHOLD exported, typecheck + tests green"
