#!/usr/bin/env bash
# verify.sh — wave7-02 (additive questionKey/optionKey columns + migration)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SCHEMA="prisma/schema.prisma"
fail() { echo "FAIL: $1"; exit 1; }

# 1-2. Schema has both keyed columns (unique) + indexes.
grep -Eq 'questionKey[[:space:]]+String\?[[:space:]]+@unique' "$SCHEMA" \
  || fail "Question.questionKey String? @unique missing from $SCHEMA"
grep -Eq 'optionKey[[:space:]]+String\?[[:space:]]+@unique' "$SCHEMA" \
  || fail "QuestionOption.optionKey String? @unique missing from $SCHEMA"
grep -q '@@index(\[questionKey\])' "$SCHEMA" || fail "@@index([questionKey]) missing"
grep -q '@@index(\[optionKey\])'   "$SCHEMA" || fail "@@index([optionKey]) missing"

# 3. Schema diff vs the wave base is ONLY key columns/indexes (no other field churn). Heuristic:
#    every ADDED line (git diff) must mention questionKey or optionKey.
BASE="$(git merge-base HEAD origin/main 2>/dev/null || echo HEAD)"
ADDED="$(git diff "$BASE" -- "$SCHEMA" 2>/dev/null | grep -E '^\+' | grep -v '^\+\+\+' || true)"
if [ -n "$ADDED" ]; then
  echo "$ADDED" | grep -vqE 'questionKey|optionKey' \
    && fail "schema.prisma added lines beyond questionKey/optionKey: $ADDED" || true
fi

# 4. Hand-authored migration: 2 single-column ALTERs + 2 unique indexes; no NOT NULL / DEFAULT on the cols.
MIG="$(ls -d prisma/migrations/*_question_option_keys 2>/dev/null | head -1 || true)"
[ -n "$MIG" ] && [ -f "$MIG/migration.sql" ] || fail "migration dir *_question_option_keys/migration.sql not found"
SQL="$MIG/migration.sql"
grep -Eq 'ALTER TABLE "Question" ADD COLUMN "questionKey" TEXT' "$SQL" \
  || fail "migration missing additive Question.questionKey ADD COLUMN"
grep -Eq 'ALTER TABLE "QuestionOption" ADD COLUMN "optionKey" TEXT' "$SQL" \
  || fail "migration missing additive QuestionOption.optionKey ADD COLUMN"
grep -Eqi 'CREATE UNIQUE INDEX.*questionKey' "$SQL" || fail "migration missing unique index on questionKey"
grep -Eqi 'CREATE UNIQUE INDEX.*optionKey'   "$SQL" || fail "migration missing unique index on optionKey"
# additive/data-preserving: the new key columns must NOT be declared NOT NULL or carry a DEFAULT.
grep -Eqi 'ADD COLUMN "(question|option)Key" TEXT (NOT NULL|DEFAULT)' "$SQL" \
  && fail "key column declared NOT NULL/DEFAULT — must be nullable & additive" || true
# exactly one ADD COLUMN per ALTER statement (SQLite): no ALTER line carries two ADD COLUMNs.
grep -E 'ALTER TABLE' "$SQL" | grep -Eq 'ADD COLUMN.*ADD COLUMN' \
  && fail "an ALTER TABLE has multiple ADD COLUMNs (SQLite forbids)" || true

# 5. Migration applies cleanly (idempotent — already-applied is a no-op exit 0).
npx prisma migrate deploy 2>&1 | tail -5

# 6. Client regen + typecheck.
npx prisma generate 2>&1 | tail -3
npm run typecheck 2>&1 | tail -3

echo "PASS: wave7-02 questionKey/optionKey columns + additive migration applied; typecheck green"
