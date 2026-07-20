#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/server/mastery-readiness.ts

# new audit keys present in the inputsJson object
for key in rhoEst tier nEff dialIndep; do
  grep -Eq "\b$key\b" "$F" || { echo "FAIL: inputsJson key $key missing from $F"; exit 1; }
done
# existing keys preserved (append-only)
for key in sufficientData seenCount rho engine calibratorId; do
  grep -Eq "\b$key\b" "$F" || { echo "FAIL: existing inputsJson key $key removed (must be append-only)"; exit 1; }
done
# dialIndep must come from an uncorrected/raw computeReadiness (effectiveN used for nEff)
grep -Eq 'effectiveN' "$F" || { echo "FAIL: per-block nEff must use effectiveN"; exit 1; }

npm run -s typecheck
npm test
npm run db:seed
npm run test:integration

echo "PASS wave19c-08"
