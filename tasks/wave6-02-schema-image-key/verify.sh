#!/usr/bin/env bash
# verify.sh — wave6-02 (additive Question.imageKey column + index, applied migration)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SCHEMA="prisma/schema.prisma"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Schema declares the column + index on Question.
grep -Eq "imageKey[[:space:]]+String\?" "$SCHEMA" || fail "$SCHEMA: no 'imageKey String?' field"
grep -Eq "@@index\(\[imageKey\]\)" "$SCHEMA"      || fail "$SCHEMA: no @@index([imageKey])"

# 2. The imageKey field sits inside the Question model (not some other model).
awk '/^model Question \{/{m=1} m&&/imageKey/{found=1} /^\}/{if(m)exit} END{exit !found}' "$SCHEMA" \
  || fail "imageKey is not declared inside the Question model"

# 3. A hand-authored migration dir for this column exists with ADDITIVE SQL.
mig="$(ls -d prisma/migrations/*_question_image_key 2>/dev/null | head -1 || true)"
[ -n "$mig" ] || fail "no prisma/migrations/*_question_image_key directory"
[ -f "$mig/migration.sql" ] || fail "$mig/migration.sql missing"
grep -Eqi "add[[:space:]]+column.*imageKey|imageKey" "$mig/migration.sql" \
  || fail "$mig/migration.sql does not add imageKey"
grep -Eqi "drop[[:space:]]+(table|column)" "$mig/migration.sql" \
  && fail "$mig/migration.sql contains a DROP — must be additive only"

# 4. Schema change is purely additive (no removed lines) when still uncommitted.
if ! git diff --quiet HEAD -- "$SCHEMA" 2>/dev/null; then
  removed="$(git diff HEAD -- "$SCHEMA" | grep -E '^-[^-]' || true)"
  [ -z "$removed" ] || fail "schema diff removes lines (not additive):"$'\n'"$removed"
fi

# 5. Generated client knows imageKey (client regenerated).
grep -rqi "imageKey" lib/generated/prisma 2>/dev/null \
  || fail "lib/generated/prisma has no imageKey — run 'npx prisma generate'"

# Informational: migration status.
npx prisma migrate status 2>&1 | tail -5 || true

# 6. Typecheck.
npm run typecheck 2>&1 | tail -3

echo "PASS: wave6-02 Question.imageKey column + index + migration + generate"
