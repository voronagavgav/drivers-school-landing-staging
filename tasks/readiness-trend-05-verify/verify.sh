#!/usr/bin/env bash
# verify.sh — readiness-trend-05-verify (end-to-end acceptance gate)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

# 1. Function exported.
grep -Eq "export function readinessTrend[[:space:]]*\(" lib/progress.ts \
  || { echo "FAIL: readinessTrend not exported from lib/progress.ts"; exit 1; }

# 2. Threshold constant exported.
grep -q "export const READINESS_TREND_THRESHOLD" lib/constants.ts \
  || { echo "FAIL: READINESS_TREND_THRESHOLD not exported from lib/constants.ts"; exit 1; }

# 3. Purity preserved.
if grep -Eq "@/lib/db|server-only|@prisma/client|lib/generated" lib/progress.ts; then
  echo "FAIL: lib/progress.ts is no longer pure (DB/server-only import present)"; exit 1
fi

# 6. No DB schema change for this feature.
if grep -riq "trend" prisma/ 2>/dev/null; then
  echo "FAIL: found 'trend' under prisma/ — feature must not change DB schema"; exit 1
fi

# 4. Typecheck.
npm run typecheck 2>&1 | tail -5

# 5. Full suite: zero failures, >= 33 passing.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }
passed="$(echo "$out" | grep -Eo "Tests[[:space:]]+[0-9]+ passed" | grep -Eo "[0-9]+" | head -1)"
[ -n "$passed" ] || { echo "FAIL: could not parse vitest passing count"; exit 1; }
[ "$passed" -ge 33 ] \
  || { echo "FAIL: expected >=33 passing tests, got $passed"; exit 1; }

echo "PASS: readiness-trend feature meets all spec acceptance criteria ($passed tests)"
