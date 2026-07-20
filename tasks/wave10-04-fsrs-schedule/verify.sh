#!/usr/bin/env bash
# verify.sh — wave10-04 (pure FSRS schedule DSR state machine).
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

# 2. Behaviour smoke: state machine + determinism.
cat > ./.wave10_04_smoke.ts <<'TS'
import { schedule, intervalDays, FSRS_TARGET_RETENTION } from "./lib/fsrs";
function assert(c: boolean, m: string) { if (!c) { console.error("SMOKE FAIL: " + m); process.exit(1); } }

const now = new Date(2026, 0, 1, 12, 0, 0);
const fresh: any = { stability: 0, difficulty: 0, state: "new", dueAt: null, lastReviewedAt: null, reps: 0, lapses: 0 };

// first Good on a new item -> learning, stability>0, reps=1, dueAt>now
const a = schedule(fresh, 3, now);
assert(a.state === "learning", "first Good: new -> learning (got " + a.state + ")");
assert(a.stability > 0, "first Good: stability > 0");
assert(a.reps === 1, "first Good: reps === 1");
assert(a.dueAt instanceof Date && a.dueAt.getTime() > now.getTime(), "first Good: dueAt > now");

// difficulty clamp
assert(a.difficulty >= 1 && a.difficulty <= 10, "difficulty in [1,10] (got " + a.difficulty + ")");

// Again on a review item -> relearning, lapses+1
const review: any = { stability: 20, difficulty: 5, state: "review", dueAt: now, lastReviewedAt: now, reps: 5, lapses: 1 };
const b = schedule(review, 1, now);
assert(b.state === "relearning", "Again on review -> relearning (got " + b.state + ")");
assert(b.lapses === 2, "Again on review: lapses incremented (got " + b.lapses + ")");
assert(b.difficulty >= 1 && b.difficulty <= 10, "difficulty stays in [1,10] after Again");

// determinism for a fixed now
const c1 = schedule(review, 3, now);
const c2 = schedule(review, 3, now);
assert(JSON.stringify(c1) === JSON.stringify(c2), "schedule deterministic for fixed now");

// intervalDays sane + retention monotonicity (higher retention => shorter or equal interval)
const iLo = intervalDays(20, 0.80);
const iHi = intervalDays(20, 0.95);
assert(iLo > 0 && iHi > 0, "intervalDays positive");
assert(iHi <= iLo + 1e-9, "higher target retention => not-longer interval");

console.log("SMOKE OK; FSRS_TARGET_RETENTION=" + FSRS_TARGET_RETENTION);
TS
npx tsx ./.wave10_04_smoke.ts || { rm -f ./.wave10_04_smoke.ts; fail "fsrs schedule smoke failed"; }
rm -f ./.wave10_04_smoke.ts

# 3. Unit test asserts the state machine + determinism; included in the suite.
TESTS="$(find lib/fsrs -name '*.test.ts')"
grep -rEq 'schedule' $TESTS || fail "no lib/fsrs test asserts schedule"
grep -rEiq 'relearning' $TESTS || fail "schedule test must cover the relearning lapse edge"
vlist="$(npx vitest list 2>/dev/null || true)"
echo "$vlist" | grep -q "lib/fsrs/" || fail "lib/fsrs tests not in the unit suite"

# 4. typecheck + unit suite green.
echo "== typecheck =="; npm run typecheck 2>&1 | tail -3
tout="$(npm test 2>&1)"; echo "$tout" | tail -5
echo "$tout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "PASS: wave10-04 — fsrs schedule state machine pure + tested; typecheck/test green"
