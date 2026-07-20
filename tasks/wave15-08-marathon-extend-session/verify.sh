#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
grep -q 'extendSessionAction' app/actions/test.ts || { echo "FAIL: extendSessionAction not in app/actions/test.ts"; exit 1; }
grep -RqE 'function extendSession|extendSession = ' lib/server/ || { echo "FAIL: extendSession not in lib/server"; exit 1; }
grep -RqE 'selectMarathonPage' lib/server/ || { echo "FAIL: extendSession does not use selectMarathonPage"; exit 1; }
[ -f lib/server/marathon-extend.integration.test.ts ] || { echo "FAIL: integration file missing"; exit 1; }
shasum -a 256 -c tasks/wave15-03-preset-oracle/oracle.sha256 || { echo "FAIL: preset oracle modified"; exit 1; }
shasum -a 256 -c tasks/wave15-05-diagnostic-oracle/oracle.sha256 || { echo "FAIL: diagnostic oracle modified"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npx vitest run --config vitest.integration.config.ts lib/server/marathon-extend.integration.test.ts || { echo "FAIL: integration"; exit 1; }
npm test || { echo "FAIL: unit board"; exit 1; }
echo "OK wave15-08"
