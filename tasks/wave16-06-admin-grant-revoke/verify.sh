#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# Anchor on the DEFINITION (not any mention) so a client form that imports the action
# by name (house convention) can't be picked by head -1 over an unsorted recursive grep.
ACT="$(grep -rlE 'export async function grantEntitlement' app/admin --include='*.ts' --include='*.tsx' | head -1 || true)"
[ -n "$ACT" ] || { echo "FAIL: grantEntitlement action not found under app/admin"; exit 1; }
grep -q 'revokeEntitlement' "$ACT" || { echo "FAIL: revokeEntitlement missing in $ACT"; exit 1; }
grep -q 'requireContentManager' "$ACT" || { echo "FAIL: actions not RBAC-guarded"; exit 1; }
grep -qE 'ENTITLEMENT_TIERS' lib/validation.ts || { echo "FAIL: zod schema not tied to ENTITLEMENT_TIERS in lib/validation.ts"; exit 1; }
IT="$(grep -rl 'grantEntitlement' lib/server --include='*.integration.test.ts' | head -1 || true)"
[ -n "$IT" ] || { echo "FAIL: no integration test drives the real grant action"; exit 1; }
grep -q 'revokeEntitlement' "$IT" || { echo "FAIL: revoke path untested"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "OK wave16-06"
