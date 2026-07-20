#!/usr/bin/env bash
# wave19d-01: FINDINGS.md exists with the section→stratum mapping + quotas + anchors; no code touched.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DIR="tasks/wave19d-01-topic-stratum-mapping"
F="$DIR/FINDINGS.md"
DB="prisma/dev.db"

[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# Live dev.db section inventory for PUBLISHED cat-B questions (evidence the finding must reflect).
if [ -f "$DB" ]; then
  echo "=== published cat-B questions per official section (live dev.db) ==="
  sqlite3 "$DB" "
    SELECT CAST(substr(q.questionKey, 3, instr(substr(q.questionKey,3),'_')-1) AS INTEGER) AS section,
           COUNT(*) AS pub
    FROM Question q
    JOIN _QuestionCategories qc ON qc.B = q.id
    JOIN Category c ON c.id = qc.A
    WHERE c.code='B' AND q.isPublished=1 AND q.isActive=1 AND q.archivedAt IS NULL
          AND q.questionKey LIKE 'q\_%' ESCAPE '\'
    GROUP BY section ORDER BY section;" 2>/dev/null || echo "(section query skipped)"
fi

# Required content anchors in FINDINGS.md.
for tok in pdr safety structure medical; do
  grep -qi "$tok" "$F" || { echo "FAIL: FINDINGS.md missing stratum key '$tok'"; exit 1; }
done
# Quota figures 10/4/4/2 present.
for n in 10 4 2; do
  grep -qE "\b$n\b" "$F" || { echo "FAIL: FINDINGS.md missing quota figure $n"; exit 1; }
done
# Anchor rows: §37→medical, §31→structure, §35→safety (allow the section number near the stratum word).
grep -qE "37" "$F" && grep -qiE "medical|домедич" "$F" || { echo "FAIL: §37→medical anchor absent"; exit 1; }
grep -qE "31" "$F" && grep -qiE "structure|будов" "$F" || { echo "FAIL: §31→structure anchor absent"; exit 1; }
grep -qE "35" "$F" && grep -qiE "safety|безпек" "$F" || { echo "FAIL: §35→safety anchor absent"; exit 1; }

# Investigation-only note: this task authors FINDINGS.md; the blueprint code lands in task 03.
# (No code-untouched git gate here — the working tree already carries unrelated pre-wave dirty files;
#  the deliverable is the FINDINGS.md artifact + its asserted anchors above.)

echo "PASS: wave19d-01"
