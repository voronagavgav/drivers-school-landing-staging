#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
K=lib/constants.ts
# funnel stage events present in whitelist (at least these three new stage markers)
for ev in segment_complete activation_aha readiness_aha; do
  grep -q "\"$ev\"" "$K" || { echo "FAIL: $ev not in ANALYTICS_EVENTS whitelist"; exit 1; }
done
# a paid/purchase event exists (either name)
grep -Eq '"(paid|exam_access_purchased)"' "$K" || { echo "FAIL: paid/purchase funnel event missing from whitelist"; exit 1; }
# events fired somewhere real
grep -rq 'segment_complete' app lib || { echo "FAIL: segment_complete never fired"; exit 1; }
grep -rq 'readiness_aha' app lib components || { echo "FAIL: readiness_aha never fired"; exit 1; }
# integration test present + collected
T=lib/server/funnel-events.integration.test.ts
[ -f "$T" ] || { echo "FAIL: funnel-events integration test missing"; exit 1; }
grep -q 'waitFor' "$T" || { echo "FAIL: fire-and-forget event assertion must poll with vi.waitFor"; exit 1; }
LIST="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$LIST" | grep -q 'funnel-events' || { echo "FAIL: funnel-events test not collected"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "PASS: wave17-11 funnel analytics"
