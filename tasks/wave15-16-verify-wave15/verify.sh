#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit"; exit 1; }
npm run db:seed || { echo "FAIL: seed"; exit 1; }
npm run test:integration || { echo "FAIL: integration (triage ownership before fixing!)"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
shasum -a 256 -c tasks/wave15-03-preset-oracle/oracle.sha256 || { echo "FAIL: preset oracle drifted"; exit 1; }
shasum -a 256 -c tasks/wave15-05-diagnostic-oracle/oracle.sha256 || { echo "FAIL: diagnostic oracle drifted"; exit 1; }
for k in 'QUICK_COUNT = 10' 'QUICK_NEW_BUDGET = 4' 'QUICK_SOFT_TIME_SEC = 300' 'MARATHON_PAGE = 20' 'SIGN_TRAINER_COUNT = 20' 'SIGN_TRAINER_NEW_BUDGET = 8' 'DIAGNOSTIC_COUNT = 15'; do
  grep -qF -e "$k" lib/constants.ts || { echo "FAIL: constant drifted: $k"; exit 1; }
done
grep -qF -e 'value="DIAGNOSTIC"' 'app/(app)/practice/page.tsx' && { echo "FAIL: DIAGNOSTIC leaked onto /practice"; exit 1; }
# audit LAST — requires the :3100 server RESTARTED on the build from step 5 (stale-server trap)
npm run audit:browser || { echo "FAIL: browser audit (restart :3100 on the fresh build first)"; exit 1; }
echo "OK wave15-16 — board green"
