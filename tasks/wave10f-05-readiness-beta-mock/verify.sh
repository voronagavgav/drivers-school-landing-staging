#!/usr/bin/env bash
# wave10f-05 verify: Beta mock-count shrinkage replaces the fixed blend.
set -euo pipefail
cd "$(dirname "$0")/../.."

grep -q "READINESS_ANCHOR_STRENGTH" lib/readiness-model.ts lib/constants.ts \
  || { echo "FAIL: READINESS_ANCHOR_STRENGTH constant missing"; exit 1; }
grep -Eq "mockAttempts" lib/readiness-model.ts || { echo "FAIL: mockAttempts input missing"; exit 1; }
grep -Eq "mockPasses" lib/readiness-model.ts || { echo "FAIL: mockPasses input missing"; exit 1; }
if grep -q "MOCK_SHRINKAGE" lib/readiness-model.ts; then echo "FAIL: old MOCK_SHRINKAGE blend still present"; exit 1; fi

# poissonBinomialAtLeast unchanged signature still present.
grep -q "export function poissonBinomialAtLeast" lib/readiness-model.ts \
  || { echo "FAIL: poissonBinomialAtLeast must remain"; exit 1; }

x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -Eq "readiness" || { echo "FAIL: readiness test not collected"; exit 1; }

npm test
npm run typecheck
echo "PASS wave10f-05"
