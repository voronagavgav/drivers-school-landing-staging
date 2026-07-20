#!/usr/bin/env bash
# wave13-14 — offline-pack endpoint: route + server helper + integration coverage.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

R="app/api/offline-pack/[scope]/route.ts"
[ -f "$R" ] || { echo "FAIL: $R missing"; exit 1; }
grep -qF "getCurrentUser" "$R" || { echo "FAIL: route must auth via getCurrentUser"; exit 1; }
grep -qF "getOfflinePack" "$R" || { echo "FAIL: route must delegate to lib/server/offline-pack"; exit 1; }

H="lib/server/offline-pack.ts"
[ -f "$H" ] || { echo "FAIL: $H missing"; exit 1; }
grep -qF "estimatedImageBytes" "$H" || { echo "FAIL: estimatedImageBytes missing"; exit 1; }
grep -qF "img-cache" "$H" || { echo "FAIL: size estimate must read real img-cache variants"; exit 1; }
grep -qF "isPublished" "$H" || { echo "FAIL: servable predicate missing"; exit 1; }
grep -qE 'mistakes' "$H" || { echo "FAIL: mistakes scope missing"; exit 1; }
grep -qE 'saved' "$H" || { echo "FAIL: saved scope missing"; exit 1; }
grep -qE '200' "$H" || { echo "FAIL: 200-question hard cap missing"; exit 1; }

T="lib/server/offline-pack.integration.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -qF "createOfficialQuestion" "$T" || { echo "FAIL: must reuse the shared fixture helper"; exit 1; }
grep -qF "401" "$T" || { echo "FAIL: unauth case missing"; exit 1; }
grep -qF "404" "$T" || { echo "FAIL: garbage-scope case missing"; exit 1; }
lst="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$lst" | grep -q "offline-pack.integration.test.ts" || { echo "FAIL: test not collected"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "PASS wave13-14"
