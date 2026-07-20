#!/usr/bin/env bash
# verify.sh — wave10-08 (recordReview DB orchestration helper).
# Static + typecheck gate; the behavioural proof (create/idempotent/lapse) is wave10-10's integration test.
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/server/study.ts"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq 'export (async )?(function|const) recordReview\b' "$SRC" || fail "$SRC must export recordReview"

# Reuse the pure FSRS math, not a re-derivation.
grep -q 'lib/fsrs' "$SRC" || fail "$SRC must import the FSRS engine from lib/fsrs"
grep -Eq 'deriveGrade' "$SRC" || fail "$SRC must call deriveGrade"
grep -Eq 'schedule' "$SRC" || fail "$SRC must call schedule"

# Writes both spine tables.
grep -Eq 'reviewState' "$SRC" || fail "$SRC must upsert ReviewState (tx.reviewState.*)"
grep -Eq 'reviewLog' "$SRC" || fail "$SRC must append ReviewLog (tx.reviewLog.*)"

# Idempotency guard references clientEventId.
grep -q 'clientEventId' "$SRC" || fail "$SRC must implement clientEventId idempotency"

# Uses the passed tx client (no self-opened transaction).
grep -Eq '\$transaction' "$SRC" && fail "$SRC must NOT open its own \$transaction (it receives tx)" || true

echo "== typecheck =="; npm run typecheck 2>&1 | tail -3
tout="$(npm test 2>&1)"; echo "$tout" | tail -5
echo "$tout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "PASS: wave10-08 — recordReview present + typecheck/test green (behaviour proven by wave10-10)"
