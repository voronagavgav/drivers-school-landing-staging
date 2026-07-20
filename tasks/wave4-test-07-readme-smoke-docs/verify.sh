#!/usr/bin/env bash
# verify.sh — wave4-test-07 (README documents the smoke script)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
R="README.md"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$R" ] || fail "README.md missing"

# 1. A smoke heading exists.
grep -Eqi '^#+ .*smoke' "$R" || fail "README has no smoke-test heading"
# 2. References the script + base url.
grep -q "scripts/smoke.sh" "$R" || fail "README does not name scripts/smoke.sh"
grep -q "SMOKE_BASE_URL" "$R" || fail "README does not document SMOKE_BASE_URL"
# 3. Mentions SESSION_SECRET prerequisite.
grep -q "SESSION_SECRET" "$R" || fail "README does not mention the SESSION_SECRET prerequisite"

# 5. README edit keeps the suites green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "unit suite reported failures" || true

echo "PASS: wave4-test-07 README smoke docs"
