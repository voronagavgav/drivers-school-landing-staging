#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/constants.ts

grep -Eq 'READINESS_TOPIC_CORRELATION_ESTIMATION[[:space:]]*=[[:space:]]*0\.3' "$F" \
  || { echo "FAIL: READINESS_TOPIC_CORRELATION_ESTIMATION = 0.3 missing"; exit 1; }

grep -Eq 'READINESS_ESTIMATION_TIER' "$F" \
  || { echo "FAIL: READINESS_ESTIMATION_TIER missing"; exit 1; }
grep -Eq '"mean"' "$F" \
  || { echo "FAIL: tier default \"mean\" missing"; exit 1; }

grep -Eq 'READINESS_ESTIMATION_QUANTILE_ALPHA[[:space:]]*=[[:space:]]*0\.2' "$F" \
  || { echo "FAIL: READINESS_ESTIMATION_QUANTILE_ALPHA = 0.2 missing"; exit 1; }

# draw-side constant must stay 0 and present
grep -Eq 'READINESS_TOPIC_CORRELATION[[:space:]]*=[[:space:]]*0([^.]|$)' "$F" \
  || { echo "FAIL: draw-side READINESS_TOPIC_CORRELATION must remain = 0"; exit 1; }

npm run -s typecheck
npm test

echo "PASS wave19c-02"
