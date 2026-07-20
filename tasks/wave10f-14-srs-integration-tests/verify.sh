#!/usr/bin/env bash
# wave10f-14 verify: extended SRS integration coverage green.
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/server/srs-review.integration.test.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# Evidence of the three new concerns in the suite (file may be the sibling — grep both).
SUITE="$(cat lib/server/srs-review.integration.test.ts lib/server/*srs*.integration.test.ts 2>/dev/null || true)"
echo "$SUITE" | grep -q "clientEventId" || { echo "FAIL: no clientEventId coverage"; exit 1; }
echo "$SUITE" | grep -qi "ADAPTIVE_REVIEW" || { echo "FAIL: no ADAPTIVE_REVIEW rejection coverage"; exit 1; }

npm run db:seed
npm run test:integration
echo "PASS wave10f-14"
