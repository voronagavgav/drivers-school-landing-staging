import { describe, it, expect } from "vitest";
import { scoreCandidate, selectReviewQueue } from "./queue";
import type { QueueCandidate } from "./queue";

const DAY = 86_400_000;
const NOW = new Date(2026, 0, 31, 12, 0, 0);
const daysAgo = (d: number) => new Date(NOW.getTime() - d * DAY);
const daysAhead = (d: number) => new Date(NOW.getTime() + d * DAY);

// deterministic seeded rng (LCG closure) — no Math.random / clock read
const mkRng = () => {
  let s = 123456789;
  return () => {
    s = (1103515245 * s + 12345) % 2147483648;
    return s / 2147483648;
  };
};

describe("queue.scoreCandidate", () => {
  it("ranks an overdue, low-R, weak-topic card above a fresh, high-R, strong-topic card", () => {
    const overdueWeak = { stability: 3, lastReviewedAt: daysAgo(20), dueAt: daysAgo(10) };
    const freshStrong = { stability: 200, lastReviewedAt: daysAgo(0), dueAt: daysAhead(180) };
    expect(scoreCandidate(overdueWeak, NOW, 0.9)).toBeGreaterThan(
      scoreCandidate(freshStrong, NOW, 0.1),
    );
  });

  it("scores an overdue, low-R card positive and above a fresh high-R card even at topicWeakness=0", () => {
    // topicWeakness=0 (mastered topic) must NOT zero the score — additive, not multiplicative.
    const overdue = { stability: 3, lastReviewedAt: daysAgo(30), dueAt: daysAgo(20) };
    const fresh = { stability: 200, lastReviewedAt: daysAgo(0), dueAt: daysAhead(180) };
    const sOverdue = scoreCandidate(overdue, NOW, 0);
    const sFresh = scoreCandidate(fresh, NOW, 0);
    expect(sOverdue).toBeGreaterThan(0);
    expect(sOverdue).toBeGreaterThan(sFresh);
  });

  it("orders an all-mastered (topicWeakness=0) user's cards by overdueness/(1−R), not all tied at 0", () => {
    const mild = { stability: 10, lastReviewedAt: daysAgo(12), dueAt: daysAgo(2) };
    const severe = { stability: 10, lastReviewedAt: daysAgo(40), dueAt: daysAgo(30) };
    const sMild = scoreCandidate(mild, NOW, 0);
    const sSevere = scoreCandidate(severe, NOW, 0);
    expect(sMild).toBeGreaterThan(0);
    expect(sSevere).toBeGreaterThan(sMild);
  });
});

describe("queue.selectReviewQueue", () => {
  // 3 topics × 6 overdue seen cards + 6 unseen ("new") items across a fourth topic.
  function buildCandidates(): QueueCandidate[] {
    const cands: QueueCandidate[] = [];
    for (let t = 0; t < 3; t++) {
      for (let i = 0; i < 6; i++) {
        cands.push({
          questionId: `q-${t}-${i}`,
          topicId: `topic-${t}`,
          topicWeakness: 0.5 + t * 0.1,
          state: { stability: 5 + i, lastReviewedAt: daysAgo(15), dueAt: daysAgo(5) },
        });
      }
    }
    for (let i = 0; i < 6; i++) {
      cands.push({ questionId: `new-${i}`, topicId: "topic-new", topicWeakness: 0.7 });
    }
    return cands;
  }

  const cands = buildCandidates();
  const size = 12;
  const newItemShare = 0.25;
  const topicOf = (qid: string) => cands.find((c) => c.questionId === qid)!.topicId;

  it("interleaves topics: no 3 consecutive items share a topicId", () => {
    const out = selectReviewQueue(cands, { now: NOW, rng: mkRng(), size, newItemShare });
    expect(out.length).toBeGreaterThan(0);
    for (let i = 2; i < out.length; i++) {
      const triple =
        topicOf(out[i]) === topicOf(out[i - 1]) && topicOf(out[i]) === topicOf(out[i - 2]);
      expect(triple).toBe(false);
    }
  });

  it("injects a bounded share of new items ≈ round(size × newItemShare)", () => {
    const out = selectReviewQueue(cands, { now: NOW, rng: mkRng(), size, newItemShare });
    const nNew = out.filter((q) => q.startsWith("new-")).length;
    expect(nNew).toBeLessThanOrEqual(Math.round(size * newItemShare) + 1);
  });

  it("is deterministic: the same seeded rng and inputs yield an identical ordering", () => {
    const a = selectReviewQueue(cands, { now: NOW, rng: mkRng(), size, newItemShare });
    const b = selectReviewQueue(cands, { now: NOW, rng: mkRng(), size, newItemShare });
    expect(a).toEqual(b);
  });

  describe("newItemShare as a CAP (backfillWithNew default false)", () => {
    // 2 seen (short) + 10 unseen, so the old fill-to-size backfill would have topped up to size.
    function buildShortSeen(): QueueCandidate[] {
      const cands: QueueCandidate[] = [];
      for (let i = 0; i < 2; i++) {
        cands.push({
          questionId: `seen-${i}`,
          topicId: `topic-${i}`,
          topicWeakness: 0.5,
          state: { stability: 5, lastReviewedAt: daysAgo(15), dueAt: daysAgo(5) },
        });
      }
      for (let i = 0; i < 10; i++) {
        cands.push({ questionId: `new-${i}`, topicId: "topic-new", topicWeakness: 0.5 });
      }
      return cands;
    }

    it("share=0 returns EXACTLY the 2 seen cards (length 2, zero new) — no backfill", () => {
      const out = selectReviewQueue(buildShortSeen(), {
        now: NOW,
        rng: mkRng(),
        size: 10,
        newItemShare: 0,
      });
      expect(out.length).toBe(2);
      expect(out.filter((q) => q.startsWith("new-")).length).toBe(0);
    });

    it("share=0.2 caps new items at ≤ 2 even when seen cards are short", () => {
      const out = selectReviewQueue(buildShortSeen(), {
        now: NOW,
        rng: mkRng(),
        size: 10,
        newItemShare: 0.2,
      });
      const nNew = out.filter((q) => q.startsWith("new-")).length;
      expect(nNew).toBeLessThanOrEqual(2);
      // capped ⇒ shorter than size (2 seen + ≤2 new), never filled to 10
      expect(out.length).toBeLessThan(10);
    });

    it("backfillWithNew:true restores fill-to-size (extra unseen top up to `size`)", () => {
      const out = selectReviewQueue(buildShortSeen(), {
        now: NOW,
        rng: mkRng(),
        size: 10,
        newItemShare: 0.2,
        backfillWithNew: true,
      });
      expect(out.length).toBe(10);
      expect(out.filter((q) => q.startsWith("new-")).length).toBe(8);
    });
  });
});
