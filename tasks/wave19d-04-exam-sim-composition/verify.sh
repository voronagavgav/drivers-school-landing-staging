#!/usr/bin/env bash
# wave19d-04: exam-sim draws the official 4 strata; old 6-block asserts gone; integration green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

T="lib/server/exam-blueprint.integration.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

# Old 6-block keys must be gone from the integration expectations.
if grep -nE '\bc\.(medicine|law|general)\b' "$T"; then
  echo "FAIL: integration test still asserts old 6-block keys (medicine/law/general)"; exit 1
fi
# New fixed per-block expectations present.
grep -qE 'medical' "$T"   || { echo "FAIL: integration test does not reference the 'medical' block"; exit 1; }
grep -qE '20 - \(7 \+' "$T" && { echo "FAIL: stale pdr = 20-(7+safety) remainder arithmetic still present"; exit 1; } || true

npm run -s typecheck

# Reseed BEFORE the DB-backed run so accumulated rows can't flake it (CLAUDE.md ordering rule).
npm run -s db:seed

# Run just this integration file through the real production path.
npx vitest run -c vitest.integration.config.ts "$T"

echo "PASS: wave19d-04"
