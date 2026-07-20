#!/usr/bin/env bash
# verify.sh — wave18-05: checkout test (e) proves THIS call writes (non-vacuous).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

T="lib/server/checkout.integration.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

# 1. case (e) no longer relies on the shared buyer's pre-existing grant: it either uses a fresh user
#    OR clears the entitlement before the ENTITLEMENTS-off runCheckout. Require one of the two markers.
grep -qE "deleteMany\(\{ where: \{ userId|entitlement.deleteMany|freshId|noPriorId|fresh(User|Buyer)" "$T" \
  || { echo "FAIL: case (e) still depends on a pre-existing grant (no fresh-user / delete-before marker)"; exit 1; }

# 2. production checkout action unchanged (test-only task).
git diff --quiet -- app/actions/checkout.ts || { echo "FAIL: app/actions/checkout.ts must NOT change"; exit 1; }

# 3. typecheck + unit + the checkout suite.
npx tsc --noEmit
npm test
npx vitest run --config vitest.integration.config.ts "$T"

echo "PASS: wave18-05"
