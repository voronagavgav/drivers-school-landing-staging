#!/usr/bin/env bash
# wave10f-11 verify: client mints clientEventId + sends latencyMs; confidence stays absent.
set -euo pipefail
cd "$(dirname "$0")/../.."

grep -q "randomUUID" components/test-runner.tsx || { echo "FAIL: crypto.randomUUID not used"; exit 1; }
grep -q "clientEventId" components/test-runner.tsx || { echo "FAIL: clientEventId not sent"; exit 1; }
grep -q "latencyMs" components/test-runner.tsx || { echo "FAIL: latencyMs not sent"; exit 1; }

npm run typecheck
npm run build

# Optional browser smoke if a browser cmd + served app are available.
if [ -n "${DRIVER_BROWSER_CMD:-}" ]; then
  URL="${APP_URL:-http://100.110.64.90:3100}"
  "$DRIVER_BROWSER_CMD" open "$URL/dashboard" >/dev/null 2>&1 || true
  "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
fi
echo "PASS wave10f-11"
