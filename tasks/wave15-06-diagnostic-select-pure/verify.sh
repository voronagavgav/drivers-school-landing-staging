#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
S=lib/test-engine/diagnostic.ts
shasum -a 256 -c tasks/wave15-05-diagnostic-oracle/oracle.sha256 || { echo "FAIL: frozen oracle modified"; exit 1; }
grep -q 'groupCandidatesByBlock' "$S" || { echo "FAIL: does not reuse groupCandidatesByBlock"; exit 1; }
grep -q 'DIAGNOSTIC_COUNT' "$S" || { echo "FAIL: count default not from DIAGNOSTIC_COUNT"; exit 1; }
if grep -En 'server-only|@/lib/db|lib/generated|Math\.random|Date\.now|new Date\(' "$S"; then
  echo "FAIL: forbidden token in diagnostic.ts"; exit 1
fi
git diff --name-only | grep -Eq 'lib/exam-blueprint\.ts|lib/test-engine/queue\.ts' && { echo "FAIL: touched frozen machinery"; exit 1; }
npx vitest run lib/test-engine/diagnostic.test.ts || { echo "FAIL: oracle red"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit board"; exit 1; }
echo "OK wave15-06"
