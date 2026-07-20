#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
RP='app/(app)/test/[id]/result/page.tsx'
grep -q 'weakestTopicFromAnswers' lib/test-engine/diagnostic.ts || { echo "FAIL: helper missing"; exit 1; }
[ -f lib/test-engine/diagnostic-finish.test.ts ] || { echo "FAIL: unit test file missing"; exit 1; }
shasum -a 256 -c tasks/wave15-03-preset-oracle/oracle.sha256 || { echo "FAIL: preset oracle modified"; exit 1; }
shasum -a 256 -c tasks/wave15-05-diagnostic-oracle/oracle.sha256 || { echo "FAIL: diagnostic oracle modified"; exit 1; }
grep -Eq 'ReadinessDial|readiness-dial' "$RP" || { echo "FAIL: result page does not reuse the dial"; exit 1; }
grep -qF -e 'sufficientData={true}' "$RP" && { echo "FAIL: hardcoded sufficientData"; exit 1; }
grep -q 'DIAGNOSTIC' "$RP" || { echo "FAIL: no diagnostic branch on result page"; exit 1; }
grep -q 'diagnostic_completed' lib/server/test-engine.ts || { echo "FAIL: diagnostic_completed not recorded at finish"; exit 1; }
[ -f lib/server/diagnostic-finish.integration.test.ts ] || { echo "FAIL: integration file missing"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npx vitest run lib/test-engine/diagnostic-finish.test.ts || { echo "FAIL: helper unit vectors"; exit 1; }
npx vitest run --config vitest.integration.config.ts lib/server/diagnostic-finish.integration.test.ts || { echo "FAIL: integration"; exit 1; }
npm test || { echo "FAIL: unit board"; exit 1; }
echo "OK wave15-14"
