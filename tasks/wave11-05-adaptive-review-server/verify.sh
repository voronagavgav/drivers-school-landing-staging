#!/usr/bin/env bash
# verify.sh — wave11-05 adaptive/spaced queue-driven sessions.
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }

# 1. server fns + typed error exported.
grep -Eq 'export (async )?function startAdaptiveReview' lib/server/study.ts || fail "startAdaptiveReview missing"
grep -Eq 'export (async )?function startSpacedReview' lib/server/study.ts || fail "startSpacedReview missing"
grep -Eq 'class NothingDueError' lib/server/study.ts || fail "NothingDueError not exported"
# 2. startSession branches on both modes.
grep -Eq 'ADAPTIVE_REVIEW' lib/server/test-engine.ts || fail "startSession does not branch on ADAPTIVE_REVIEW"
grep -Eq 'SPACED_REVIEW' lib/server/test-engine.ts || fail "startSession does not branch on SPACED_REVIEW"
# 3. action maps NothingDueError to the empty redirect.
grep -Eq 'NothingDueError' app/actions/test.ts || fail "startTestAction does not handle NothingDueError"
grep -Eq "empty=SPACED_REVIEW" app/actions/test.ts || fail "no SPACED_REVIEW empty redirect target"

# 4. pure composition oracle present + in the suite.
ulist="$(npx vitest list 2>/dev/null || true)"
echo "$ulist" | grep -q "queue-overrides.test.ts" || fail "unit suite missing queue-overrides.test.ts"

# 5. run the frozen oracle against the REAL selectReviewQueue (relative imports only).
cat > ./.w11_05_oracle.ts <<'TS'
import { selectReviewQueue, type QueueCandidate } from "./lib/test-engine/queue";
const now = new Date("2026-07-02T00:00:00Z");
const past = new Date("2026-06-01T00:00:00Z");
const due = new Date("2026-06-20T00:00:00Z");
const seen = (id: string): QueueCandidate => ({
  questionId: id, topicId: "t" + id, topicWeakness: 0.3,
  state: { stability: 5, lastReviewedAt: past, dueAt: due },
});
const unseen = (id: string): QueueCandidate => ({ questionId: id, topicId: "t" + id, topicWeakness: 0.3, state: null });
const cands = [seen("S1"), seen("S2"), seen("S3"), unseen("U1"), unseen("U2"), unseen("U3"), unseen("U4"), unseen("U5")];

const spaced = selectReviewQueue(cands, { now, size: 6, newItemShare: 0, backfillWithNew: false });
const adaptive = selectReviewQueue(cands, { now, size: 6, newItemShare: 0.2, backfillWithNew: true });

let bad = 0;
const uCount = (a: string[]) => a.filter((x) => x.startsWith("U")).length;
if (spaced.length !== 3) { console.error("SPACED length", spaced.length, "want 3", spaced); bad++; }
if (uCount(spaced) !== 0) { console.error("SPACED has new items", spaced); bad++; }
if (new Set(spaced).size !== 3 || !["S1","S2","S3"].every((s) => spaced.includes(s))) { console.error("SPACED set", spaced); bad++; }
if (adaptive.length !== 6) { console.error("ADAPTIVE length", adaptive.length, "want 6", adaptive); bad++; }
if (!["S1","S2","S3"].every((s) => adaptive.includes(s))) { console.error("ADAPTIVE missing seen", adaptive); bad++; }
if (uCount(adaptive) !== 3) { console.error("ADAPTIVE new count", uCount(adaptive), "want 3", adaptive); bad++; }
if (bad) process.exit(1);
console.log("queue composition oracle OK");
TS
npx tsx ./.w11_05_oracle.ts || { rm -f ./.w11_05_oracle.ts; fail "queue composition oracle failed"; }
rm -f ./.w11_05_oracle.ts

npm run typecheck 2>&1 | tail -3
echo "PASS: adaptive/spaced server wiring + composition oracle"
