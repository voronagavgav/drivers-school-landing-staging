#!/usr/bin/env bash
# verify.sh — wave11-09 readiness-snapshot integration (runs this file only).
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }
F="lib/server/readiness-snapshot.integration.test.ts"
[ -f "$F" ] || fail "$F missing"

grep -Eq 'finishSession' "$F" || fail "$F must drive the real finishSession (production path)"
grep -Eq 'computeReadiness' "$F" || fail "$F must compare against the pure computeReadiness model"
grep -Eq 'sufficientData' "$F" || fail "$F must assert the insufficient-data flag"
grep -Eq 'createOfficialQuestion' "$F" || fail "$F must self-provision fixtures"

ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ilist" | grep -q "readiness-snapshot.integration.test.ts" || fail "not in integration list"

npm run db:seed 2>&1 | tail -2
out="$(npx vitest run --config vitest.integration.config.ts "$F" 2>&1)"; echo "$out" | tail -20
echo "$out" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "readiness-snapshot suite reported failures" || true
echo "PASS: readiness-snapshot integration green"
