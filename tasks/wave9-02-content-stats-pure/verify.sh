#!/usr/bin/env bash
# verify.sh — wave9-02 (pure per-question rich stats + unit tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/content-stats.ts"
TEST="lib/content-stats.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Module exports the function.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq 'export (function|const) summarizeQuestion\b' "$SRC" || fail "$SRC must export summarizeQuestion"

# 2. Purity: no forbidden tokens anywhere in the file.
for tok in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Math.random' 'Date.now' 'new Date'; do
  grep -Fq "$tok" "$SRC" && fail "$SRC contains forbidden token '$tok' (must stay pure)" || true
done

# Reuse, not duplicate: composes the existing pure summarizer.
grep -q 'question-stats' "$SRC" || fail "$SRC should reuse @/lib/question-stats (do not duplicate accuracy)"

# 3. Behaviour smoke (repo-root tsx so the relative import resolves).
cat > ./.wave9_02_smoke.ts <<'TS'
import { summarizeQuestion } from "./lib/content-stats";
function assert(c: boolean, msg: string) { if (!c) { console.error("SMOKE FAIL: " + msg); process.exit(1); } }
// empty → zeros
const e = summarizeQuestion([]);
assert(e.timesAnswered === 0 && e.correct === 0 && e.accuracy === 0 && e.avgTimeSeconds === 0 && e.options.length === 0, "empty zeros");
// counts/accuracy/avg/pickrate
const r = summarizeQuestion([
  { optionKey: "a", isCorrect: true,  timeSpentSeconds: 10 },
  { optionKey: "a", isCorrect: true,  timeSpentSeconds: 20 },
  { optionKey: "b", isCorrect: false, timeSpentSeconds: null },
  { optionKey: "c", isCorrect: false, timeSpentSeconds: 30 },
]);
assert(r.timesAnswered === 4, "timesAnswered=4");
assert(r.correct === 2, "correct=2");
assert(Math.abs(r.accuracy - 0.5) < 1e-9, "accuracy=0.5");
assert(Math.abs(r.avgTimeSeconds - 20) < 1e-9, "avgTime over present samples = (10+20+30)/3 = 20");
const sum = r.options.reduce((s, o) => s + o.pickRate, 0);
assert(Math.abs(sum - 1) < 1e-9, "pickRates sum to 1");
const a = r.options.find(o => o.optionKey === "a");
assert(!!a && a.picks === 2 && a.isCorrect === true, "option a: 2 picks, keyed-correct");
// 0-sample avg (no non-null times) → 0
const z = summarizeQuestion([{ optionKey: "x", isCorrect: false, timeSpentSeconds: null }]);
assert(z.avgTimeSeconds === 0, "0-sample avgTime → 0");
console.log("SMOKE OK");
TS
npx tsx ./.wave9_02_smoke.ts || { rm -f ./.wave9_02_smoke.ts; fail "summarizeQuestion behaviour smoke failed"; }
rm -f ./.wave9_02_smoke.ts

# 4. Test file exists, asserts the required behaviours, and is included in the unit suite.
[ -f "$TEST" ] || fail "$TEST missing"
grep -Eiq 'pickRate|pick-rate' "$TEST" || fail "$TEST must assert option pick rates"
grep -Eiq 'avgTimeSeconds' "$TEST"     || fail "$TEST must assert avgTimeSeconds (incl. 0-sample → 0)"
grep -Eiq 'accuracy' "$TEST"           || fail "$TEST must assert accuracy"
vlist="$(npx vitest list 2>/dev/null || true)"
echo "$vlist" | grep -q "lib/content-stats.test.ts" || fail "content-stats.test.ts not in the unit suite"

# 5-6. typecheck + unit suite green.
npm run typecheck 2>&1 | tail -3
tout="$(npm test 2>&1)"; echo "$tout" | tail -5
echo "$tout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "PASS: wave9-02 summarizeQuestion pure + tested; typecheck/test green"
