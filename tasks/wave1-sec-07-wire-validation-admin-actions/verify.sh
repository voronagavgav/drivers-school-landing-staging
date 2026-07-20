#!/usr/bin/env bash
# verify.sh — wave1-sec-07 (admin mutations validated via zod; RBAC intact; copy preserved)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
V="lib/validation.ts"
A="app/admin/actions.ts"
TF="lib/validation.test.ts"

# 1. Admin schemas exported from validation module.
for sym in adminQuestionSchema adminCategorySchema adminTopicSchema adminContentVersionSchema; do
  grep -Eq "export (const|function) $sym\b" "$V" || { echo "FAIL: $V does not export $sym"; exit 1; }
done

# 2. Admin actions import + use each schema's safeParse.
grep -q "@/lib/validation" "$A" || { echo "FAIL: $A does not import from @/lib/validation"; exit 1; }
for sym in adminQuestionSchema adminCategorySchema adminTopicSchema adminContentVersionSchema; do
  grep -Eq "$sym\.safeParse" "$A" || { echo "FAIL: $A does not safeParse $sym"; exit 1; }
done

# 3. RBAC unchanged: >=12 requireContentManager() invocations remain.
calls="$(grep -c "requireContentManager()" "$A" || true)"
[ "${calls:-0}" -ge 12 ] || { echo "FAIL: expected >=12 requireContentManager() calls, got ${calls:-0}"; exit 1; }

# 4. Ukrainian copy preserved.
for s in "щонайменше 3 символи" "щонайменше 2 варіанти" "Позначте правильну відповідь" \
         "Вкажіть код категорії" "Вкажіть назву теми" "Вкажіть назву версії"; do
  grep -rqF "$s" "$A" "$V" || { echo "FAIL: lost Ukrainian message: $s"; exit 1; }
done

# 5. Admin schema tested.
grep -q "adminQuestionSchema" "$TF" || { echo "FAIL: $TF does not test adminQuestionSchema"; exit 1; }

# 6. Scope guard: imageUrl scheme validation (safeImageUrl) is task 08, not here.
grep -q "safeImageUrl" "$A" && { echo "FAIL: $A references safeImageUrl — that belongs to task 08"; exit 1; }

# Typecheck + suite green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: wave1-sec-07 admin mutations validated (RBAC intact, copy preserved)"
