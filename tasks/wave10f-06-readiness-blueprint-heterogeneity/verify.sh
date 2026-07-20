#!/usr/bin/env bash
# wave10f-06 verify: heterogeneous blueprint p-vector, not the degenerate constant fill.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Per-block inputs present (quota + meanProb per block).
grep -Eq "quota" lib/readiness-model.ts || { echo "FAIL: per-block quota input missing"; exit 1; }
grep -Eq "meanProb" lib/readiness-model.ts || { echo "FAIL: per-block meanProb input missing"; exit 1; }

# DP kernel unchanged.
grep -q "export function poissonBinomialAtLeast" lib/readiness-model.ts \
  || { echo "FAIL: poissonBinomialAtLeast must remain"; exit 1; }

x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -Eq "readiness" || { echo "FAIL: readiness test not collected"; exit 1; }

npm test
npm run typecheck
echo "PASS wave10f-06"
