#!/usr/bin/env bash
# wave10f-15 verify: ReviewLog/ReviewState FKs are Restrict; StudyDay dup index dropped.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Schema: both question relations Restrict; no StudyDay @@index([userId, day]).
grep -Eq "ReviewLog[^}]*onDelete: Restrict|onDelete: Restrict" prisma/schema.prisma || true
# Precise checks:
python3 - <<'PY'
import re,sys
s=open('prisma/schema.prisma').read()
def block(name):
    m=re.search(r'model %s \{(.*?)\n\}'%name, s, re.S); return m.group(1) if m else ''
rl=block('ReviewLog'); rs=block('ReviewState'); sd=block('StudyDay')
ok=True
if 'onDelete: Restrict' not in rl: print('FAIL: ReviewLog.question not Restrict'); ok=False
if 'onDelete: Restrict' not in rs: print('FAIL: ReviewState.question not Restrict'); ok=False
if '@@index([userId, day])' in sd: print('FAIL: StudyDay duplicate @@index still present'); ok=False
if '@@unique([userId, day])' not in sd: print('FAIL: StudyDay @@unique lost'); ok=False
sys.exit(0 if ok else 1)
PY

# Migration applies + client regenerates.
npx prisma migrate deploy
npx prisma generate

# DB reflects Restrict (no CASCADE on these two FKs) and the index is gone.
DB="${DATABASE_URL#file:}"; DB="${DB:-prisma/dev.db}"
[ -f "$DB" ] || DB=prisma/dev.db
FK_RL="$(sqlite3 "$DB" "SELECT \"on_delete\" FROM pragma_foreign_key_list('ReviewLog') WHERE \"table\"='Question';" 2>/dev/null || true)"
FK_RS="$(sqlite3 "$DB" "SELECT \"on_delete\" FROM pragma_foreign_key_list('ReviewState') WHERE \"table\"='Question';" 2>/dev/null || true)"
echo "ReviewLog->Question on_delete=$FK_RL ; ReviewState->Question on_delete=$FK_RS"
echo "$FK_RL" | grep -qi "RESTRICT" || { echo "FAIL: ReviewLog FK not RESTRICT in DB"; exit 1; }
echo "$FK_RS" | grep -qi "RESTRICT" || { echo "FAIL: ReviewState FK not RESTRICT in DB"; exit 1; }
IDX="$(sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='index' AND name='StudyDay_userId_day_idx';" 2>/dev/null || true)"
[ -z "$IDX" ] || { echo "FAIL: StudyDay_userId_day_idx still in DB"; exit 1; }

npm run typecheck
echo "PASS wave10f-15"
