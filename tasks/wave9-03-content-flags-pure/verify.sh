#!/usr/bin/env bash
# verify.sh — wave9-03 (pure content-quality flags + unit tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/content-flags.ts"
TEST="lib/content-flags.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1-2. Exports + the three flag kinds present.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq 'export (function|const) flagQuestion\b' "$SRC" || fail "$SRC must export flagQuestion"
for k in WRONG_KEY_SUSPECTED LOW_DISCRIMINATION INSUFFICIENT_DATA; do
  grep -q "$k" "$SRC" || fail "$SRC must define flag kind $k"
done
# Ukrainian (Cyrillic) labels live here.
grep -Eq '[А-Яа-яІіЇїЄєҐґ]' "$SRC" || fail "$SRC must carry Ukrainian (Cyrillic) flag labels"

# 3. Purity.
for tok in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Math.random' 'Date.now' 'new Date'; do
  grep -Fq "$tok" "$SRC" && fail "$SRC contains forbidden token '$tok' (must stay pure)" || true
done

# 4. Behaviour smoke (field-name agnostic: matches kind literals in the serialized result).
cat > ./.wave9_03_smoke.ts <<'TS'
import { flagQuestion } from "./lib/content-flags";
function assert(c: boolean, msg: string) { if (!c) { console.error("SMOKE FAIL: " + msg); process.exit(1); } }
const opt = (optionKey: string, picks: number, isCorrect: boolean, timesAnswered: number) =>
  ({ optionKey, picks, isCorrect, pickRate: timesAnswered ? picks / timesAnswered : 0 });
// WRONG_KEY_SUSPECTED: a distractor (7) out-draws the keyed-correct option (2); n >= minSample.
const wrong = flagQuestion({
  timesAnswered: 20, correct: 2, accuracy: 0.1, avgTimeSeconds: 12,
  options: [opt("a", 2, true, 20), opt("b", 7, false, 20), opt("c", 6, false, 20), opt("d", 5, false, 20)],
}, { minSample: 10 });
assert(JSON.stringify(wrong).includes("WRONG_KEY_SUSPECTED"), "distractor-beats-correct → WRONG_KEY_SUSPECTED");
// LOW_DISCRIMINATION: accuracy == 1/optionCount (0.25), no distractor out-draws correct; n >= minSample.
const rand = flagQuestion({
  timesAnswered: 20, correct: 5, accuracy: 0.25, avgTimeSeconds: 12,
  options: [opt("a", 5, true, 20), opt("b", 5, false, 20), opt("c", 5, false, 20), opt("d", 5, false, 20)],
}, { minSample: 10 });
assert(JSON.stringify(rand).includes("LOW_DISCRIMINATION"), "near-random → LOW_DISCRIMINATION");
// thin → EXACTLY [INSUFFICIENT_DATA]
const thin = flagQuestion({
  timesAnswered: 3, correct: 1, accuracy: 0.333, avgTimeSeconds: 9,
  options: [opt("a", 1, true, 3), opt("b", 2, false, 3)],
}, { minSample: 10 });
const thinStr = JSON.stringify(thin);
assert(thin.length === 1 && thinStr.includes("INSUFFICIENT_DATA"), "thin → INSUFFICIENT_DATA only");
assert(!thinStr.includes("WRONG_KEY_SUSPECTED") && !thinStr.includes("LOW_DISCRIMINATION"), "thin emits no other flag");
// healthy → no flags
const healthy = flagQuestion({
  timesAnswered: 20, correct: 18, accuracy: 0.9, avgTimeSeconds: 11,
  options: [opt("a", 18, true, 20), opt("b", 1, false, 20), opt("c", 1, false, 20), opt("d", 0, false, 20)],
}, { minSample: 10 });
assert(healthy.length === 0, "healthy → no flags");
console.log("SMOKE OK");
TS
npx tsx ./.wave9_03_smoke.ts || { rm -f ./.wave9_03_smoke.ts; fail "flagQuestion behaviour smoke failed"; }
rm -f ./.wave9_03_smoke.ts

# 5. Test file exists, references each case, and is in the unit suite.
[ -f "$TEST" ] || fail "$TEST missing"
for k in WRONG_KEY_SUSPECTED LOW_DISCRIMINATION INSUFFICIENT_DATA; do
  grep -q "$k" "$TEST" || fail "$TEST must assert the $k case"
done
vlist="$(npx vitest list 2>/dev/null || true)"
echo "$vlist" | grep -q "lib/content-flags.test.ts" || fail "content-flags.test.ts not in the unit suite"

# 6. typecheck + unit suite green.
npm run typecheck 2>&1 | tail -3
tout="$(npm test 2>&1)"; echo "$tout" | tail -5
echo "$tout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "PASS: wave9-03 flagQuestion pure + 4 cases tested; typecheck/test green"
