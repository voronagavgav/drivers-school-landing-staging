#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
L=lib/server/anon-session.ts
[ -f "$L" ] || { echo "FAIL: $L missing"; exit 1; }
for fn in getOrCreateAnonUser getAnonUser requirePlayableUser getAnonPlayCookieName; do
  grep -q "$fn" "$L" || { echo "FAIL: export $fn missing"; exit 1; }
done
grep -q 'ds_anon_play' "$L" || { echo "FAIL: distinct anon-play cookie name missing"; exit 1; }
grep -q 'isValueFirstFunnelEnabled' "$L" || { echo "FAIL: resolver must consult the funnel flag"; exit 1; }
grep -q '^import "server-only"' "$L" || { echo "FAIL: anon-session must be server-only"; exit 1; }
# integration test collected
T=lib/server/anon-session.integration.test.ts
[ -f "$T" ] || { echo "FAIL: integration test missing"; exit 1; }
grep -q 'isAnonymous' "$T" || { echo "FAIL: test must assert isAnonymous minting"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "PASS: wave17-03 anon-session lib"
