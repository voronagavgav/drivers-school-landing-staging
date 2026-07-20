#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
for m in QUICK MARATHON SIGN_TRAINER DIAGNOSTIC; do
  grep -qE -e "\"$m\"" lib/server/test-engine.ts lib/server/study.ts || { echo "FAIL: no server branch for $m"; exit 1; }
done
grep -RqE 'selectDiagnostic' lib/server/ || { echo "FAIL: server never calls selectDiagnostic"; exit 1; }
grep -RqE 'selectQuickQueue|selectSignTrainerQueue|selectMarathonPage' lib/server/ || { echo "FAIL: server never calls the presets"; exit 1; }
shasum -a 256 -c tasks/wave15-03-preset-oracle/oracle.sha256 || { echo "FAIL: preset oracle modified"; exit 1; }
shasum -a 256 -c tasks/wave15-05-diagnostic-oracle/oracle.sha256 || { echo "FAIL: diagnostic oracle modified"; exit 1; }
[ -f lib/server/practice-modes.integration.test.ts ] || { echo "FAIL: integration file missing"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npx vitest run --config vitest.integration.config.ts lib/server/practice-modes.integration.test.ts || { echo "FAIL: integration"; exit 1; }
npm test || { echo "FAIL: unit board"; exit 1; }
echo "OK wave15-07"
