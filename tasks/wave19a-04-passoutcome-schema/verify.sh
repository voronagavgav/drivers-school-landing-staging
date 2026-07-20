#!/usr/bin/env bash
# Verify wave19a-04: PassOutcome model + migration applied additively to dev.db.
set -euo pipefail
cd "$(dirname "$0")/../.."

fail() { echo "FAIL: $1" >&2; exit 1; }
DB=prisma/dev.db

# 1. Schema model + fields.
grep -Eq 'model[[:space:]]+PassOutcome' prisma/schema.prisma || fail "model PassOutcome missing from schema"
for f in predictedPassProbability passed 'source' createdAt; do
  grep -q "$f" prisma/schema.prisma || fail "PassOutcome field $f missing"
done
grep -Eq 'passOutcomes[[:space:]]+PassOutcome\[\]' prisma/schema.prisma || fail "reverse relation passOutcomes[] missing (User/Category)"

# 2. Hand-authored migration present.
MIG="$(find prisma/migrations -type d -name '*pass_outcome*' 2>/dev/null | head -1)"
[ -n "$MIG" ] || fail "pass_outcome migration dir missing"
grep -Eiq 'CREATE TABLE .*PassOutcome' "$MIG/migration.sql" || fail "migration does not CREATE TABLE PassOutcome"

# 3. migrate status clean.
npx prisma migrate status 2>&1 | grep -Eiq 'up to date|no pending|Database schema is up to date' \
  || fail "prisma migrate status not clean (pending migrations?)"

# 4. Table + columns present in dev.db.
TBL="$(sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='table' AND name='PassOutcome';")"
[ "$TBL" = "PassOutcome" ] || fail "PassOutcome table not in dev.db"
COLS="$(sqlite3 "$DB" "SELECT name FROM pragma_table_info('PassOutcome');" | tr '\n' ' ')"
for c in id userId predictedPassProbability passed categoryId source createdAt; do
  echo "$COLS" | grep -qw "$c" || fail "column $c missing from PassOutcome ($COLS)"
done

# 5. FK on-delete actions.
CATDEL="$(sqlite3 "$DB" "SELECT \"on_delete\" FROM pragma_foreign_key_list('PassOutcome') WHERE \"table\"='Category';")"
[ "$CATDEL" = "SET NULL" ] || fail "Category FK on_delete=$CATDEL, expected SET NULL"
USRDEL="$(sqlite3 "$DB" "SELECT \"on_delete\" FROM pragma_foreign_key_list('PassOutcome') WHERE \"table\"='User';")"
[ "$USRDEL" = "CASCADE" ] || fail "User FK on_delete=$USRDEL, expected CASCADE"

# 6. Client typechecks with the new delegate.
npx prisma generate >/dev/null 2>&1 || fail "prisma generate failed"
npm run -s typecheck || fail "typecheck failed"

echo "PASS: wave19a-04 PassOutcome schema + migration applied"
