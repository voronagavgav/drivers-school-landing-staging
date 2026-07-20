#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/server/mastery-readiness.ts

grep -Eq 'correctBlockMeanProb' "$F" || { echo "FAIL: recomputeReadiness must call correctBlockMeanProb"; exit 1; }
grep -Eq 'READINESS_TOPIC_CORRELATION_ESTIMATION' "$F" || { echo "FAIL: estimation ρ constant not used"; exit 1; }
grep -Eq 'READINESS_ESTIMATION_TIER' "$F" || { echo "FAIL: tier constant not used"; exit 1; }

# draw-side must stay off: topicCorrelation passed as 0 (literal or the =0 constant)
grep -Eq 'topicCorrelation:[[:space:]]*(0|READINESS_TOPIC_CORRELATION)([^_]|$)' "$F" \
  || { echo "FAIL: computeReadiness must be called with topicCorrelation 0 (draw-side dead)"; exit 1; }

# honesty regression untouched by this task
git diff --name-only HEAD -- lib/readiness-honesty.regression.test.ts | grep -q . \
  && { echo "FAIL: honesty regression test must not be edited"; exit 1; } || true

npm run -s typecheck
npm test
npm run db:seed
npm run test:integration

echo "PASS wave19c-07"
