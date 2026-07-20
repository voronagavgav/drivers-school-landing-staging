#!/usr/bin/env bash
# wave10f-10 verify: SRS fields un-stripped at the validation boundary.
set -euo pipefail
cd "$(dirname "$0")/../.."

# submitAnswerSchema carries the three fields.
for f in latencyMs confidence clientEventId; do
  grep -q "$f" lib/validation.ts || { echo "FAIL: $f missing from validation.ts"; exit 1; }
done
# Range bounds present (600000 cap, 1..4 confidence, 64-char id).
grep -q "600000" lib/validation.ts || { echo "FAIL: latencyMs 600000 cap missing"; exit 1; }

# Action input widened.
grep -q "clientEventId" app/actions/test.ts || { echo "FAIL: submitAnswerAction input not widened"; exit 1; }

npm test
npm run typecheck
echo "PASS wave10f-10"
