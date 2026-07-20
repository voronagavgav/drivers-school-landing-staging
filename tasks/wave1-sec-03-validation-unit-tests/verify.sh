#!/usr/bin/env bash
# verify.sh — wave1-sec-03 (validation unit tests present + suite green, count rose)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TF="lib/validation.test.ts"

# 1. Test file present + references the module + vitest.
[ -f "$TF" ] || { echo "FAIL: $TF missing"; exit 1; }
grep -Eq "@/lib/validation" "$TF" || { echo "FAIL: $TF does not import from @/lib/validation"; exit 1; }
grep -Eq "from ['\"]vitest['\"]" "$TF" || { echo "FAIL: $TF does not import from vitest"; exit 1; }

# 2. Each non-admin schema is exercised by name.
for sym in registerSchema loginSchema selectCategorySchema startTestSchema submitAnswerSchema \
           finishTestSchema toggleSaveSchema removeSavedSchema firstIssueMessage; do
  grep -q "$sym" "$TF" || { echo "FAIL: $TF does not exercise $sym"; exit 1; }
done

# 2b. Both success and failure are asserted somewhere.
grep -Eq "success" "$TF" || { echo "FAIL: $TF does not assert .safeParse success/failure"; exit 1; }

# 5. Typecheck + suite green; >=1 new test file vs baseline (we expect >=6 files now).
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }
files="$(echo "$out" | grep -Eo "Test Files[[:space:]]+[0-9]+ passed" | grep -Eo "[0-9]+" | head -1)"
[ -n "$files" ] || { echo "FAIL: could not parse vitest test-file count"; exit 1; }
[ "$files" -ge 6 ] || { echo "FAIL: expected >=6 test files (baseline 5 + validation.test.ts), got $files"; exit 1; }

echo "PASS: wave1-sec-03 validation tests green ($files test files)"
