#!/usr/bin/env bash
# verify.sh — wave6-04 (server resolver + /api/q-image/[key] route + integration test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
ROUTE="app/api/q-image/[key]/route.ts"
SRV="lib/server/image-resolve.ts"
TEST="lib/server/q-image-route.integration.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Server resolver reuses the pure candidate list.
[ -f "$SRV" ] || fail "$SRV missing"
grep -q "imageCandidatePaths" "$SRV" || fail "$SRV does not reuse imageCandidatePaths"

# 2. Route exists, Node runtime, GET handler, 404 path present.
[ -f "$ROUTE" ] || fail "$ROUTE missing"
grep -Eq "runtime *= *\"nodejs\"" "$ROUTE" || fail "$ROUTE does not set runtime=nodejs"
grep -Eq "export +async +function +GET|export +const +GET" "$ROUTE" || fail "$ROUTE has no GET handler"
grep -q "404" "$ROUTE" || fail "$ROUTE never returns 404 on miss"

# 3. Integration/route test exists and drives the route.
[ -f "$TEST" ] || fail "$TEST missing"
grep -q "GET" "$TEST" || fail "$TEST does not call the GET handler"
grep -Eqi "404|traversal|\.\." "$TEST" || fail "$TEST has no 404/traversal case"

# 4. Typecheck + unit suite + integration suite (zero failures) + inclusion.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "fast unit suite reported failures"

iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ilist" | grep -q "q-image-route.integration.test.ts" \
  || fail "q-image-route.integration.test.ts did not run"

echo "PASS: wave6-04 q-image route + resolver + integration test"
