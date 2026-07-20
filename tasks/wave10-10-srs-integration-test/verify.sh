#!/usr/bin/env bash
# verify.sh — wave10-10 (SRS dual-write integration test).
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
T="lib/server/srs-review.integration.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$T" ] || fail "$T missing"

# Required assertions present in the test source.
grep -q 'createOfficialQuestion' "$T" || fail "$T must self-provision via createOfficialQuestion"
grep -q 'clientEventId' "$T"           || fail "$T must assert clientEventId idempotency"
grep -q 'importOfficial' "$T"          || fail "$T must re-run importOfficial and assert unchanged ids"
grep -Eq 'reviewState|ReviewState' "$T" || fail "$T must assert a ReviewState was written"
grep -Eq 'reviewLog|ReviewLog' "$T"     || fail "$T must assert ReviewLog rows"
grep -Eq 'afterAll' "$T"                || fail "$T must have an FK-safe afterAll cleanup"

# Included in the integration suite.
ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ilist" | grep -q "srs-review.integration.test.ts" \
  || fail "srs-review.integration.test.ts not in the integration suite"

# Runs green (seeded DB assumed live from wave10-02).
echo "== srs-review integration suite =="
iout="$(npx vitest run --config vitest.integration.config.ts lib/server/srs-review.integration.test.ts 2>&1)"
echo "$iout" | tail -14
echo "$iout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "srs-review integration test reported failures" || true
echo "$iout" | grep -Eqi "no test|0 passed" && fail "srs-review integration test ran zero tests (vacuous)" || true

echo "PASS: wave10-10 — SRS integration test present, included, green"
