#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
T=lib/server/never-gated.integration.test.ts
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -q 'NEVER-GATED-CONTRACT' "$T" || { echo "FAIL: contract marker missing"; exit 1; }
grep -q 'startTestAction' "$T" || { echo "FAIL: does not drive the real startTestAction"; exit 1; }
grep -q 'EXAM_SIMULATION' "$T" || { echo "FAIL: simulator path not asserted"; exit 1; }
grep -q 'submitAnswer' "$T" || { echo "FAIL: answer/explanation path not asserted"; exit 1; }
grep -q 'q-image' "$T" || { echo "FAIL: image route not asserted"; exit 1; }
grep -q 'computeProgress' "$T" || { echo "FAIL: progress history not asserted"; exit 1; }
grep -q 'ENTITLEMENTS_ENABLED' "$T" || { echo "FAIL: flag-ON state not exercised"; exit 1; }
# The free set must not consult the gate
if grep -En 'lib/entitlements|lib/server/entitlements' "$T"; then
  echo "FAIL: never-gated test imports the entitlement gate"; exit 1
fi
# Test file actually collected by the integration runner
x="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$x" | grep -q 'never-gated' || { echo "FAIL: file not collected by integration runner"; exit 1; }
# No production changes
prod="$(git diff --name-only HEAD | grep -vE '^(tasks/|lib/server/never-gated\.integration\.test\.ts)' || true)"
[ -z "$prod" ] || { echo "FAIL: production files changed: $prod"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "OK wave16-09"
