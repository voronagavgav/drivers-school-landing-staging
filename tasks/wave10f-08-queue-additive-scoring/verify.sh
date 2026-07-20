#!/usr/bin/env bash
# wave10f-08 verify: additive queue scoring (no annihilating product).
set -euo pipefail
cd "$(dirname "$0")/../.."

# The old multiplicative combination is gone from scoreCandidate.
if grep -Eq "overdueness\(state, now\) \* \(1 - r\) \* topicWeakness" lib/test-engine/queue.ts; then
  echo "FAIL: multiplicative score still present"; exit 1
fi

# Purity of the pure engine module (comments included). rng defaults are allowed (Math.random default arg).
if grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated|Date\.now|new Date" lib/test-engine/queue.ts; then
  echo "FAIL: purity token in queue.ts"; exit 1
fi

x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -Eq "queue" || { echo "FAIL: queue test not collected"; exit 1; }

npm test
npm run typecheck
echo "PASS wave10f-08"
