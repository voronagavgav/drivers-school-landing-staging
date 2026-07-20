#!/usr/bin/env bash
# wave10f-12 verify: whole-transaction idempotency guard in submitAnswer.
set -euo pipefail
cd "$(dirname "$0")/../.."

# The tx begins with a reviewLog lookup by clientEventId.
grep -q "reviewLog.findUnique" lib/server/test-engine.ts \
  || { echo "FAIL: submitAnswer must findUnique reviewLog by clientEventId inside the tx"; exit 1; }
grep -q "clientEventId" lib/server/test-engine.ts || { echo "FAIL: clientEventId dedupe missing"; exit 1; }

# recordReview inner guard kept.
grep -q "clientEventId" lib/server/study.ts || { echo "FAIL: recordReview inner guard removed"; exit 1; }

npm run typecheck
npm run test:integration
echo "PASS wave10f-12"
