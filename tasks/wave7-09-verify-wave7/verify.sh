#!/usr/bin/env bash
# verify.sh — wave7-09 (Wave-7 acceptance gate; VERIFY-ONLY)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SCHEMA="prisma/schema.prisma"
IMP="scripts/import-official.ts"
CK="lib/content-key.ts"
SEEDTEST="lib/server/seed-content.integration.test.ts"
DB="prisma/dev.db"
fail() { echo "FAIL: $1"; exit 1; }
command -v sqlite3 >/dev/null 2>&1 || fail "sqlite3 not available"

# 1. typecheck.
npm run typecheck 2>&1 | tail -3

# 2. unit tests + both new unit test files present in the suite.
vlist="$(npx vitest list 2>/dev/null || true)"
echo "$vlist" | grep -q "lib/content-key.test.ts" || fail "content-key.test.ts not in unit suite"
echo "$vlist" | grep -q "lib/content-override.test.ts" || fail "content-override.test.ts not in unit suite"
tout="$(npm test 2>&1)"; echo "$tout" | tail -5
echo "$tout" | grep -Eqi " failed|✗ " && fail "npm test reported failures" || true

# 3. official-only seed + integration suite incl. content-upsert.
sout="$(npm run db:seed 2>&1)"; echo "$sout" | tail -4
OFF="$(sqlite3 "$DB" "SELECT COUNT(*) FROM Question WHERE sourceType='OFFICIAL' AND isPublished=1;")"
DEMO="$(sqlite3 "$DB" "SELECT COUNT(*) FROM Question WHERE isDemo=1 OR sourceType='DEMO';")"
[ "$OFF" -ge 1000 ] || fail "official published count $OFF (<1000)"
[ "$DEMO" = "0" ] || fail "demo count $DEMO (must be 0 — official-only)"
ivlist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ivlist" | grep -q "content-upsert.integration.test.ts" \
  || fail "content-upsert.integration.test.ts not in integration suite"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures" || true

# 4. build.
npm run build 2>&1 | tail -5

# 5. Migration applied: both keyed columns present + indexed; schema diff scoped to keys only.
grep -Eq 'questionKey[[:space:]]+String\?[[:space:]]+@unique' "$SCHEMA" || fail "Question.questionKey missing from schema"
grep -Eq 'optionKey[[:space:]]+String\?[[:space:]]+@unique' "$SCHEMA" || fail "QuestionOption.optionKey missing from schema"
grep -q '@@index(\[questionKey\])' "$SCHEMA" || fail "@@index([questionKey]) missing"
grep -q '@@index(\[optionKey\])' "$SCHEMA" || fail "@@index([optionKey]) missing"
BASE="$(git merge-base HEAD origin/main 2>/dev/null || echo HEAD)"
ADDED="$(git diff "$BASE" -- "$SCHEMA" 2>/dev/null | grep -E '^\+' | grep -vE '^\+\+\+' || true)"
if [ -n "$ADDED" ]; then
  echo "$ADDED" | grep -vqE 'questionKey|optionKey' \
    && fail "schema.prisma diff touches more than the key columns/indexes" || true
fi

# 6. Static: importer upsert + no progress-deletes; content-key exported + pure; seed-content test gone.
grep -q "question.upsert" "$IMP" || fail "$IMP must use upsert"
for m in testAnswer testSessionQuestion userMistake savedQuestion; do
  grep -Eq "prisma\.${m}\.deleteMany|prisma\.${m}\.delete\b" "$IMP" \
    && fail "$IMP still deletes ${m} (must never delete user progress)" || true
done
grep -Eq 'export (function|const) questionKey' "$CK" || fail "$CK must export questionKey"
grep -Eq 'export (function|const) optionKey' "$CK" || fail "$CK must export optionKey"
for tok in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Math.random' 'Date.now' 'new Date'; do
  grep -Fq "$tok" "$CK" && fail "$CK contains forbidden token '$tok' (must stay pure)" || true
done
[ ! -f "$SEEDTEST" ] || fail "$SEEDTEST still exists (must be deleted)"

echo "GATE PASS: Wave 7 acceptance — official=$OFF demo=0; keys+upsert+override+official-only all green"
