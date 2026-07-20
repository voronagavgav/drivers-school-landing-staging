#!/usr/bin/env bash
# verify.sh — wave5-09 (pure examReadiness + EXAM_READINESS_* constants + unit tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/readiness.ts"
CONST="lib/constants.ts"
TEST="lib/readiness.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1/2. Export + named tunables.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq "export function examReadiness|export const examReadiness" "$SRC" \
  || fail "$SRC does not export examReadiness"
grep -Eq "EXAM_READINESS" "$CONST" || fail "$CONST has no EXAM_READINESS_* tunables"
grep -Eq "EXAM_READINESS" "$SRC" || fail "$SRC does not use the EXAM_READINESS_* constants"

# 3. The three bands are present.
for b in "не готовий" "майже" "готовий"; do
  grep -q "$b" "$SRC" || fail "$SRC missing band label '$b'"
done

# 5. Purity.
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$SRC" \
  && fail "$SRC is not pure (server/DB token present)"
grep -nE "Math\.random|Date\.now|new Date\(" "$SRC" \
  && fail "$SRC uses a clock or global randomness — must be pure/deterministic"

# 6. New test file references examReadiness.
[ -f "$TEST" ] || fail "$TEST missing (the new C unit test file)"
grep -q "examReadiness" "$TEST" || fail "$TEST does not reference examReadiness"

# 7. Typecheck.
npm run typecheck 2>&1 | tail -3

# 8. Fast unit suite + inclusion.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"
listing="$(npx vitest list 2>/dev/null || true)"
echo "$listing" | grep -q "lib/readiness.test.ts" || fail "readiness.test.ts did not run"

echo "PASS: wave5-09 examReadiness pure + tests"
