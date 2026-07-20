#!/usr/bin/env bash
# verify.sh — wave18-07: self-segment validators + actions get coverage.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

U="lib/segment.test.ts"
I="lib/server/segment-actions.integration.test.ts"
[ -f "$U" ] || { echo "FAIL: $U missing"; exit 1; }
[ -f "$I" ] || { echo "FAIL: $I missing"; exit 1; }

# source untouched (test-only task).
git diff --quiet -- lib/segment.ts app/actions/segment.ts \
  || { echo "FAIL: lib/segment.ts / app/actions/segment.ts must NOT change"; exit 1; }

# integration test drives the REAL actions, not internals.
grep -qE 'segmentSelectCategoryAction|@/app/actions/segment' "$I" \
  || { echo "FAIL: integration test does not drive the real segment actions"; exit 1; }

# prove both new test files are actually collected by their runners.
UNIT_LIST="$(npx vitest list 2>/dev/null || true)"
echo "$UNIT_LIST" | grep -q "segment.test.ts" || { echo "FAIL: unit test not collected by vitest"; exit 1; }
INT_LIST="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$INT_LIST" | grep -q "segment-actions.integration.test.ts" \
  || { echo "FAIL: integration test not collected"; exit 1; }

npx tsc --noEmit
npm test
npx vitest run --config vitest.integration.config.ts "$I"

echo "PASS: wave18-07"
