#!/usr/bin/env bash
# wave19d-08: live recompute routes through the release model; inputsJson audit; honesty gate untouched.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

MR="lib/server/mastery-readiness.ts"

# Live path now uses the release model, not the 19c per-block shrink for the persisted dial.
grep -q 'readiness-release' "$MR" || { echo "FAIL: recompute does not import the release model"; exit 1; }
grep -q 'lm-gh1' "$MR" || { echo "FAIL: inputsJson model key \"lm-gh1\" not recorded in recompute"; exit 1; }
# dialIndep audit field kept.
grep -q 'dialIndep' "$MR" || { echo "FAIL: dialIndep audit field dropped"; exit 1; }

# Honesty-regression gate BYTE-UNTOUCHED vs HEAD, and draw-side rho still 0.
if ! git diff --quiet HEAD -- lib/readiness-honesty.regression.test.ts; then
  echo "FAIL: lib/readiness-honesty.regression.test.ts must stay byte-untouched"; exit 1
fi
grep -qE 'READINESS_TOPIC_CORRELATION\s*=\s*0' lib/constants.ts \
  || { echo "FAIL: draw-side READINESS_TOPIC_CORRELATION must stay 0"; exit 1; }

npm run -s typecheck
npm run -s test          # unit set incl. the honesty regression gate

# The stale 19c integration test is temporarily suspended here (task 09 rewrites it).
grep -qE 'describe\.skip' lib/server/readiness-estimation.integration.test.ts \
  || { echo "FAIL: stale 19c integration test must be describe.skip'd until task 09 rewrites it"; exit 1; }

# Reseed then run this task's own live proofs + the blueprint suite (production path via recomputeReadiness).
npm run -s db:seed
npx vitest run -c vitest.integration.config.ts \
  lib/server/readiness-release.integration.test.ts \
  lib/server/exam-blueprint.integration.test.ts

echo "PASS: wave19d-08"
