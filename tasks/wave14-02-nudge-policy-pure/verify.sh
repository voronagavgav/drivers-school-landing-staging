#!/usr/bin/env bash
# wave14-02 — pure nudge policy + frozen oracle vectors (planner-pinned 2026-07-02).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F=lib/nudge-policy.ts
T=lib/nudge-policy.test.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

# constants pinned
for tok in NUDGE_WEEKLY_CAP NUDGE_WINDOW_DAYS NUDGE_EXAM_COUNTDOWN_DAYS NUDGE_READINESS_MILESTONES NUDGE_EVENING_HOUR NUDGE_KINDS; do
  grep -qF "$tok" lib/constants.ts || { echo "FAIL: lib/constants.ts missing $tok"; exit 1; }
done
grep -qF "NUDGE_WEEKLY_CAP = 4" lib/constants.ts || { echo "FAIL: NUDGE_WEEKLY_CAP must be 4"; exit 1; }
grep -qF "NUDGE_EVENING_HOUR = 18" lib/constants.ts || { echo "FAIL: NUDGE_EVENING_HOUR must be 18"; exit 1; }

grep -qF "export function decideNudge" "$F" || { echo "FAIL: decideNudge not exported"; exit 1; }

# purity: no server/db/clock tokens in the pure module (whole-file is safe here: no injectable defaults documented)
if grep -nE 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date\(' "$F"; then
  echo "FAIL: purity violation in $F"; exit 1
fi

# frozen oracle literals present in the test file (V2 dedupeKey, priority + cap + evening vectors)
grep -qF 'REVIEW_DUE:2026-07-02:u1' "$T" || { echo "FAIL: V2 dedupeKey literal missing from tests"; exit 1; }
grep -qF 'EXAM_COUNTDOWN' "$T" || { echo "FAIL: EXAM_COUNTDOWN vectors missing"; exit 1; }
grep -qF 'DAY_OFF_OFFER' "$T" || { echo "FAIL: DAY_OFF_OFFER vectors missing"; exit 1; }
grep -qF 'READINESS_MILESTONE' "$T" || { echo "FAIL: READINESS_MILESTONE vectors missing"; exit 1; }
grep -qE 'sentLast7Days:\s*4' "$T" || { echo "FAIL: cap vector (sentLast7Days 4 -> null) missing"; exit 1; }
grep -qE 'sentLast7Days:\s*3' "$T" || { echo "FAIL: cap boundary vector (3 -> allowed) missing"; exit 1; }
grep -qE 'localHour:\s*14' "$T" || { echo "FAIL: evening boundary vector missing"; exit 1; }
grep -qE 'readinessPrev:\s*50' "$T" || { echo "FAIL: must-cross boundary vector (prev 50, curr 50) missing"; exit 1; }

# test file actually collected (vitest list; capture first — SIGPIPE trap)
x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -q "nudge-policy.test.ts" || { echo "FAIL: nudge-policy.test.ts not in vitest list"; exit 1; }

# no schema change this task
m="$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[ "$m" = "9" ] || { echo "FAIL: migration dir count $m != 9 (none expected in wave14)"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
echo "PASS wave14-02"
