#!/usr/bin/env bash
# verify.sh — wave10-03 (pure FSRS grade + retrievability + constants).
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
fail() { echo "FAIL: $1"; exit 1; }
PURE_TOKENS=( 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Math.random' 'Date.now' 'new Date' )

[ -d lib/fsrs ] || fail "lib/fsrs/ missing"

# 1. Purity across every non-test file in lib/fsrs.
for f in $(find lib/fsrs -name '*.ts' ! -name '*.test.ts'); do
  for tok in "${PURE_TOKENS[@]}"; do
    grep -Fq "$tok" "$f" && fail "$f contains forbidden token '$tok' (must stay pure)" || true
  done
  grep -Eq '</|/>' "$f" && fail "$f contains JSX-like markup (pure module)" || true
done

# 2. Behaviour smoke: imports from lib/fsrs, checks retrievability + deriveGrade.
cat > ./.wave10_03_smoke.ts <<'TS'
import { retrievability, deriveGrade, FSRS_TARGET_RETENTION, FSRS_DEFAULT_WEIGHTS } from "./lib/fsrs";
function assert(c: boolean, m: string) { if (!c) { console.error("SMOKE FAIL: " + m); process.exit(1); } }

assert(typeof FSRS_TARGET_RETENTION === "number" && FSRS_TARGET_RETENTION > 0 && FSRS_TARGET_RETENTION < 1, "FSRS_TARGET_RETENTION in (0,1)");
assert(Array.isArray(FSRS_DEFAULT_WEIGHTS) && FSRS_DEFAULT_WEIGHTS.length >= 17, "FSRS_DEFAULT_WEIGHTS length >= 17");

const base = new Date(2026, 0, 1, 12, 0, 0).getTime();
const at = (days: number) => new Date(base + days * 86400000);
const st = { stability: 10, lastReviewedAt: at(0) };
const r0 = retrievability(st, at(0));
const r1 = retrievability(st, at(1));
const r30 = retrievability(st, at(30));
assert(Math.abs(r0 - 1) < 1e-9, "R(elapsed 0) == 1 (got " + r0 + ")");
assert(r0 >= r1 - 1e-12 && r1 > r30, "R strictly decreasing with elapsed time (" + r0 + ">" + r1 + ">" + r30 + ")");
assert(r30 >= 0 && r30 <= 1, "R in [0,1]");

// deriveGrade: the two unambiguous cases + range.
assert(deriveGrade({ correct: false }) === 1, "wrong -> Again(1)");
assert(deriveGrade({ correct: false, latencyMs: 100, confidence: 4 }) === 1, "wrong stays Again(1) despite fast+confident");
assert(deriveGrade({ correct: true }) === 3, "plain correct -> Good(3)");
for (const inp of [
  { correct: true, latencyMs: 500, confidence: 4 },
  { correct: true, latencyMs: 60000, confidence: 1 },
  { correct: true, confidence: 1 },
]) {
  const g = deriveGrade(inp as any);
  assert([1,2,3,4].includes(g), "deriveGrade returns 1..4 for " + JSON.stringify(inp));
}
console.log("SMOKE OK");
TS
npx tsx ./.wave10_03_smoke.ts || { rm -f ./.wave10_03_smoke.ts; fail "fsrs grade/retrievability smoke failed"; }
rm -f ./.wave10_03_smoke.ts

# 3. Unit test asserts the four grade cases + retrievability; included in the suite.
TESTS="$(find lib/fsrs -name '*.test.ts')"
[ -n "$TESTS" ] || fail "no lib/fsrs/*.test.ts"
grep -rEq 'deriveGrade' $TESTS || fail "no lib/fsrs test asserts deriveGrade"
grep -rEq 'retrievability' $TESTS || fail "no lib/fsrs test asserts retrievability"
vlist="$(npx vitest list 2>/dev/null || true)"
echo "$vlist" | grep -q "lib/fsrs/" || fail "lib/fsrs tests not in the unit suite"

# 4-5. typecheck + unit suite green.
echo "== typecheck =="; npm run typecheck 2>&1 | tail -3
tout="$(npm test 2>&1)"; echo "$tout" | tail -5
echo "$tout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "PASS: wave10-03 — fsrs grade/retrievability/constants pure + tested; typecheck/test green"
