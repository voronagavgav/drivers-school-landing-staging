#!/usr/bin/env bash
# verify.sh — wave18-06: checkout self-grant is adversarially exercised.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

T="lib/server/checkout.integration.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

# 1. the new case injects a userId (and tier) via FormData — proves it is ignored.
grep -qE '\.set\("userId"' "$T" || { echo "FAIL: no self-grant case injecting formData userId"; exit 1; }
grep -qE 'victim|injected|selfGrant|self-grant' "$T" || { echo "FAIL: no adversarial self-grant case marker"; exit 1; }

# 2. production checkout action unchanged (test-only task).
git diff --quiet -- app/actions/checkout.ts || { echo "FAIL: app/actions/checkout.ts must NOT change"; exit 1; }

# 3. typecheck + unit + the checkout suite.
npx tsc --noEmit
npm test
npx vitest run --config vitest.integration.config.ts "$T"

echo "PASS: wave18-06"
