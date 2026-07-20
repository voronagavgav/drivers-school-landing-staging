#!/usr/bin/env bash
# wave12b-04 — finalizeSession extraction + idempotence.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
E="lib/server/test-engine.ts"
grep -qE 'export async function finalizeSession|export function finalizeSession' "$E" || { echo "FAIL: finalizeSession not exported from $E"; exit 1; }
grep -qE 'finalizeSession\(' "$E" || { echo "FAIL: finishSession must call finalizeSession"; exit 1; }
T="lib/server/finalize-session.integration.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -qE 'finalizeSession' "$T" || { echo "FAIL: integration test must exercise finalizeSession re-run"; exit 1; }
grep -qE 'streakCurrent' "$T" || { echo "FAIL: integration test must assert streak fields"; exit 1; }
x="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"
echo "$x" | grep -q "finalize-session.integration.test.ts" || { echo "FAIL: new integration file not collected"; exit 1; }
npm run typecheck
npm test
npm run build
npm run db:seed >/dev/null 2>&1 || true
npm run test:integration
echo "PASS wave12b-04"
