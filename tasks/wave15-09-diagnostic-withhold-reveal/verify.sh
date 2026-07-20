#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
grep -q 'DIAGNOSTIC' lib/server/test-engine.ts || { echo "FAIL: no DIAGNOSTIC gate in test-engine.ts"; exit 1; }
[ -f lib/server/diagnostic-withhold.integration.test.ts ] || { echo "FAIL: integration file missing"; exit 1; }
grep -q 'isCorrect' lib/server/diagnostic-withhold.integration.test.ts || { echo "FAIL: test never asserts on isCorrect"; exit 1; }
grep -Eq 'ReviewState|reviewState' lib/server/diagnostic-withhold.integration.test.ts || { echo "FAIL: test never asserts ReviewState seeding"; exit 1; }
shasum -a 256 -c tasks/wave15-03-preset-oracle/oracle.sha256 || { echo "FAIL: preset oracle modified"; exit 1; }
shasum -a 256 -c tasks/wave15-05-diagnostic-oracle/oracle.sha256 || { echo "FAIL: diagnostic oracle modified"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npx vitest run --config vitest.integration.config.ts lib/server/diagnostic-withhold.integration.test.ts || { echo "FAIL: integration"; exit 1; }
npm test || { echo "FAIL: unit board"; exit 1; }
echo "OK wave15-09"
