#!/usr/bin/env bash
# verify.sh — wave18-03: activation_aha fires for the diagnostic-first cohort (first-reveal gate).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/server/test-engine.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# 1. The firing block must no longer gate on a bare unfiltered global count === 1.
#    Heuristic: the count query around activation_aha must reference explanation and mode filtering.
#    Extract the activation_aha region and check it does NOT rely solely on { testSession: { userId } }.
region="$(awk '/activation_aha/{c=1} c{print} c&&/recordEvent\("activation_aha"/{n++} n&&/\}\)/{c=0}' "$F")"
echo "$region" | grep -qE 'explanation' \
  || { echo "FAIL: activation_aha gate does not filter on explanation"; exit 1; }
echo "$region" | grep -qE 'EXAM_SIMULATION|DIAGNOSTIC|showsImmediateFeedback|notIn|FEEDBACK' \
  || { echo "FAIL: activation_aha gate does not filter on feedback mode"; exit 1; }

# 2. new oracle integration test present.
T="lib/server/activation-aha.integration.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

# 3. typecheck + unit + the oracle integration test.
npx tsc --noEmit
npm test
npx vitest run --config vitest.integration.config.ts "$T"

echo "PASS: wave18-03"
