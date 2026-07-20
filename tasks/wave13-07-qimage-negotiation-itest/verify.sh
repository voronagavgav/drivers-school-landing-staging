#!/usr/bin/env bash
# wave13-07 — integration test for negotiated q-image route exists, is collected, suite green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="lib/server/qimage-negotiation.integration.test.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
# case-table spot checks (frozen literals)
grep -qF "image/avif,image/webp" "$F" || { echo "FAIL: avif Accept case missing"; exit 1; }
grep -qF "max-age=31536000" "$F" || { echo "FAIL: immutable header assertion missing"; exit 1; }
grep -qF "max-age=3600" "$F" || { echo "FAIL: original cache-control assertion missing"; exit 1; }
grep -qF "404" "$F" || { echo "FAIL: traversal 404 case missing"; exit 1; }
grep -qF "11_10_0" "$F" || { echo "FAIL: committed fixture key 11_10_0 not used"; exit 1; }
# production path: must import the route's GET, not call resolveVariantDiskPath as the subject
grep -qE 'from .+/api/q-image' "$F" || grep -qF 'q-image/[key]/route' "$F" || { echo "FAIL: must drive the exported route GET"; exit 1; }
lst="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$lst" | grep -q "qimage-negotiation.integration.test.ts" || { echo "FAIL: file not collected by integration config"; exit 1; }
npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "PASS wave13-07"
