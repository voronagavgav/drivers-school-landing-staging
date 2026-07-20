#!/usr/bin/env bash
# verify.sh — wave1-sec-05 (test + user actions wired to validation; parse-before-DB; typecheck/test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
T="app/actions/test.ts"
U="app/actions/user.ts"

# 1. test.ts imports validation + uses each schema.
grep -q "@/lib/validation" "$T" || { echo "FAIL: $T does not import from @/lib/validation"; exit 1; }
for sym in startTestSchema submitAnswerSchema finishTestSchema toggleSaveSchema removeSavedSchema; do
  grep -Eq "$sym\.safeParse|$sym" "$T" || { echo "FAIL: $T does not use $sym"; exit 1; }
done
# 2. The three object-arg guards actually parse.
grep -Eq "submitAnswerSchema\.safeParse" "$T" || { echo "FAIL: submitAnswerAction does not safeParse"; exit 1; }
grep -Eq "finishTestSchema\.safeParse" "$T"   || { echo "FAIL: finishTestAction does not safeParse"; exit 1; }
grep -Eq "toggleSaveSchema\.safeParse" "$T"   || { echo "FAIL: toggleSaveAction does not safeParse"; exit 1; }

# 5. test.ts exports intact.
for fn in startTestAction submitAnswerAction finishTestAction toggleSaveAction removeSavedAction; do
  grep -Eq "export async function $fn\b" "$T" || { echo "FAIL: $T lost export $fn"; exit 1; }
done
# Redirect semantics preserved (string anchors still present).
grep -q 'empty=' "$T" || { echo "FAIL: $T lost the NoQuestions empty= redirect"; exit 1; }

# 4. user.ts validates categoryId BEFORE the prisma lookup, keeps /onboarding redirect + export.
grep -q "@/lib/validation" "$U" || { echo "FAIL: $U does not import from @/lib/validation"; exit 1; }
grep -Eq "selectCategorySchema" "$U" || { echo "FAIL: $U does not use selectCategorySchema"; exit 1; }
grep -Eq "export async function selectCategoryAction\b" "$U" || { echo "FAIL: $U lost selectCategoryAction"; exit 1; }
grep -q "/onboarding" "$U" || { echo "FAIL: $U lost the /onboarding redirect"; exit 1; }
body="$(awk '/export async function selectCategoryAction/{f=1} f{print} /^}/{if(f)exit}' "$U")"
sp="$(printf '%s\n' "$body" | grep -n "selectCategorySchema" | head -1 | cut -d: -f1)"
pr="$(printf '%s\n' "$body" | grep -n "prisma\." | head -1 | cut -d: -f1)"
{ [ -n "$sp" ] && [ -n "$pr" ] && [ "$sp" -lt "$pr" ]; } \
  || { echo "FAIL: selectCategoryAction must validate categoryId before the prisma lookup"; exit 1; }

# Typecheck + suite green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: wave1-sec-05 test + user actions validated"
