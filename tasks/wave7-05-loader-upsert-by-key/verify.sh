#!/usr/bin/env bash
# verify.sh — wave7-05 (idempotent upsert-by-key loader; progress-preserving)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
IMP="scripts/import-official.ts"
DB="prisma/dev.db"
fail() { echo "FAIL: $1"; exit 1; }
command -v sqlite3 >/dev/null 2>&1 || fail "sqlite3 not available for DB assertions"

# 1. NO user-progress deletes + no wholesale delete-recreate.
for m in testAnswer testSessionQuestion userMistake savedQuestion; do
  grep -Eq "prisma\.${m}\.deleteMany|prisma\.${m}\.delete\b" "$IMP" \
    && fail "$IMP still deletes ${m} rows — loader must NEVER delete user progress" || true
done
grep -q "contentVersion.delete" "$IMP" && fail "$IMP still hard-deletes the prior contentVersion (delete-recreate)" || true

# 2-3. Uses upsert by questionKey/optionKey + derives keys from the pure helper.
grep -q "question.upsert" "$IMP" || fail "$IMP must upsert Question by key"
grep -Eq "questionKey|optionKey" "$IMP" || fail "$IMP must use questionKey/optionKey"
grep -q "content-key" "$IMP" || fail "$IMP must derive keys via lib/content-key.ts (single source of format)"

# 4. Deactivation path for absent-from-source questions (no hard delete).
grep -Eq "isActive: false|isActive:false" "$IMP" || fail "$IMP must deactivate absent-upstream questions (isActive:false)"

# --- Establish a baseline via db:seed (categories + official via the NEW loader) ---
npm run db:seed 2>&1 | tail -4

snap() { # $1 = output file: questionKey->id map + counts
  sqlite3 "$DB" "SELECT questionKey||'|'||id FROM Question WHERE sourceType='OFFICIAL' AND questionKey IS NOT NULL ORDER BY questionKey;" > "$1"
}
qcount() { sqlite3 "$DB" "SELECT COUNT(*) FROM Question WHERE sourceType='OFFICIAL';"; }
ocount() { sqlite3 "$DB" "SELECT COUNT(*) FROM \"QuestionOption\" o JOIN Question q ON o.questionId=q.id WHERE q.sourceType='OFFICIAL';"; }

snap /tmp/wave7_05_before.txt
QB="$(qcount)"; OB="$(ocount)"

# 5a. Every official question keyed; every official option keyed.
NOKEY_Q="$(sqlite3 "$DB" "SELECT COUNT(*) FROM Question WHERE sourceType='OFFICIAL' AND questionKey IS NULL;")"
[ "$NOKEY_Q" = "0" ] || fail "$NOKEY_Q official questions have NULL questionKey"
NOKEY_O="$(sqlite3 "$DB" "SELECT COUNT(*) FROM \"QuestionOption\" o JOIN Question q ON o.questionId=q.id WHERE q.sourceType='OFFICIAL' AND o.optionKey IS NULL;")"
[ "$NOKEY_O" = "0" ] || fail "$NOKEY_O official options have NULL optionKey"

# 5b. Every published question has exactly one correct option.
BADQ="$(sqlite3 "$DB" "SELECT COUNT(*) FROM Question q WHERE q.isPublished=1 AND (SELECT COUNT(*) FROM \"QuestionOption\" o WHERE o.questionId=q.id AND o.isCorrect=1) <> 1;")"
[ "$BADQ" = "0" ] || fail "$BADQ published questions lack exactly one correct option"

# 6. Idempotency: re-run the loader standalone, assert zero changes + ids preserved.
npx tsx "$IMP" 2>&1 | tail -4
snap /tmp/wave7_05_after.txt
QA="$(qcount)"; OA="$(ocount)"
[ "$QA" = "$QB" ] || fail "official question count changed on re-run ($QB -> $QA)"
[ "$OA" = "$OB" ] || fail "official option count changed on re-run ($OB -> $OA)"
diff -q /tmp/wave7_05_before.txt /tmp/wave7_05_after.txt >/dev/null \
  || fail "questionKey->id mapping changed on re-run (ids NOT preserved)"

# 7. Typecheck.
npm run typecheck 2>&1 | tail -3

rm -f /tmp/wave7_05_before.txt /tmp/wave7_05_after.txt
echo "PASS: wave7-05 upsert-by-key loader — no progress deletes, all rows keyed, one-correct-option, idempotent (ids preserved)"
