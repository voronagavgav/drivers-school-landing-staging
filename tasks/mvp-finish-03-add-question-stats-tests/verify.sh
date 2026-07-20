#!/usr/bin/env bash
# verify.sh — mvp-finish-03 (unit tests present + suite green: 5 files / >=37)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

# 1. Test file present and exercises the function.
[ -f lib/question-stats.test.ts ] || { echo "FAIL: lib/question-stats.test.ts missing"; exit 1; }
grep -q "summarizeQuestionPerformance" lib/question-stats.test.ts \
  || { echo "FAIL: test file does not reference summarizeQuestionPerformance"; exit 1; }
grep -q 'from "vitest"' lib/question-stats.test.ts \
  || { echo "FAIL: test file does not import from vitest"; exit 1; }

# 2. Typecheck.
npm run typecheck 2>&1 | tail -3

# 3. Suite: zero failures, 5 files, >=37 passing.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }
files="$(echo "$out" | grep -Eo "Test Files[[:space:]]+[0-9]+ passed" | grep -Eo "[0-9]+" | head -1)"
passed="$(echo "$out" | grep -Eo "Tests[[:space:]]+[0-9]+ passed" | grep -Eo "[0-9]+" | head -1)"
[ -n "$passed" ] && [ -n "$files" ] || { echo "FAIL: could not parse vitest counts"; exit 1; }
[ "$files" -ge 5 ]  || { echo "FAIL: expected >=5 test files, got $files"; exit 1; }
[ "$passed" -ge 37 ] || { echo "FAIL: expected >=37 passing tests, got $passed"; exit 1; }

echo "PASS: mvp-finish-03 question-stats tests green ($files files / $passed tests)"
