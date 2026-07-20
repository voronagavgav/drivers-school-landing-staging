#!/usr/bin/env bash
# wave22-08: manual elo-recompute script runs; nightly wired; ops note present; typecheck+unit green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

S="scripts/elo-recompute.ts"
N="scripts/nightly-readiness.ts"
[ -f "$S" ] || { echo "FAIL: $S missing"; exit 1; }

grep -q "recomputeElo" "$S"   || { echo "FAIL: manual script must call recomputeElo"; exit 1; }
grep -q "PrismaLibSql" "$S"   || { echo "FAIL: manual script must use its own libsql client"; exit 1; }
grep -qF 'lib/db' "$S" && { echo "FAIL: manual script must NOT import lib/db"; exit 1; } || true

grep -q "recomputeElo" "$N"   || { echo "FAIL: nightly script must reference the Elo recompute"; exit 1; }

grep -qi "elo" ops/README.md  || { echo "FAIL: ops/README.md must document the Elo recompute"; exit 1; }
grep -qF "scripts/elo-recompute.ts" ops/README.md || { echo "FAIL: ops/README.md must name the manual command"; exit 1; }

echo "=== db:seed (ensure data) ==="; npm run db:seed
echo "=== run manual recompute ==="
OUT="$(npx tsx --conditions=react-server "$S" 2>&1)"; echo "$OUT"
grep -qi "elo recompute" <<<"$OUT" || { echo "FAIL: manual script did not print an 'elo recompute' summary"; exit 1; }

echo "=== typecheck ==="; npm run -s typecheck
echo "=== npm test ==="; npm test

echo "PASS: wave22-08"
