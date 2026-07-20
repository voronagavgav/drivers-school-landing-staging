#!/usr/bin/env bash
# verify.sh — wave1-sec-12 (finishSession idempotent + integration test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
E="lib/server/test-engine.ts"
IT="lib/server/finish-idempotency.integration.test.ts"

# 1. finishSession guards on IN_PROGRESS status.
body="$(awk '/export async function finishSession/{f=1} f{print} /^}/{if(f){print "###END"; exit}}' "$E")"
echo "$body" | grep -q "IN_PROGRESS" \
  || { echo "FAIL: finishSession does not reference IN_PROGRESS (no idempotency guard)"; exit 1; }
# 2. Ownership guard preserved.
echo "$body" | grep -Eq "findFirst" || { echo "FAIL: finishSession lost its ownership findFirst guard"; exit 1; }

# 3. Integration test present + asserts snapshot count + double finish.
[ -f "$IT" ] || { echo "FAIL: $IT missing"; exit 1; }
grep -q "finishSession" "$IT" || { echo "FAIL: $IT does not call finishSession"; exit 1; }
grep -Eqi "progressSnapshot" "$IT" || { echo "FAIL: $IT does not assert ProgressSnapshot count"; exit 1; }
# Must finish at least twice (two finishSession invocations in the file).
[ "$(grep -c "finishSession(" "$IT")" -ge 2 ] || { echo "FAIL: $IT must call finishSession twice"; exit 1; }

# 5. Typecheck + fast suite.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest unit suite reported failures"; exit 1; }

# 4. Integration suite green.
echo "Running npm run test:integration…"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi "[1-9][0-9]* failed" && { echo "FAIL: integration suite reported failures"; exit 1; }
echo "$iout" | grep -Eq "Tests[[:space:]]+[0-9]+ passed" || { echo "FAIL: integration suite did not report passing tests"; exit 1; }

echo "PASS: wave1-sec-12 finishSession idempotent + integration test green"
