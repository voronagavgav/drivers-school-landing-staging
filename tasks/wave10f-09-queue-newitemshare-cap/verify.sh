#!/usr/bin/env bash
# wave10f-09 verify: newItemShare is a cap; backfillWithNew opt-in.
set -euo pipefail
cd "$(dirname "$0")/../.."

grep -q "backfillWithNew" lib/test-engine/queue.ts || { echo "FAIL: backfillWithNew option missing"; exit 1; }

if grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated|Date\.now|new Date" lib/test-engine/queue.ts; then
  echo "FAIL: purity token in queue.ts"; exit 1
fi

x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -Eq "queue" || { echo "FAIL: queue test not collected"; exit 1; }

npm test
npm run typecheck
echo "PASS wave10f-09"
