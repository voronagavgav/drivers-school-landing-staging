#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
S=lib/entitlements.ts
SRV=lib/server/entitlements.ts
IT=lib/server/entitlements.integration.test.ts
[ -f "$SRV" ] || { echo "FAIL: $SRV missing"; exit 1; }
[ -f "$IT" ] || { echo "FAIL: $IT missing"; exit 1; }
if grep -q 'NOT_IMPLEMENTED_WAVE16_05' "$S"; then echo "FAIL: stub not implemented"; exit 1; fi
# Oracle unchanged (anti self-grading)
shasum -a 256 -c tasks/wave16-04-entitlements-oracle/oracle.sha256 || { echo "FAIL: oracle test file was edited"; exit 1; }
# Purity of the pure core
if grep -En 'server-only|@/lib/db|lib/generated|Math\.random|Date\.now|new Date\(' "$S"; then
  echo "FAIL: forbidden token in lib/entitlements.ts"; exit 1
fi
grep -q 'server-only' "$SRV" || { echo "FAIL: server module missing server-only marker"; exit 1; }
grep -q 'ENTITLEMENT_REQUIRED' "$SRV" || { echo "FAIL: typed error code missing"; exit 1; }
grep -q 'requireIntelligenceAccess' "$SRV" || { echo "FAIL: requireIntelligenceAccess missing"; exit 1; }
grep -q 'checkIntelligenceAccess' "$SRV" || { echo "FAIL: checkIntelligenceAccess missing"; exit 1; }
grep -q 'ENTITLEMENT_REQUIRED' "$IT" || { echo "FAIL: integration test never asserts the typed error"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npx vitest run lib/entitlements.test.ts || { echo "FAIL: oracle not green"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "OK wave16-05"
