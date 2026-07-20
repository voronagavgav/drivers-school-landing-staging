#!/usr/bin/env bash
# verify.sh — mvp-finish-04 (admin aggregation helper: export + uses pure fn + typecheck/test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

# 1. Helper exported from the admin server module.
grep -Eq "export (async )?function getQuestionPerformance" lib/server/admin.ts \
  || { echo "FAIL: getQuestionPerformance not exported from lib/server/admin.ts"; exit 1; }

# 2. Delegates to the pure summarizer (does not re-implement).
grep -q "summarizeQuestionPerformance" lib/server/admin.ts \
  || { echo "FAIL: admin.ts does not call summarizeQuestionPerformance"; exit 1; }
grep -q "question-stats" lib/server/admin.ts \
  || { echo "FAIL: admin.ts does not import from @/lib/question-stats"; exit 1; }

# 3. Reads real TestAnswer rows + keeps server-only.
grep -q "testAnswer" lib/server/admin.ts \
  || { echo "FAIL: admin.ts does not query prisma.testAnswer"; exit 1; }
grep -q 'server-only' lib/server/admin.ts \
  || { echo "FAIL: admin.ts lost its server-only import"; exit 1; }

# 4. Typecheck + suite green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: mvp-finish-04 admin aggregation helper meets criteria"
