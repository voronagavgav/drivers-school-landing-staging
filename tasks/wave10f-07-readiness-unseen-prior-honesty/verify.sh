#!/usr/bin/env bash
# wave10f-07 verify: unseen prior clamped to seen mean (monotone honesty).
set -euo pipefail
cd "$(dirname "$0")/../.."

grep -Eq "Math\.min\(.*(seenMean|unseenPrior)" lib/readiness-model.ts \
  || grep -q "effectiveUnseenPrior" lib/readiness-model.ts \
  || { echo "FAIL: effective unseen prior clamp (min(unseenPrior, seenMean)) missing"; exit 1; }

grep -q "export function poissonBinomialAtLeast" lib/readiness-model.ts \
  || { echo "FAIL: poissonBinomialAtLeast must remain"; exit 1; }

x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -Eq "readiness" || { echo "FAIL: readiness test not collected"; exit 1; }

npm test
npm run typecheck
echo "PASS wave10f-07"
