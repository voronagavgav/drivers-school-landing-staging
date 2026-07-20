#!/usr/bin/env bash
# verify.sh — wave10-09 (submitAnswer SRS dual-write, transactional, additive).
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TE="lib/server/test-engine.ts"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$TE" ] || fail "$TE missing"

# 1. New optional params on submitAnswer.
grep -q 'clientEventId' "$TE" || fail "$TE: submitAnswer must accept clientEventId"
grep -q 'latencyMs' "$TE"     || fail "$TE: submitAnswer must accept latencyMs"
grep -q 'confidence' "$TE"    || fail "$TE: submitAnswer must accept/persist confidence"

# 2. Transactional dual-write calling recordReview.
grep -Eq '\$transaction' "$TE" || fail "$TE: submitAnswer writes must be wrapped in a prisma.\$transaction"
grep -q 'recordReview' "$TE"    || fail "$TE: submitAnswer must call recordReview"
grep -q 'study' "$TE"           || fail "$TE: submitAnswer must import from lib/server/study"

# 3. Feedback shape preserved (still returns recorded/correctOptionId/explanation).
grep -q 'recorded' "$TE"        || fail "$TE: feedback must still return 'recorded'"
grep -q 'correctOptionId' "$TE" || fail "$TE: feedback must still return 'correctOptionId'"
grep -q 'explanation' "$TE"     || fail "$TE: feedback must still return 'explanation'"

# 4. typecheck + build.
echo "== typecheck =="; npm run typecheck 2>&1 | tail -3
echo "== build =="; npm run build 2>&1 | tail -8

# 5. Existing integration suites must still pass (seeded DB assumed live from wave10-02).
echo "== targeted integration suites =="
iout="$(npx vitest run --config vitest.integration.config.ts \
  lib/server/engine.integration.test.ts \
  lib/server/finish-idempotency.integration.test.ts \
  lib/server/access-control.integration.test.ts 2>&1)"
echo "$iout" | tail -14
echo "$iout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "an existing integration suite regressed" || true

# 6. Unit suite green.
tout="$(npm test 2>&1)"; echo "$tout" | tail -5
echo "$tout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "PASS: wave10-09 — submitAnswer dual-write transactional + additive; typecheck/build/integration green"
