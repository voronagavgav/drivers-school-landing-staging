#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
S=lib/entitlements.ts
T=lib/entitlements.test.ts
[ -f "$S" ] || { echo "FAIL: $S missing"; exit 1; }
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -q 'NOT_IMPLEMENTED_WAVE16_05' "$S" || { echo "FAIL: stub must throw NOT_IMPLEMENTED_WAVE16_05"; exit 1; }
grep -q 'hasIntelligenceAccess' "$S" || { echo "FAIL: stub missing hasIntelligenceAccess"; exit 1; }
grep -q 'isEntitlementsEnabled' "$S" || { echo "FAIL: stub missing isEntitlementsEnabled"; exit 1; }
# Purity of the pure core (source file only)
if grep -En 'server-only|@/lib/db|lib/generated|Math\.random|Date\.now|new Date\(' "$S"; then
  echo "FAIL: forbidden token in lib/entitlements.ts"; exit 1
fi
# Binding literals from the frozen vectors must appear in the oracle
for lit in 'hasIntelligenceAccess' 'isEntitlementsEnabled' '2026-09-01T00:00:00.000Z' '2026-07-04T11:59:59.000Z' 'EXAM_ACCESS' 'GOLD' 'stubEnv'; do
  grep -q "$lit" "$T" || { echo "FAIL: oracle missing binding literal: $lit"; exit 1; }
done
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
if npx vitest run lib/entitlements.test.ts >/dev/null 2>&1; then
  echo "FAIL: oracle GREEN against stub — does not bind"; exit 1
fi
shasum -a 256 "$T" > tasks/wave16-04-entitlements-oracle/oracle.sha256
echo "OK wave16-04 (oracle frozen, red against stub)"
