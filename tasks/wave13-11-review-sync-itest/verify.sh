#!/usr/bin/env bash
# wave13-11 — review-sync integration suite exists, is collected, green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="lib/server/review-sync.integration.test.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
grep -qF "createOfficialQuestion" "$F" || { echo "FAIL: must reuse the shared official-question fixture"; exit 1; }
grep -qE 'Date\.now\(\)' "$F" || { echo "FAIL: per-run clientEventId token missing (leftover-row trap)"; exit 1; }
grep -qF "rejected" "$F" || { echo "FAIL: foreign-session rejection case missing"; exit 1; }
grep -qE '8 ?\* ?86400000|86400000 ?\* ?8' "$F" || { echo "FAIL: now-minus-8d clamp case missing"; exit 1; }
grep -qE '51' "$F" || { echo "FAIL: oversize (51 items) case missing"; exit 1; }
# production path: must import the exported POST from the route
grep -qE 'api/review-sync/route' "$F" || { echo "FAIL: must drive the exported route POST"; exit 1; }
lst="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$lst" | grep -q "review-sync.integration.test.ts" || { echo "FAIL: file not collected by integration config"; exit 1; }
npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "PASS wave13-11"
