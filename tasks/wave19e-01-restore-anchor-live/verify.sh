#!/usr/bin/env bash
# verify.sh — wave19e-01 restore mock anchor on the live dial.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/server/mastery-readiness.ts"

# 1. Anchor formula + strength import present in the SERVER module.
grep -q "READINESS_ANCHOR_STRENGTH" "$F" || { echo "FAIL: READINESS_ANCHOR_STRENGTH not referenced in $F"; exit 1; }
# anchor applied to both release.final and release.independence (allow a helper fn wrapping them).
grep -Eq "release\.(final|independence)" "$F" || { echo "FAIL: release.final/independence not read in $F"; exit 1; }

# 4. inputsJson append-only: mock kept AND anchored:true added.
grep -Eq "mock:\s*\{\s*m\s*,\s*k\s*\}" "$F" || { echo "FAIL: mock:{m,k} audit field missing/renamed"; exit 1; }
grep -Eq "anchored:\s*true" "$F" || { echo "FAIL: inputsJson missing anchored:true"; exit 1; }

# 8. release oracle untouched by this wave (compared to the wave19e base commit 09b8097; working tree).
if ! git diff --quiet 09b8097 -- lib/readiness-release.oracle.test.ts; then
  echo "FAIL: lib/readiness-release.oracle.test.ts changed vs wave base 09b8097 (must stay untouched)"; exit 1; fi

# 9. neutralized draw-side constant byte-untouched.
grep -Eq "^export const READINESS_TOPIC_CORRELATION = 0;" lib/constants.ts \
  || { echo "FAIL: READINESS_TOPIC_CORRELATION no longer exactly '= 0'"; exit 1; }

# 6/7. typecheck + pure unit suite.
npm run -s typecheck
npm test

echo "PASS wave19e-01"
