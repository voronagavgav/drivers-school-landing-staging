#!/usr/bin/env bash
# verify.sh — wave11-11 study-plan pure (frozen oracle).
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }
S="lib/study-plan.ts"
[ -f "$S" ] || fail "$S missing"
grep -Eq 'export (function|const) computeStudyPlan' "$S" || fail "computeStudyPlan not exported"
grep -Eq 'MAX_DAILY_QUOTA' "$S" || fail "MAX_DAILY_QUOTA not present"

for tok in 'server-only' '@/lib/db' 'Math.random' 'Date.now' '</' '/>'; do
  grep -Fq "$tok" "$S" && fail "$S contains forbidden token '$tok'" || true
done

ulist="$(npx vitest list 2>/dev/null || true)"
echo "$ulist" | grep -q "lib/study-plan.test.ts" || fail "unit suite missing study-plan.test.ts"

cat > ./.w11_11_oracle.ts <<'TS'
import { computeStudyPlan } from "./lib/study-plan";
type I = { examDate: string | null; todayKey: string; dueCount: number; unseenCount: number; defaultGoal: number };
const C: [I, number | null, number, boolean][] = [
  [{ examDate: null, todayKey: "2026-07-02", dueCount: 10, unseenCount: 100, defaultGoal: 15 }, null, 15, true],
  [{ examDate: "2026-07-12", todayKey: "2026-07-02", dueCount: 20, unseenCount: 100, defaultGoal: 15 }, 10, 12, true],
  [{ examDate: "2026-07-04", todayKey: "2026-07-02", dueCount: 10, unseenCount: 190, defaultGoal: 15 }, 2, 100, false],
  [{ examDate: "2026-07-12", todayKey: "2026-07-02", dueCount: 0, unseenCount: 0, defaultGoal: 15 }, 10, 15, true],
  [{ examDate: "2026-07-02", todayKey: "2026-07-02", dueCount: 10, unseenCount: 20, defaultGoal: 15 }, 0, 30, false],
  [{ examDate: "2026-07-02", todayKey: "2026-07-02", dueCount: 5, unseenCount: 5, defaultGoal: 15 }, 0, 10, true],
];
let bad = 0;
for (const [inp, wd, wq, wf] of C) {
  const r = computeStudyPlan(inp);
  if (r.daysLeft !== wd || r.dailyQuota !== wq || r.feasible !== wf || !r.message || r.message.length === 0) {
    console.error("MISMATCH", JSON.stringify(inp), "=>", JSON.stringify(r),
      "want", { daysLeft: wd, dailyQuota: wq, feasible: wf }); bad++;
  }
}
if (bad) process.exit(1);
console.log("study-plan oracle OK");
TS
npx tsx ./.w11_11_oracle.ts || { rm -f ./.w11_11_oracle.ts; fail "computeStudyPlan fails frozen oracle"; }
rm -f ./.w11_11_oracle.ts

npm run typecheck 2>&1 | tail -3
echo "PASS: study-plan oracle green"
