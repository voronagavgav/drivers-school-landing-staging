#!/usr/bin/env bash
# wave13-10 — review-sync: pure schema + clamp oracle + route contract.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/review-sync.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
for tok in "server-only" "@/lib/db" "lib/generated"; do
  grep -qF "$tok" "$F" && { echo "FAIL: purity violation in $F: $tok"; exit 1; }
done
grep -qF "reviewSyncBatchSchema" "$F" || { echo "FAIL: batch schema missing"; exit 1; }
grep -qF "reviewSyncItemSchema" "$F" || { echo "FAIL: item schema must be exported separately"; exit 1; }
grep -qF "REVIEW_SYNC_MAX_ITEMS" "$F" || { echo "FAIL: max-items constant missing"; exit 1; }
grep -qF "REVIEW_SYNC_MAX_BODY_BYTES" "$F" || { echo "FAIL: body-cap constant missing"; exit 1; }
grep -qF "clampReviewedAt" "$F" || { echo "FAIL: clampReviewedAt missing"; exit 1; }

T="lib/review-sync.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -qF "1700000000000" "$T" || { echo "FAIL: frozen clamp oracle (now=1700000000000) missing"; exit 1; }
grep -qF "1699395200000" "$T" || { echo "FAIL: frozen now-minus-7d clamp value missing"; exit 1; }

R="app/api/review-sync/route.ts"
[ -f "$R" ] || { echo "FAIL: $R missing"; exit 1; }
grep -qF "getCurrentUser" "$R" || { echo "FAIL: route must auth via getCurrentUser"; exit 1; }
grep -qF "REVIEW_SYNC_MAX_BODY_BYTES" "$R" || { echo "FAIL: route must size-cap before parse"; exit 1; }
grep -qF "clampReviewedAt" "$R" || { echo "FAIL: route must clamp reviewedAt"; exit 1; }
grep -qF "submitAnswer" "$R" || { echo "FAIL: route must apply through submitAnswer"; exit 1; }
grep -qE 'rejected' "$R" || { echo "FAIL: per-item rejected status missing"; exit 1; }

grep -qF "reviewedAt" lib/server/test-engine.ts || { echo "FAIL: submitAnswer reviewedAt param missing"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
lst="$(npx vitest list 2>/dev/null || true)"
echo "$lst" | grep -q "review-sync.test.ts" || { echo "FAIL: review-sync.test.ts not in vitest list"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite regression"; exit 1; }
echo "PASS wave13-10"
