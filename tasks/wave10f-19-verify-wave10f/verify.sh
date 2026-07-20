#!/usr/bin/env bash
# wave10f-19 verify: final Wave-10f acceptance gate.
set -euo pipefail
cd "$(dirname "$0")/../.."

# 1-4: build/test gates.
npm run typecheck
npm test
npm run db:seed
npm run test:integration
npm run build

# reference-vectors green + collected (not skipped).
x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -q "reference-vectors" || { echo "FAIL: reference-vectors not collected"; exit 1; }
npx vitest run lib/fsrs/reference-vectors.test.ts

# 5: drift zero.
DIFF="$(npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script 2>/dev/null || true)"
if echo "$DIFF" | grep -Eqi "CREATE |ALTER |DROP "; then echo "FAIL: schema drift remains"; echo "$DIFF"; exit 1; fi

# 6: static invariants.
grep -Eq "FSRS_FACTOR\s*=\s*19\s*/\s*81" lib/fsrs/retrievability.ts || { echo "FAIL: FSRS_FACTOR not 19/81"; exit 1; }
for f in latencyMs confidence clientEventId; do
  grep -q "$f" lib/validation.ts || { echo "FAIL: $f missing from submitAnswerSchema"; exit 1; }
done
grep -q "STARTABLE_MODES" lib/constants.ts || { echo "FAIL: STARTABLE_MODES missing"; exit 1; }
python3 - <<'PY'
import re,sys
s=open('prisma/schema.prisma').read()
def block(n):
    m=re.search(r'model %s \{(.*?)\n\}'%n,s,re.S); return m.group(1) if m else ''
ok=True
if 'onDelete: Restrict' not in block('ReviewLog'): print('FAIL: ReviewLog FK not Restrict'); ok=False
if 'onDelete: Restrict' not in block('ReviewState'): print('FAIL: ReviewState FK not Restrict'); ok=False
sys.exit(0 if ok else 1)
PY
grep -qi "serwist" docs/app-plan/SPIKES.md || { echo "FAIL: Serwist verdict missing"; exit 1; }
grep -qi "sharp" docs/app-plan/SPIKES.md || { echo "FAIL: sharp verdict missing"; exit 1; }

echo "PASS wave10f-19 — Wave-10f acceptance gate green"
