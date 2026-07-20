#!/usr/bin/env bash
# verify.sh — wave18-02: /test/[id] never mints/sets-cookie during render.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="app/(app)/test/[id]/page.tsx"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# 1. read-only resolver, no mint-capable calls in the page render.
grep -qE 'getAnonUser' "$F" || { echo "FAIL: test page does not use getAnonUser"; exit 1; }
if grep -qE 'requirePlayableUser|getOrCreateAnonUser' "$F"; then
  echo "FAIL: test page still uses a mint-capable resolver in render"; exit 1
fi
grep -qE 'isValueFirstFunnelEnabled' "$F" || { echo "FAIL: test page not flag-aware"; exit 1; }
grep -qE 'requireUser' "$F" || { echo "FAIL: flag-OFF requireUser fallback missing"; exit 1; }

# 2. save-progress invitation still wired.
grep -qE 'SaveProgressPrompt' "$F" || { echo "FAIL: SaveProgressPrompt removed"; exit 1; }

# 3. new integration test exists.
T="lib/server/test-page-no-mint.integration.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

# 4. typecheck + unit + the new integration test.
npx tsc --noEmit
npm test
npx vitest run --config vitest.integration.config.ts "$T"

echo "PASS: wave18-02"
