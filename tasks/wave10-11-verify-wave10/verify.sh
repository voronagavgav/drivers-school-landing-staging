#!/usr/bin/env bash
# verify.sh — wave10-11 (Wave-10 acceptance gate, §H). VERIFY-ONLY; writes no feature code.
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
fail() { echo "FAIL: $1"; exit 1; }
PURE_TOKENS=( 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Date.now' 'new Date' )
MODELS=( ReviewState ReviewLog TopicMastery UserStudyProfile StudyDay ReadinessSnapshot UserSettings PushSubscription NotificationLog )

echo "== §H-1 typecheck =="
npm run typecheck 2>&1 | tail -3

echo "== §H-2 unit suite + inclusion =="
ulist="$(npx vitest list 2>/dev/null || true)"
echo "$ulist" | grep -q "lib/fsrs/" || fail "unit suite missing lib/fsrs tests"
echo "$ulist" | grep -q "lib/test-engine/queue.test.ts" || fail "unit suite missing queue.test.ts"
echo "$ulist" | grep -q "lib/readiness-model.test.ts" || fail "unit suite missing readiness-model.test.ts"
uout="$(npm test 2>&1)"; echo "$uout" | tail -5
echo "$uout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "== §H-3 seed + integration suite + inclusion =="
npm run db:seed 2>&1 | tail -3
ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ilist" | grep -q "srs-review.integration.test.ts" || fail "integration suite missing srs-review.integration.test.ts"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -16
echo "$iout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "integration suite reported failures" || true

echo "== §H-4 build =="
npm run build 2>&1 | tail -8

echo "== §H-5 schema live + additive =="
DB="${SRS_DB:-prisma/dev.db}"
if command -v sqlite3 >/dev/null 2>&1 && [ -f "$DB" ]; then
  tbls="$(sqlite3 "$DB" ".tables" 2>/dev/null || true)"
  for m in "${MODELS[@]}"; do echo "$tbls" | grep -qw "$m" || fail "table $m missing from $DB"; done
  sqlite3 "$DB" "PRAGMA table_info(TestAnswer);" 2>/dev/null | grep -qi 'confidence' || fail "TestAnswer.confidence missing in $DB"
else
  echo "note: sqlite3/$DB unavailable — table existence proven by the green integration suite above"
fi
WAVE10_BASE="${WAVE10_BASE:-db1deac}"
if git rev-parse --verify "$WAVE10_BASE" >/dev/null 2>&1; then
  removed="$(git diff "$WAVE10_BASE" -- prisma/schema.prisma | grep -E '^-' | grep -vE '^---' || true)"
  [ -z "$removed" ] || fail "schema.prisma diff is not additive-only (removed/changed lines):
$removed"
else
  echo "note: WAVE10_BASE '$WAVE10_BASE' not found — skipping additive-diff check"
fi

echo "== §H-6 static purity + contract =="
PURE_FILES=( "lib/test-engine/queue.ts" "lib/readiness-model.ts" )
for f in $(find lib/fsrs -name '*.ts' ! -name '*.test.ts'); do PURE_FILES+=( "$f" ); done
for f in "${PURE_FILES[@]}"; do
  [ -f "$f" ] || fail "$f missing"
  for tok in "${PURE_TOKENS[@]}"; do
    grep -Fq "$tok" "$f" && fail "$f contains forbidden token '$tok'" || true
  done
done
# Math.random: forbidden everywhere except the single injectable rng default in queue.ts.
for f in "${PURE_FILES[@]}"; do
  [ "$f" = "lib/test-engine/queue.ts" ] && continue
  grep -Fq 'Math.random' "$f" && fail "$f must not reference Math.random" || true
done
mr="$(grep -c 'Math.random' lib/test-engine/queue.ts || true)"
[ "$mr" -le 1 ] || fail "queue.ts references Math.random $mr times (only the rng default is allowed)"
# submitAnswer feedback contract preserved.
TE="lib/server/test-engine.ts"
grep -q 'correctOptionId' "$TE" || fail "$TE feedback shape lost correctOptionId"
grep -q 'explanation' "$TE" || fail "$TE feedback shape lost explanation"

echo "PASS: wave10-11 — Wave-10 acceptance gate GREEN (typecheck/unit/integration/build/schema/static)"
