#!/usr/bin/env bash
# wave22-06: additive Elo columns present in schema, migration, and applied DB; typecheck + unit green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

S="prisma/schema.prisma"
grep -qE 'eloBeta\s+Float\?' "$S"                 || { echo "FAIL: eloBeta Float? missing in schema"; exit 1; }
grep -qE 'eloAnswerCount\s+Int\s+@default\(0\)' "$S" || { echo "FAIL: eloAnswerCount Int @default(0) missing"; exit 1; }
grep -qE 'difficulty\s+Int\s+@default\(1\)' "$S"  || { echo "FAIL: difficulty must stay Int @default(1)"; exit 1; }

# Migration dir exists and is scoped to the two ADD COLUMNs.
MIG="$(find prisma/migrations -maxdepth 1 -type d -name '*_elo_item_difficulty' | head -1)"
[ -n "$MIG" ] || { echo "FAIL: elo_item_difficulty migration dir missing"; exit 1; }
SQL="$MIG/migration.sql"
[ -f "$SQL" ] || { echo "FAIL: $SQL missing"; exit 1; }
grep -qE 'ADD COLUMN "eloBeta"' "$SQL"        || { echo "FAIL: migration missing eloBeta ADD COLUMN"; exit 1; }
grep -qE 'ADD COLUMN "eloAnswerCount"' "$SQL" || { echo "FAIL: migration missing eloAnswerCount ADD COLUMN"; exit 1; }
# No out-of-scope DDL (only ALTER TABLE lines carry statements).
if grep -iE 'CREATE TABLE|DROP TABLE|CREATE INDEX|RENAME TO' "$SQL"; then
  echo "FAIL: out-of-scope DDL in migration.sql (strip drift)"; exit 1
fi

# Applied DB columns present.
DB="prisma/dev.db"
if command -v sqlite3 >/dev/null 2>&1 && [ -f "$DB" ]; then
  COLS="$(sqlite3 "$DB" "PRAGMA table_info('Question')" || true)"
  grep -q "eloBeta" <<<"$COLS"        || { echo "FAIL: eloBeta not applied to dev.db"; exit 1; }
  grep -q "eloAnswerCount" <<<"$COLS" || { echo "FAIL: eloAnswerCount not applied to dev.db"; exit 1; }
fi

echo "=== typecheck ==="; npm run -s typecheck
echo "=== npm test ==="; npm test

echo "PASS: wave22-06"
