#!/usr/bin/env bash
# verify.sh — wave18-01: /result no longer walls an anon at the free payoff.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="app/(app)/test/[id]/result/page.tsx"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# 1. read-only resolver: getAnonUser imported, NO mint-capable resolver in the page render.
grep -qE 'getAnonUser' "$F" || { echo "FAIL: result page does not use getAnonUser"; exit 1; }
if grep -qE 'getOrCreateAnonUser|requirePlayableUser' "$F"; then
  echo "FAIL: result page must NOT mint/set-cookie (found getOrCreateAnonUser/requirePlayableUser)"; exit 1
fi
grep -qE 'isValueFirstFunnelEnabled' "$F" || { echo "FAIL: result page not flag-aware"; exit 1; }
grep -qE 'requireUser' "$F" || { echo "FAIL: flag-OFF requireUser fallback missing"; exit 1; }

# 2. offer/dial stay gated (still guarded by showOffer / dialReal — invariant intact).
grep -qE 'showOffer' "$F" || { echo "FAIL: showOffer gate removed"; exit 1; }

# 3. CLAUDE.md learning reworded — the exact misleading whole-page claim is gone.
if grep -qE 'BOUNCES to .*login. and never sees it' CLAUDE.md; then
  echo "FAIL: misleading /result-requireUser learning still present in CLAUDE.md"; exit 1
fi

# 4. new integration test file exists and is collected.
T="lib/server/result-anon.integration.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

# 5. typecheck + unit + the new integration test.
npx tsc --noEmit
npm test
npx vitest run --config vitest.integration.config.ts "$T"

echo "PASS: wave18-01"
