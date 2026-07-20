import { describe, it, expect } from "vitest";
import { selectReviewQueue } from "./queue";
import type { QueueCandidate } from "./queue";

// FROZEN oracle for wave11-05: pins the two start-fn parameterizations of the REAL
// `selectReviewQueue` (SPACED_REVIEW = due-only; ADAPTIVE_REVIEW = due + backfill-with-new).
// It guards the parameterization the server wiring passes, NOT the (already-tested) scoring
// math. Clock is injected so ordering is deterministic.

const DAY = 86_400_000;
const NOW = new Date(2026, 0, 31, 12, 0, 0);
const daysAgo = (d: number) => new Date(NOW.getTime() - d * DAY);

// deterministic seeded rng (LCG closure) — no Math.random / clock read
const mkRng = () => {
  let s = 123456789;
  return () => {
    s = (1103515245 * s + 12345) % 2147483648;
    return s / 2147483648;
  };
};

// 3 SEEN cards (S1..S3, overdue) + 5 UNSEEN new items (U1..U5).
function buildCandidates(): QueueCandidate[] {
  const cands: QueueCandidate[] = [];
  for (let i = 1; i <= 3; i++) {
    cands.push({
      questionId: `S${i}`,
      topicId: `topic-S${i}`,
      topicWeakness: 0.5,
      state: { stability: 5 + i, lastReviewedAt: daysAgo(15), dueAt: daysAgo(5) },
    });
  }
  for (let i = 1; i <= 5; i++) {
    cands.push({ questionId: `U${i}`, topicId: `topic-U${i}`, topicWeakness: 0.5 });
  }
  return cands;
}

describe("queue-overrides: SPACED_REVIEW parameterization", () => {
  it("{size:6, newItemShare:0, backfillWithNew:false} → the 3 seen cards only, zero new", () => {
    const out = selectReviewQueue(buildCandidates(), {
      now: NOW,
      rng: mkRng(),
      size: 6,
      newItemShare: 0,
      backfillWithNew: false,
    });
    expect(out.length).toBe(3);
    expect(new Set(out)).toEqual(new Set(["S1", "S2", "S3"]));
    expect(out.filter((q) => q.startsWith("U")).length).toBe(0);
  });
});

describe("queue-overrides: ADAPTIVE_REVIEW parameterization", () => {
  it("{size:6, newItemShare:0.2, backfillWithNew:true} → 3 seen + exactly 3 new, length 6", () => {
    const out = selectReviewQueue(buildCandidates(), {
      now: NOW,
      rng: mkRng(),
      size: 6,
      newItemShare: 0.2,
      backfillWithNew: true,
    });
    expect(out.length).toBe(6);
    for (const id of ["S1", "S2", "S3"]) {
      expect(out).toContain(id);
    }
    expect(out.filter((q) => q.startsWith("U")).length).toBe(3);
  });
});
