#!/usr/bin/env bash
# verify.sh — wave18-04: /pricing re-asserts its own auth.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="app/(app)/pricing/page.tsx"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# 1. explicit requireUser guard on the page.
grep -qE 'requireUser' "$F" || { echo "FAIL: /pricing page does not call requireUser"; exit 1; }
grep -qE 'from "@/lib/rbac"' "$F" || { echo "FAIL: requireUser not imported from @/lib/rbac"; exit 1; }

# 2. new integration test present.
T="lib/server/pricing-guard.integration.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

# 3. typecheck + unit + funnel guard + integration test.
npx tsc --noEmit
npm test
npm run guard:funnel
npx vitest run --config vitest.integration.config.ts "$T"

echo "PASS: wave18-04"
