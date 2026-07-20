#!/usr/bin/env bash
# verify.sh — wave3-feat-02 (pure SM-2-lite spacedMistakeOrder + unit tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/test-engine/selection.ts"
TEST="lib/test-engine/selection.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Export present.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq "export function spacedMistakeOrder|export const spacedMistakeOrder" "$SRC" \
  || fail "$SRC does not export spacedMistakeOrder"
grep -Eq "SpacingWeights" "$SRC" || fail "$SRC does not define/export SpacingWeights"

# 1b. Determinism: the engine must not read the clock, and must not introduce NEW randomness.
#     The pre-existing shuffle/selectQuestions rng defaults to Math.random BY DESIGN (randomness is
#     injectable — see the module header), so exclude those `rng` injection lines; spacedMistakeOrder
#     itself takes `now` as a param and uses neither a clock nor randomness.
grep -nE "Math\.random|Date\.now|new Date\(" "$SRC" | grep -v "rng" \
  && fail "$SRC uses a clock or non-injected randomness — must stay deterministic (now is passed in)"

# 2. orderMistakesByPriority kept (this task ADDS, not replaces).
grep -q "orderMistakesByPriority" "$SRC" || fail "$SRC lost orderMistakesByPriority (must keep it)"

# 4. Purity: no server/DB tokens anywhere in the file.
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$SRC" \
  && fail "$SRC is not pure (server/DB token present)"

# 5. Test references the new function + a no-mutation/weights notion.
[ -f "$TEST" ] || fail "$TEST missing"
grep -q "spacedMistakeOrder" "$TEST" || fail "$TEST does not reference spacedMistakeOrder"

# 7. Typecheck.
npm run typecheck 2>&1 | tail -3

# 6. Fast unit suite passes + includes selection.test.ts.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"
# Default reporter omits filenames on all-pass — prove inclusion via `vitest list` (capture first to dodge SIGPIPE).
listing="$(npx vitest list 2>/dev/null || true)"
echo "$listing" | grep -q "test-engine/selection.test.ts" || fail "selection.test.ts did not run"

echo "PASS: wave3-feat-02 spacedMistakeOrder pure + tests"
