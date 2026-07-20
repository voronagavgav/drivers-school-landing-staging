#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
S=lib/test-engine/presets.ts
shasum -a 256 -c tasks/wave15-03-preset-oracle/oracle.sha256 || { echo "FAIL: frozen oracle was modified"; exit 1; }
grep -q 'selectReviewQueue' "$S" || { echo "FAIL: presets.ts does not delegate to selectReviewQueue"; exit 1; }
grep -Eq 'QUICK_COUNT|QUICK_NEW_BUDGET' "$S" || { echo "FAIL: presets.ts does not use preset constants"; exit 1; }
if grep -En 'server-only|@/lib/db|lib/generated|Math\.random|Date\.now|new Date\(' "$S"; then
  echo "FAIL: forbidden token in presets.ts"; exit 1
fi
git diff --name-only | grep -q 'lib/test-engine/queue\.ts' && { echo "FAIL: queue.ts was modified"; exit 1; }
npx vitest run lib/test-engine/presets.test.ts || { echo "FAIL: oracle red"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit board"; exit 1; }
echo "OK wave15-04"
