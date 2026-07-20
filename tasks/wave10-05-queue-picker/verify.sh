#!/usr/bin/env bash
# verify.sh — wave10-05 (pure review-queue picker).
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/test-engine/queue.ts"
TEST="lib/test-engine/queue.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq 'export (function|const) scoreCandidate\b' "$SRC" || fail "$SRC must export scoreCandidate"
grep -Eq 'export (function|const) selectReviewQueue\b' "$SRC" || fail "$SRC must export selectReviewQueue"

# Purity: forbidden tokens; Math.random ONLY as the injectable rng default.
for tok in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Date.now' 'new Date'; do
  grep -Fq "$tok" "$SRC" && fail "$SRC contains forbidden token '$tok'" || true
done
grep -Eq '</|/>' "$SRC" && fail "$SRC contains JSX-like markup (pure module)" || true
mr="$(grep -c 'Math.random' "$SRC" || true)"
[ "$mr" -le 1 ] || fail "$SRC references Math.random $mr times (only the injectable rng default is allowed)"
if [ "$mr" = "1" ]; then
  grep -Eq 'rng[^)]*=[[:space:]]*Math\.random' "$SRC" || fail "the single Math.random must be the 'rng = Math.random' default"
fi

# Reuse retrievability rather than re-deriving R.
grep -q 'lib/fsrs' "$SRC" || fail "$SRC should reuse retrievability from lib/fsrs"

# Behaviour smoke.
cat > ./.wave10_05_smoke.ts <<'TS'
import { scoreCandidate, selectReviewQueue } from "./lib/test-engine/queue";
function assert(c: boolean, m: string) { if (!c) { console.error("SMOKE FAIL: " + m); process.exit(1); } }

const now = new Date(2026, 0, 31, 12, 0, 0);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
const daysAhead = (d: number) => new Date(now.getTime() + d * 86400000);

// ranking: overdue low-R weak-topic > fresh high-R strong-topic
const overdueWeak: any = { stability: 3, lastReviewedAt: daysAgo(20), dueAt: daysAgo(10) };
const freshStrong: any = { stability: 200, lastReviewedAt: daysAgo(0), dueAt: daysAhead(180) };
const sWeak = scoreCandidate(overdueWeak, now, 0.9);
const sStrong = scoreCandidate(freshStrong, now, 0.1);
assert(sWeak > sStrong, "overdue weak (" + sWeak + ") must outscore fresh strong (" + sStrong + ")");

// build candidates across 3 topics for interleaving + new-share
const cands: any[] = [];
for (let t = 0; t < 3; t++) for (let i = 0; i < 6; i++) {
  cands.push({ questionId: `q-${t}-${i}`, topicId: `topic-${t}`, topicWeakness: 0.5 + t * 0.1,
    state: { stability: 5 + i, lastReviewedAt: daysAgo(15), dueAt: daysAgo(5) } });
}
// unseen "new" items (no state)
for (let i = 0; i < 6; i++) cands.push({ questionId: `new-${i}`, topicId: `topic-new`, topicWeakness: 0.7 });

// deterministic seeded rng (LCG closure — no Math.random / Date.now)
const mkRng = () => { let s = 123456789; return () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; }; };

const size = 12, newItemShare = 0.25;
const out1 = selectReviewQueue(cands, { now, rng: mkRng(), size, newItemShare });
const out2 = selectReviewQueue(cands, { now, rng: mkRng(), size, newItemShare });
assert(Array.isArray(out1) && out1.length > 0, "selectReviewQueue returns a non-empty array");
assert(JSON.stringify(out1) === JSON.stringify(out2), "deterministic for a fixed rng");

// interleaving: no 3 consecutive same topic
const topicOf = (qid: string) => cands.find((c) => c.questionId === qid)!.topicId;
for (let i = 2; i < out1.length; i++) {
  assert(!(topicOf(out1[i]) === topicOf(out1[i-1]) && topicOf(out1[i]) === topicOf(out1[i-2])),
    "3 consecutive same-topic at index " + i);
}
// new-item share is bounded ~ round(size*share)
const nNew = out1.filter((q) => q.startsWith("new-")).length;
const target = Math.round(size * newItemShare);
assert(nNew <= target + 1, "new-item count " + nNew + " exceeds bounded target " + target);
console.log("SMOKE OK (newItems=" + nNew + "/target " + target + ")");
TS
npx tsx ./.wave10_05_smoke.ts || { rm -f ./.wave10_05_smoke.ts; fail "queue picker smoke failed"; }
rm -f ./.wave10_05_smoke.ts

# Test file asserts the behaviours + inclusion.
[ -f "$TEST" ] || fail "$TEST missing"
grep -Eiq 'interleav' "$TEST" || fail "$TEST must assert topic interleaving"
grep -Eiq 'scoreCandidate' "$TEST" || fail "$TEST must assert scoreCandidate ranking"
vlist="$(npx vitest list 2>/dev/null || true)"
echo "$vlist" | grep -q "lib/test-engine/queue.test.ts" || fail "queue.test.ts not in the unit suite"

echo "== typecheck =="; npm run typecheck 2>&1 | tail -3
tout="$(npm test 2>&1)"; echo "$tout" | tail -5
echo "$tout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "PASS: wave10-05 — queue picker pure + tested; typecheck/test green"
