#!/usr/bin/env bash
# verify.sh — wave10-06 (pure readiness model: Poisson-binomial DP).
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/readiness-model.ts"
TEST="lib/readiness-model.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq 'export (function|const) perItemPassProb\b' "$SRC" || fail "$SRC must export perItemPassProb"
grep -Eq 'export (function|const) poissonBinomialAtLeast\b' "$SRC" || fail "$SRC must export poissonBinomialAtLeast"
grep -Eq 'export (function|const) computeReadiness\b' "$SRC" || fail "$SRC must export computeReadiness"

for tok in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Math.random' 'Date.now' 'new Date'; do
  grep -Fq "$tok" "$SRC" && fail "$SRC contains forbidden token '$tok' (must stay pure)" || true
done
grep -Eq '</|/>' "$SRC" && fail "$SRC contains JSX-like markup (pure module)" || true

# Behaviour smoke: exact DP + monotonicity + dial range.
cat > ./.wave10_06_smoke.ts <<'TS'
import { poissonBinomialAtLeast, perItemPassProb, computeReadiness } from "./lib/readiness-model";
function assert(c: boolean, m: string) { if (!c) { console.error("SMOKE FAIL: " + m); process.exit(1); } }
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

// exact DP
assert(near(poissonBinomialAtLeast(2, [0.2, 0.5, 0.9]), 0.55), "PB(>=2 of [.2,.5,.9]) == 0.55");
assert(near(poissonBinomialAtLeast(2, [0.5, 0.5, 0.5]), 0.5), "PB(>=2 of 3 fair) == 0.5");
assert(near(poissonBinomialAtLeast(0, [0.3, 0.7]), 1), "PB(>=0) == 1");
assert(near(poissonBinomialAtLeast(3, [0.5, 0.5]), 0), "PB(>=k) with k>n == 0");

// perItemPassProb clamps to [0,1]
const p = perItemPassProb(0.8);
assert(p >= 0 && p <= 1, "perItemPassProb in [0,1]");

const bp = { questionCount: 20, passThreshold: 18 };
const hi = computeReadiness({ seen: Array(40).fill(0.95), unseenCount: 0, unseenPrior: 0.55, blueprint: bp });
const lo = computeReadiness({ seen: Array(40).fill(0.55), unseenCount: 0, unseenPrior: 0.55, blueprint: bp });
assert(hi.dialPercent >= 0 && hi.dialPercent <= 100, "dialPercent in [0,100]");
assert(Number.isInteger(hi.dialPercent), "dialPercent integer");
assert(hi.passProbability >= 0 && hi.passProbability <= 1, "passProbability in [0,1]");
assert(hi.dialPercent > lo.dialPercent, "readiness rises as seen-R rises (" + hi.dialPercent + " > " + lo.dialPercent + ")");

// more unseen items lower it
const few = computeReadiness({ seen: Array(40).fill(0.9), unseenCount: 5, unseenPrior: 0.5, blueprint: bp });
const many = computeReadiness({ seen: Array(40).fill(0.9), unseenCount: 200, unseenPrior: 0.5, blueprint: bp });
assert(many.dialPercent <= few.dialPercent, "more unseen must not raise readiness (" + many.dialPercent + " <= " + few.dialPercent + ")");
console.log("SMOKE OK (hi=" + hi.dialPercent + " lo=" + lo.dialPercent + " few=" + few.dialPercent + " many=" + many.dialPercent + ")");
TS
npx tsx ./.wave10_06_smoke.ts || { rm -f ./.wave10_06_smoke.ts; fail "readiness-model smoke failed"; }
rm -f ./.wave10_06_smoke.ts

# Test file asserts the exact DP + monotonicity + inclusion.
[ -f "$TEST" ] || fail "$TEST missing"
grep -Eq 'poissonBinomialAtLeast' "$TEST" || fail "$TEST must assert poissonBinomialAtLeast values"
grep -Eiq 'unseen' "$TEST" || fail "$TEST must assert the more-unseen-lowers-readiness property"
vlist="$(npx vitest list 2>/dev/null || true)"
echo "$vlist" | grep -q "lib/readiness-model.test.ts" || fail "readiness-model.test.ts not in the unit suite"

echo "== typecheck =="; npm run typecheck 2>&1 | tail -3
tout="$(npm test 2>&1)"; echo "$tout" | tail -5
echo "$tout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "PASS: wave10-06 — readiness model pure + tested; typecheck/test green"
