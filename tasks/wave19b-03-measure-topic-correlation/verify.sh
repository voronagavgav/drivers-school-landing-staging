#!/usr/bin/env bash
# wave19b-03 — measureTopicCorrelation pure estimator + frozen pairwise-ICC oracles.
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/readiness-correlation.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
grep -Eq "export function measureTopicCorrelation" "$F" || { echo "FAIL: measureTopicCorrelation not exported"; exit 1; }

for tok in "server-only" "@/lib/db" "@prisma/client" "lib/generated" "Math.random" "Date.now" "new Date"; do
  grep -Fq "$tok" "$F" && { echo "FAIL: purity — $tok present in $F"; exit 1; } || true
done

# Oracle intents present (concordant→1, discordant→-1, balanced→0, degenerate/singleton→null).
grep -Eq "measureTopicCorrelation" lib/readiness-correlation.test.ts || { echo "FAIL: no oracle tests for measureTopicCorrelation"; exit 1; }

npm run -s typecheck
npm run -s test

LIST=""; for _ in 1 2 3 4 5; do LIST="$(npx vitest list 2>/dev/null || true)"; grep -q readiness-correlation <<<"$LIST" && break; done
grep -q readiness-correlation <<<"$LIST" || { echo "FAIL: readiness-correlation not collected"; exit 1; }

echo "PASS wave19b-03"
