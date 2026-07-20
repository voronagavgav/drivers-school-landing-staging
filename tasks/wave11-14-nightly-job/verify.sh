#!/usr/bin/env bash
# verify.sh — wave11-14 nightly recompute job.
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }
JOB="scripts/nightly-readiness.ts"
[ -f "$JOB" ] || fail "$JOB missing"

# never @/lib/db in the script file; own libsql client.
grep -Eq '@/lib/db' "$JOB" && fail "$JOB imports @/lib/db (must construct its own client)" || true
grep -Eq 'PrismaLibSql' "$JOB" || fail "$JOB must construct its own libsql-adapter client"
# reuses wave11-08 recompute fns (no duplicated logic).
grep -Eq 'recomputeReadiness' "$JOB" || fail "$JOB must reuse recomputeReadiness"
grep -Eq 'recomputeTopicMastery' "$JOB" || fail "$JOB must reuse recomputeTopicMastery"
# chunking evidence.
grep -Eq '200|CHUNK|take:' "$JOB" || fail "$JOB shows no ≤200 chunk/paging evidence"

# ops artifacts.
[ -f ops/com.drivers.nightly-readiness.plist ] || fail "launchd plist missing"
grep -Eiq '03:30|StartCalendarInterval|Hour' ops/com.drivers.nightly-readiness.plist || fail "plist has no schedule"
ls ops/README* >/dev/null 2>&1 || fail "ops/README(.md) missing"
grep -Eq 'launchctl bootstrap' ops/README* || fail "ops README does not document the bootstrap command"

# run twice on seeded DB — both exit 0 (idempotent-ish).
npm run db:seed 2>&1 | tail -2
echo "-- run 1 --"; npx tsx --conditions=react-server "$JOB" 2>&1 | tail -3
echo "-- run 2 --"; npx tsx --conditions=react-server "$JOB" 2>&1 | tail -3

npm run typecheck 2>&1 | tail -3
echo "PASS: nightly job runs twice, exits 0, ops artifacts present"
