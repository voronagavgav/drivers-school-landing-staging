#!/usr/bin/env bash
# wave22-07: server recomputeElo exists, reuses the pure fold, determinism/oracle integration test green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/server/elo.ts"
T="lib/server/elo.integration.test.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

grep -q "export async function recomputeElo" "$F" || { echo "FAIL: recomputeElo export missing"; exit 1; }
# Reuses the pure fold, no local Elo math.
grep -qE 'from "@/lib/elo"' "$F" || { echo "FAIL: must import @/lib/elo (reuse foldEloStream)"; exit 1; }
grep -qE 'function\s+sigmoid|Math\.exp\(' "$F" && { echo "FAIL: server must not reimplement Elo math"; exit 1; } || true
# Chunked writeback present.
grep -qE '200' "$F" || { echo "FAIL: expected ≤200-id chunk bound in writeback"; exit 1; }

# Integration test names recomputeElo (real entry) and asserts determinism + oracle.
grep -q "recomputeElo" "$T" || { echo "FAIL: integration test must drive recomputeElo"; exit 1; }

echo "=== typecheck ==="; npm run -s typecheck
echo "=== npm test ==="; npm test

echo "=== db:seed (before integration) ==="; npm run db:seed
echo "=== integration ==="; npm run test:integration

echo "PASS: wave22-07"
