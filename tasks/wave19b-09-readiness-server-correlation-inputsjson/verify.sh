#!/usr/bin/env bash
# wave19b-09 — ρ wired into the live dial + inputsJson audit tag + admin read-only correlation summary.
set -euo pipefail
cd "$(dirname "$0")/../.."

M=lib/server/mastery-readiness.ts
grep -Eq "topicCorrelation" "$M" || { echo "FAIL: recomputeReadiness does not pass topicCorrelation"; exit 1; }
grep -Eq "READINESS_TOPIC_CORRELATION" "$M" || { echo "FAIL: recomputeReadiness does not use the ρ constant"; exit 1; }
# inputsJson audit fields.
grep -Eq "rho" "$M" || { echo "FAIL: inputsJson missing rho"; exit 1; }
grep -Eq "fsrs6" "$M" || { echo "FAIL: inputsJson missing engine version tag fsrs6"; exit 1; }

# Admin read-only correlation summary wired.
grep -Eq "measureTopicCorrelation" app/admin/calibration/page.tsx || { echo "FAIL: admin calibration page does not use measureTopicCorrelation"; exit 1; }

npm run -s typecheck
npm run -s test

# Reseed then integration; the production-path suite asserts rho recorded + dial lowered.
npm run -s db:seed
npm run -s test:integration

echo "PASS wave19b-09"
