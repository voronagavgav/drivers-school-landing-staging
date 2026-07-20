#!/usr/bin/env bash
# wave14-13 — analytics retention pruning: runtime-agnostic module, chunked, idempotent, wired nightly.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F=lib/analytics-prune.ts
T=lib/analytics-prune.integration.test.ts
N=scripts/nightly-readiness.ts
for f in "$F" "$T"; do [ -f "$f" ] || { echo "FAIL: $f missing"; exit 1; }; done

grep -qF "ANALYTICS_RETENTION_DAYS = 180" lib/constants.ts || { echo "FAIL: ANALYTICS_RETENTION_DAYS must be 180"; exit 1; }
grep -qF "ANALYTICS_PRUNE_CHUNK = 500" lib/constants.ts || { echo "FAIL: ANALYTICS_PRUNE_CHUNK must be 500"; exit 1; }

grep -qF "pruneAnalyticsEvents" "$F" || { echo "FAIL: pruneAnalyticsEvents not exported"; exit 1; }
# runtime-agnostic: type-only prisma import, no db/server-only taint
grep -qE 'import type \{ *PrismaClient' "$F" || { echo "FAIL: must import type PrismaClient only"; exit 1; }
if grep -nE '@/lib/db|server-only' "$F"; then echo "FAIL: runtime taint in $F"; exit 1; fi

# nightly wiring + log line
grep -qF "pruneAnalyticsEvents" "$N" || { echo "FAIL: nightly script must call pruneAnalyticsEvents"; exit 1; }

# multi-chunk + idempotency vectors present in the test
grep -qF "1200" "$T" || { echo "FAIL: multi-chunk (1200 rows) vector missing"; exit 1; }

x="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"
echo "$x" | grep -q "analytics-prune.integration.test.ts" || { echo "FAIL: integration test not collected"; exit 1; }

m="$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[ "$m" = "9" ] || { echo "FAIL: migration dir count $m != 9"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
npx tsx --conditions=react-server scripts/nightly-readiness.ts || { echo "FAIL: nightly script errored"; exit 1; }
echo "PASS wave14-13"
