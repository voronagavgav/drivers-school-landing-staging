#!/usr/bin/env bash
# wave13-17 — offline playback: client runner, precache, sessionless review lane.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

grep -qF "listPacks" app/~offline/page.tsx || grep -rqF "listPacks" app/~offline/ || { echo "FAIL: /~offline must render the pack list"; exit 1; }

F="app/offline-practice/page.tsx"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
grep -qF "Офлайн-практика" "$F" || grep -rqF "Офлайн-практика" app/offline-practice/ || { echo "FAIL: heading «Офлайн-практика» missing"; exit 1; }
for tok in "@/lib/db" "@/lib/auth" "@/lib/rbac" "server-only" "getCurrentUser"; do
  grep -rqF "$tok" app/offline-practice/ && { echo "FAIL: server-graph token in offline-practice: $tok"; exit 1; }
done
grep -rqF "enqueueAnswer" app/offline-practice/ || { echo "FAIL: offline answers must enqueue to the WAL"; exit 1; }

# precache entries for both offline routes
grep -q "offline-practice" app/sw.ts next.config.ts || { echo "FAIL: /offline-practice not precached"; exit 1; }

# sessionless lane
grep -qE 'sessionId.*optional|optional\(\)' lib/review-sync.ts || { echo "FAIL: sessionId must be optional in the item schema"; exit 1; }
grep -qF "recordReview" app/api/review-sync/route.ts || { echo "FAIL: sessionless branch must call recordReview"; exit 1; }
grep -qE '\$transaction' app/api/review-sync/route.ts || { echo "FAIL: sessionless branch must run in a transaction"; exit 1; }

# integration coverage for the sessionless lane
grep -rqE 'sessionless|testSessionId: *null' lib/server/*.integration.test.ts || { echo "FAIL: sessionless integration cases missing"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run -s build || { echo "FAIL: build"; exit 1; }
echo "PASS wave13-17"
