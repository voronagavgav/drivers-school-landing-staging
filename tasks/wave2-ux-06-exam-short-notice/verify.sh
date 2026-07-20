#!/usr/bin/env bash
# verify.sh — wave2-ux-06 (up-front "exam runs short" notice when pool < configured count)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
PAGE="app/(app)/test/[id]/page.tsx"
TR="components/test-runner.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. The constant is referenced on the test screen (page and/or runner).
grep -q "DEFAULT_EXAM_QUESTION_COUNT" "$PAGE" "$TR" \
  || fail "neither $PAGE nor $TR references DEFAULT_EXAM_QUESTION_COUNT"

# Identify which file carries the notice.
HOST="$(grep -l "DEFAULT_EXAM_QUESTION_COUNT" "$PAGE" "$TR" | head -1)"
[ -n "$HOST" ] || fail "could not locate the notice host file"

# 2. A conditional comparing against the configured count exists (shortfall condition).
grep -Eq "<\s*DEFAULT_EXAM_QUESTION_COUNT|DEFAULT_EXAM_QUESTION_COUNT\s*>" "$HOST" \
  || fail "$HOST has no '< DEFAULT_EXAM_QUESTION_COUNT' shortfall comparison"

# 3. Ukrainian shortfall wording present.
grep -Eq "менше|неповн|коротш" "$HOST" \
  || fail "$HOST has no Ukrainian shortfall notice (менше/неповн/коротш)"

# 4. Gate on the exam mode (notice is exam-only).
grep -q "EXAM_SIMULATION" "$HOST" || fail "$HOST does not gate the notice on EXAM_SIMULATION"

# 5. Typecheck.
npm run typecheck 2>&1 | tail -3

# 6. Fast unit suite green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

echo "PASS: wave2-ux-06 exam-short notice"
