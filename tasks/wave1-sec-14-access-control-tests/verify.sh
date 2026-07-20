#!/usr/bin/env bash
# verify.sh — wave1-sec-14 (access-control integration tests + RBAC structural + suites green)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
IT="lib/server/access-control.integration.test.ts"
A="app/admin/actions.ts"

# 1. New integration test present.
[ -f "$IT" ] || { echo "FAIL: $IT missing"; exit 1; }

# 2. IDOR proof references.
grep -q "getSessionState" "$IT" || { echo "FAIL: $IT does not exercise getSessionState (IDOR proof)"; exit 1; }
grep -Eq "toBeNull|null" "$IT" || { echo "FAIL: $IT does not assert a null (foreign session) result"; exit 1; }

# 3. Engine gating proof references published/active gating + SAVED mode.
grep -Eqi "isPublished|publish" "$IT" || { echo "FAIL: $IT does not assert published gating"; exit 1; }
grep -q "SAVED_QUESTIONS" "$IT" || { echo "FAIL: $IT does not cover SAVED_QUESTIONS published gating"; exit 1; }

# 4a. RBAC behavioral: references an admin mutation + a mocked USER rejection.
grep -Eq "createQuestion|requireContentManager" "$IT" || { echo "FAIL: $IT does not exercise admin RBAC"; exit 1; }
# 4b. RBAC structural: every admin mutation still gates (>=12 requireContentManager() calls).
calls="$(grep -c "requireContentManager()" "$A" || true)"
[ "${calls:-0}" -ge 12 ] || { echo "FAIL: expected >=12 requireContentManager() calls in $A, got ${calls:-0}"; exit 1; }

# 6. Typecheck + fast suite.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest unit suite reported failures"; exit 1; }

# 5. Integration suite green.
echo "Running npm run test:integration…"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -12
echo "$iout" | grep -Eqi "[1-9][0-9]* failed" && { echo "FAIL: integration suite reported failures"; exit 1; }
echo "$iout" | grep -Eq "Tests[[:space:]]+[0-9]+ passed" || { echo "FAIL: integration suite did not report passing tests"; exit 1; }

echo "PASS: wave1-sec-14 access-control proofs green (IDOR + RBAC + published gating)"
