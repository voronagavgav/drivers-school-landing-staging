#!/usr/bin/env bash
# verify.sh — wave11-10 streak-policy pure (frozen oracle).
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }
S="lib/streak-policy.ts"
[ -f "$S" ] || fail "$S missing"
grep -Eq 'export (function|const) nextStreakState' "$S" || fail "nextStreakState not exported"

# purity: no DB/clock/rng/JSX/@-alias.
for tok in 'server-only' '@/lib/db' 'Math.random' 'Date.now' '</' '/>'; do
  grep -Fq "$tok" "$S" && fail "$S contains forbidden token '$tok'" || true
done

ulist="$(npx vitest list 2>/dev/null || true)"
echo "$ulist" | grep -q "lib/streak-policy.test.ts" || fail "unit suite missing streak-policy.test.ts"

cat > ./.w11_10_oracle.ts <<'TS'
import { nextStreakState } from "./lib/streak-policy";
type P = { current: number; best: number; lastDay: string | null };
const cases: [P, string, number, number, number, number, boolean][] = [
  [{ current: 5, best: 7, lastDay: "2026-07-01" }, "2026-07-02", 2, 6, 7, 2, false],
  [{ current: 5, best: 7, lastDay: "2026-07-01" }, "2026-07-01", 2, 5, 7, 2, false],
  [{ current: 5, best: 5, lastDay: "2026-07-01" }, "2026-07-03", 2, 6, 6, 1, true],
  [{ current: 5, best: 9, lastDay: "2026-07-01" }, "2026-07-03", 0, 1, 9, 0, false],
  [{ current: 5, best: 5, lastDay: "2026-07-01" }, "2026-07-05", 2, 1, 5, 2, false],
  [{ current: 0, best: 0, lastDay: null }, "2026-07-02", 2, 1, 1, 2, false],
  [{ current: 7, best: 7, lastDay: "2026-07-01" }, "2026-07-02", 1, 8, 8, 1, false],
];
let bad = 0;
for (const [prev, today, tokens, wc, wb, wf, wu] of cases) {
  const r = nextStreakState(prev, today, tokens);
  if (r.current !== wc || r.best !== wb || r.freezeTokens !== wf || r.usedFreeze !== wu) {
    console.error("MISMATCH", JSON.stringify(prev), today, tokens, "=>", JSON.stringify(r),
      "want", { current: wc, best: wb, freezeTokens: wf, usedFreeze: wu }); bad++;
  }
}
if (bad) process.exit(1);
console.log("streak oracle OK");
TS
npx tsx ./.w11_10_oracle.ts || { rm -f ./.w11_10_oracle.ts; fail "nextStreakState fails frozen oracle"; }
rm -f ./.w11_10_oracle.ts

npm run typecheck 2>&1 | tail -3
echo "PASS: streak-policy oracle green"
