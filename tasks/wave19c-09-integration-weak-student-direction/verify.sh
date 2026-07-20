#!/usr/bin/env bash
# wave19c-09 — production-path direction test exists, collects, and passes; prior gates untouched.
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/server/readiness-estimation.integration.test.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# Binds on the weak population + audit fields (comment-stripped copy not needed: these are code tokens).
grep -Eq "rhoEst" "$F" || { echo "FAIL: rhoEst assert missing"; exit 1; }
grep -Eq "dialIndep" "$F" || { echo "FAIL: dialIndep assert missing"; exit 1; }
grep -Eq "nEff" "$F" || { echo "FAIL: nEff assert missing"; exit 1; }
grep -Eqi "weak" "$F" || { echo "FAIL: no weak-student fixture named"; exit 1; }
grep -Eq "toBeLessThanOrEqual" "$F" || { echo "FAIL: direction (≤ independence) assert missing"; exit 1; }

# The binding wave19b gates must be untouched by this task.
git diff --quiet HEAD -- lib/readiness-honesty.regression.test.ts || { echo "FAIL: honesty gate edited"; exit 1; }

npm run -s typecheck
npm run -s db:seed
npm run -s test:integration

ILIST=""; for _ in 1 2 3 4 5; do ILIST="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"; grep -q readiness-estimation <<<"$ILIST" && break; done
grep -q readiness-estimation <<<"$ILIST" || { echo "FAIL: readiness-estimation integration not collected"; exit 1; }

echo "PASS wave19c-09"
