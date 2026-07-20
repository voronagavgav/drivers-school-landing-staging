#!/usr/bin/env bash
# wave19b-06 — blueprint bucketing by explicit naказ section (from questionKey), not displayOrder-99.
set -euo pipefail
cd "$(dirname "$0")/../.."

grep -Eq "export function sectionFromQuestionKey" lib/content-key.ts || { echo "FAIL: sectionFromQuestionKey not exported"; exit 1; }
grep -Eq "sectionFromQuestionKey" lib/content-key.test.ts || { echo "FAIL: no sectionFromQuestionKey oracle tests"; exit 1; }

# groupCandidatesByBlock must no longer bucket by displayOrder arithmetic.
# Extract the function body and assert it references neither SECTION_DISPLAY_ORDER_OFFSET nor displayOrder.
BODY="$(awk '/export function groupCandidatesByBlock/{f=1} f{print} f&&/^}/{exit}' lib/exam-blueprint.ts)"
grep -q "SECTION_DISPLAY_ORDER_OFFSET" <<<"$BODY" && { echo "FAIL: groupCandidatesByBlock still uses SECTION_DISPLAY_ORDER_OFFSET"; exit 1; } || true
grep -q "displayOrder" <<<"$BODY" && { echo "FAIL: groupCandidatesByBlock still reads displayOrder"; exit 1; } || true
grep -Eq "section" <<<"$BODY" || { echo "FAIL: groupCandidatesByBlock does not bucket by section"; exit 1; }

# Frozen directional P(pass) literals present.
grep -Eq "0\.5928" lib/exam-blueprint.test.ts lib/readiness-model.test.ts || { echo "FAIL: heterogeneous P(pass) 0.5928 literal absent"; exit 1; }
grep -Eq "0\.6074" lib/exam-blueprint.test.ts lib/readiness-model.test.ts || { echo "FAIL: homogeneous P(pass) 0.6074 literal absent"; exit 1; }

# PURITY.
for f in lib/content-key.ts lib/exam-blueprint.ts; do
  for tok in "server-only" "@/lib/db" "@prisma/client" "lib/generated" "Math.random" "Date.now" "new Date"; do
    grep -Fq "$tok" "$f" && { echo "FAIL: purity — $tok in $f"; exit 1; } || true
  done
done

# LIVE dev.db cross-check: the signs topic's questionKey-section is 33 while its displayOrder is 134.
DB=prisma/dev.db
if [ -f "$DB" ]; then
  DISP="$(sqlite3 "$DB" "SELECT displayOrder FROM Topic WHERE title='ДОРОЖНІ ЗНАКИ' LIMIT 1;")"
  SEC="$(sqlite3 "$DB" "SELECT DISTINCT CAST(substr(q.questionKey,3,instr(substr(q.questionKey,3),'_')-1) AS INT) FROM Question q JOIN Topic t ON q.topicId=t.id WHERE t.title='ДОРОЖНІ ЗНАКИ' AND q.questionKey LIKE 'q\_%' ESCAPE '\' LIMIT 1;")"
  [ "$DISP" = "134" ] || { echo "FAIL: expected ДОРОЖНІ ЗНАКИ displayOrder 134, got '$DISP'"; exit 1; }
  [ "$SEC" = "33" ] || { echo "FAIL: expected questionKey-derived section 33, got '$SEC'"; exit 1; }
  echo "live-db: signs displayOrder=$DISP but naказ section=$SEC (drift confirmed; fix uses section)"
else
  echo "note: $DB absent — skipping live-db cross-check"
fi

npm run -s typecheck
npm run -s test
echo "PASS wave19b-06"
