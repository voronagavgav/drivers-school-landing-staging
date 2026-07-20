#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
grep -q 'winbackEligible' lib/nudge-policy.ts || { echo "FAIL: winbackEligible missing"; exit 1; }
grep -q 'RETAKE_WINBACK' lib/nudge-policy.ts || { echo "FAIL: decideNudge does not know RETAKE_WINBACK"; exit 1; }
UT="$(grep -rl 'winbackEligible' lib --include='*.test.ts' | grep -v integration | head -1 || true)"
[ -n "$UT" ] || { echo "FAIL: no unit test for winbackEligible"; exit 1; }
# Frozen-vector binding literals (incl. both timezone-killer vectors)
for lit in '2026-07-01T06:00:00.000Z' '2026-07-09T07:00:00.000Z' '2026-07-10T21:30:00.000Z' '2026-07-08T21:30:00.000Z' 'PASSED'; do
  grep -q "$lit" "$UT" || { echo "FAIL: frozen vector literal missing from unit test: $lit"; exit 1; }
done
# One-shot exclusion lives server-side
grep -q 'RETAKE_WINBACK' lib/server/nudges.ts || { echo "FAIL: server wiring missing"; exit 1; }
grep -q 'examOutcomeReportedAt' lib/server/nudges.ts || { echo "FAIL: one-shot exclusion not keyed on examOutcomeReportedAt"; exit 1; }
# Copy + lawyer flag
grep -q '10 днів майже минули' components/nudge-card.tsx || { echo "FAIL: winback copy missing"; exit 1; }
grep -q 'COPY-PENDING-L4' components/nudge-card.tsx || { echo "FAIL: COPY-PENDING-L4 marker missing"; exit 1; }
# Nudges never consult entitlements
if grep -En 'lib/entitlements|lib/server/entitlements' lib/nudge-policy.ts lib/server/nudges.ts; then
  echo "FAIL: nudge path imports entitlement gate"; exit 1
fi
IT=lib/server/winback-nudge.integration.test.ts
[ -f "$IT" ] || { echo "FAIL: $IT missing"; exit 1; }
grep -q 'computeDueNudges' "$IT" || { echo "FAIL: integration test bypasses computeDueNudges"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "OK wave16-11"
