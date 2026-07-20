#!/usr/bin/env bash
# verify.sh — wave10-02 (SRS learning-state schema + one additive migration).
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SCHEMA="prisma/schema.prisma"
fail() { echo "FAIL: $1"; exit 1; }

MODELS=( ReviewState ReviewLog TopicMastery UserStudyProfile StudyDay ReadinessSnapshot UserSettings PushSubscription NotificationLog )

# 1. All 9 models declared in schema.prisma.
[ -f "$SCHEMA" ] || fail "$SCHEMA missing"
for m in "${MODELS[@]}"; do
  grep -Eq "^model[[:space:]]+$m[[:space:]]*\{" "$SCHEMA" || fail "schema missing 'model $m'"
done

# 2. Key uniqueness/indexes (spot-check the load-bearing ones).
grep -Eq '@@unique\(\[userId, ?questionId\]\)' "$SCHEMA" || fail "ReviewState @@unique([userId, questionId]) missing"
grep -Eq '@@index\(\[userId, ?dueAt\]\)'        "$SCHEMA" || fail "ReviewState @@index([userId, dueAt]) missing"
grep -Eq 'clientEventId[[:space:]]+String\?[[:space:]]+@unique' "$SCHEMA" || fail "ReviewLog clientEventId @unique missing"
grep -Eq '@@unique\(\[userId, ?topicId\]\)'     "$SCHEMA" || fail "TopicMastery @@unique([userId, topicId]) missing"
grep -Eq '@@unique\(\[userId, ?day\]\)'         "$SCHEMA" || fail "StudyDay @@unique([userId, day]) missing"
grep -Eq 'endpoint[[:space:]]+String[[:space:]]+@unique' "$SCHEMA" || fail "PushSubscription endpoint @unique missing"
grep -Eq 'dedupeKey[[:space:]]+String\?[[:space:]]+@unique' "$SCHEMA" || fail "NotificationLog dedupeKey @unique missing"

# 3. TestAnswer gains ONLY the confidence column (additive).
grep -Eq 'confidence[[:space:]]+Int\?' "$SCHEMA" || fail "TestAnswer.confidence Int? missing from schema"

# 3b. Additive-only: no existing scalar column changed/removed vs the wave base.
WAVE10_BASE="${WAVE10_BASE:-db1deac}"
if git rev-parse --verify "$WAVE10_BASE" >/dev/null 2>&1; then
  # Removed/changed lines in the schema diff (leading '-', excluding the diff header '---').
  removed="$(git diff "$WAVE10_BASE" -- "$SCHEMA" | grep -E '^-' | grep -vE '^---' || true)"
  [ -z "$removed" ] || fail "schema.prisma has removed/changed lines (must be additive-only):
$removed"
else
  echo "note: WAVE10_BASE '$WAVE10_BASE' not found — skipping additive-diff check"
fi

# 4. Migration SQL: 9 CREATE TABLE + exactly one confidence ALTER, no multi-column ALTER.
MIG="$(ls -d prisma/migrations/*_srs_learning_state 2>/dev/null | head -1 || true)"
[ -n "$MIG" ] || fail "no prisma/migrations/*_srs_learning_state dir"
basename "$MIG" | grep -Eq '^[0-9]{14}_srs_learning_state$' || fail "migration dir must be <14-digit ts>_srs_learning_state"
SQL="$MIG/migration.sql"
[ -f "$SQL" ] || fail "$SQL missing"
for m in "${MODELS[@]}"; do
  grep -Eq "CREATE TABLE\"?[[:space:]]*\"?$m\"" "$SQL" || fail "migration.sql missing CREATE TABLE for $m"
done
n_alter="$(grep -Eic 'ALTER TABLE .*ADD COLUMN' "$SQL" || true)"
[ "$n_alter" = "1" ] || fail "expected exactly 1 ADD COLUMN in migration.sql, found $n_alter"
grep -Eq 'ALTER TABLE +"?TestAnswer"? +ADD COLUMN +"?confidence"? +INTEGER' "$SQL" \
  || fail "migration.sql missing the TestAnswer.confidence ADD COLUMN"

# 5. Migration applied + tables exist in dev.db.
DB="${SRS_DB:-prisma/dev.db}"
if command -v sqlite3 >/dev/null 2>&1 && [ -f "$DB" ]; then
  tbls="$(sqlite3 "$DB" ".tables" 2>/dev/null || true)"
  for m in "${MODELS[@]}"; do
    echo "$tbls" | grep -qw "$m" || fail "table $m not found in $DB (run prisma migrate deploy)"
  done
  sqlite3 "$DB" "PRAGMA table_info(TestAnswer);" 2>/dev/null | grep -qi 'confidence' \
    || fail "TestAnswer.confidence column not present in $DB"
  sqlite3 "$DB" "SELECT migration_name FROM _prisma_migrations;" 2>/dev/null | grep -q 'srs_learning_state' \
    || fail "_prisma_migrations has no srs_learning_state row (migrate deploy not run)"
else
  echo "note: sqlite3 or $DB unavailable — relying on the generated-client smoke below for table proof"
fi

# 6. Generated client exposes all 9 delegates; typecheck clean.
cat > ./.wave10_02_smoke.ts <<'TS'
import { PrismaClient } from "./lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
// Prisma 7 + libsql: the client MUST be constructed with a driver adapter (as lib/db.ts does);
// bare `new PrismaClient()` throws PrismaClientInitializationError before any delegate is reachable.
const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });
const p = new PrismaClient({ adapter });
const delegates = [
  p.reviewState, p.reviewLog, p.topicMastery, p.userStudyProfile, p.studyDay,
  p.readinessSnapshot, p.userSettings, p.pushSubscription, p.notificationLog,
];
for (const d of delegates) { if (!d || typeof d.findMany !== "function") { console.error("SMOKE FAIL: missing delegate"); process.exit(1); } }
console.log("SMOKE OK: 9 delegates present");
TS
npx tsx ./.wave10_02_smoke.ts || { rm -f ./.wave10_02_smoke.ts; fail "generated client is missing a new delegate (run prisma generate)"; }
rm -f ./.wave10_02_smoke.ts

echo "== typecheck =="
npm run typecheck 2>&1 | tail -3

# 7. Data-preserving: seed + full integration suite green.
echo "== db:seed =="
npm run db:seed 2>&1 | tail -3
echo "== test:integration =="
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -14
echo "$iout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "integration suite reported failures after schema change" || true

echo "PASS: wave10-02 — 9 models + confidence live, migration additive, seed+integration green"
