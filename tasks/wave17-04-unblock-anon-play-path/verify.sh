#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
A=app/actions/test.ts
grep -q 'requirePlayableUser' "$A" || { echo "FAIL: test actions do not use requirePlayableUser"; exit 1; }
# layout consults the flag
grep -q 'isValueFirstFunnelEnabled' "app/(app)/layout.tsx" || { echo "FAIL: layout not flag-aware"; exit 1; }
# integration test present + collected
T=lib/server/anon-play.integration.test.ts
[ -f "$T" ] || { echo "FAIL: anon-play integration test missing"; exit 1; }
grep -q 'startTestAction' "$T" || { echo "FAIL: test must drive the REAL startTestAction"; exit 1; }
grep -q 'isAnonymous' "$T" || { echo "FAIL: test must assert anon session ownership"; exit 1; }
LIST="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$LIST" | grep -q 'anon-play' || { echo "FAIL: anon-play test not collected"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
echo "PASS: wave17-04 unblock anon play path"
