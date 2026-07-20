import { describe, it, expect } from "vitest";
import {
  selectQuickQueue,
  selectSignTrainerQueue,
  selectMarathonPage,
} from "./presets";
import type { QueueCandidate } from "./queue";
import { DEFAULT_NEW_ITEM_SHARE } from "./queue";
import {
  QUICK_COUNT,
  QUICK_NEW_BUDGET,
  SIGN_TRAINER_COUNT,
  SIGN_TRAINER_NEW_BUDGET,
  MARATHON_PAGE,
} from "@/lib/constants";

// FROZEN oracle for wave15-03. Pins the three practice-mode PARAMETERIZATIONS of the REAL
// `selectReviewQueue` (QUICK / SIGN_TRAINER / MARATHON) — their user-visible invariants, NOT
// the (already-tested in queue.test.ts) scoring math or interleave. wave15-04 implements the
// presets against THIS file and MAY NOT edit it. Clock/rng injected ⇒ deterministic ordering.

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

// A SEEN, currently-due card (dueAt `due` days ago, last reviewed `last` days ago).
const seenDue = (
  id: string,
  topicId: string,
  o: { stability: number; last: number; due: number },
): QueueCandidate => ({
  questionId: id,
  topicId,
  topicWeakness: 0.5,
  state: { stability: o.stability, lastReviewedAt: daysAgo(o.last), dueAt: daysAgo(o.due) },
});

// An UNSEEN ("new") item — no FSRS state, eligible only for the new-item lane.
const unseen = (id: string, topicId = "topic-new"): QueueCandidate => ({
  questionId: id,
  topicId,
  topicWeakness: 0.5,
});

const nNew = (out: string[]) => out.filter((q) => q.startsWith("new-")).length;

// Freeze the wave15-02 preset numbers this oracle derives its expectations from — drift fails loud.
describe("presets: constant contract", () => {
  it("pins the wave15 preset sizes and new-item budgets", () => {
    expect(QUICK_COUNT).toBe(10);
    expect(QUICK_NEW_BUDGET).toBe(4);
    expect(SIGN_TRAINER_COUNT).toBe(20);
    expect(SIGN_TRAINER_NEW_BUDGET).toBe(8);
    expect(MARATHON_PAGE).toBe(20);
    expect(DEFAULT_NEW_ITEM_SHARE).toBe(0.2);
  });
});

describe("selectQuickQueue (size 10, newItemShare 0.4, backfill)", () => {
  it("a. 8 due-seen + 8 unseen → length 10 with unseen picks ≤ 4 (new budget binds)", () => {
    const cands: QueueCandidate[] = [];
    for (let i = 0; i < 8; i++) {
      cands.push(seenDue(`seen-${i}`, `t-${i % 3}`, { stability: 5 + i, last: 15, due: 5 }));
    }
    for (let i = 0; i < 8; i++) cands.push(unseen(`new-${i}`));
    const out = selectQuickQueue(cands, { now: NOW, rng: mkRng() });
    expect(out.length).toBe(QUICK_COUNT); // 10
    expect(nNew(out)).toBeLessThanOrEqual(4);
  });

  it("b. 0 seen + 30 unseen → length 10 (backfill: a brand-new user gets a full QUICK)", () => {
    const cands = Array.from({ length: 30 }, (_, i) => unseen(`new-${i}`));
    const out = selectQuickQueue(cands, { now: NOW, rng: mkRng() });
    expect(out.length).toBe(QUICK_COUNT); // 10
  });

  it("c. deterministic: same seeded rng + inputs twice → identical arrays", () => {
    const cands: QueueCandidate[] = [];
    for (let i = 0; i < 8; i++) {
      cands.push(seenDue(`seen-${i}`, `t-${i % 3}`, { stability: 5 + i, last: 15, due: 5 }));
    }
    for (let i = 0; i < 8; i++) cands.push(unseen(`new-${i}`));
    const a = selectQuickQueue(cands, { now: NOW, rng: mkRng() });
    const b = selectQuickQueue(cands, { now: NOW, rng: mkRng() });
    expect(a).toEqual(b);
  });

  it("d. due-first: a 30-day-overdue card outranks a future-due seen card", () => {
    const overdue = seenDue("seen-overdue", "t-a", { stability: 5, last: 60, due: 30 });
    const future: QueueCandidate = {
      questionId: "seen-future",
      topicId: "t-b",
      topicWeakness: 0.5,
      state: { stability: 200, lastReviewedAt: daysAgo(1), dueAt: daysAhead(30) },
    };
    const out = selectQuickQueue([overdue, future], { now: NOW, rng: mkRng() });
    expect(out).toContain("seen-overdue");
    expect(out).toContain("seen-future");
    expect(out.indexOf("seen-overdue")).toBeLessThan(out.indexOf("seen-future"));
  });
});

describe("selectSignTrainerQueue (size 20, newItemShare 0.4, backfill)", () => {
  it("e. 12 due-seen + 20 unseen → length 20 with unseen ≤ 8 (cap binds)", () => {
    const cands: QueueCandidate[] = [];
    for (let i = 0; i < 12; i++) {
      cands.push(seenDue(`seen-${i}`, `t-${i % 4}`, { stability: 5 + i, last: 20, due: 8 }));
    }
    for (let i = 0; i < 20; i++) cands.push(unseen(`new-${i}`));
    const out = selectSignTrainerQueue(cands, { now: NOW, rng: mkRng() });
    expect(out.length).toBe(SIGN_TRAINER_COUNT); // 20
    expect(nNew(out)).toBeLessThanOrEqual(8);
  });

  it("f. 0 seen + 25 unseen → length 20 (works with zero ReviewState)", () => {
    const cands = Array.from({ length: 25 }, (_, i) => unseen(`new-${i}`));
    const out = selectSignTrainerQueue(cands, { now: NOW, rng: mkRng() });
    expect(out.length).toBe(SIGN_TRAINER_COUNT); // 20
  });
});

describe("selectMarathonPage (drop excluded, size 20, newItemShare 0.2, backfill)", () => {
  it("g. 30 candidates, 20 excluded → result ⊆ non-excluded, no duplicates, length 10", () => {
    const cands = Array.from({ length: 30 }, (_, i) => unseen(`m-${i}`, "t-m"));
    const exclude = new Set(Array.from({ length: 20 }, (_, i) => `m-${i}`));
    const out = selectMarathonPage(cands, exclude, { now: NOW, rng: mkRng() });
    expect(out.length).toBe(10);
    expect(new Set(out).size).toBe(out.length); // no duplicates
    for (const id of out) expect(exclude.has(id)).toBe(false); // ⊆ non-excluded
  });

  it("h. 100 candidates (16 due-seen + surplus unseen), none excluded → length 20, unseen ≤ 4", () => {
    const cands: QueueCandidate[] = [];
    for (let i = 0; i < 16; i++) {
      cands.push(seenDue(`seen-${i}`, `t-${i % 4}`, { stability: 5 + i, last: 20, due: 8 }));
    }
    for (let i = 0; i < 84; i++) cands.push(unseen(`new-${i}`));
    const out = selectMarathonPage(cands, new Set(), { now: NOW, rng: mkRng() });
    expect(out.length).toBe(MARATHON_PAGE); // 20
    expect(nNew(out)).toBeLessThanOrEqual(Math.round(MARATHON_PAGE * DEFAULT_NEW_ITEM_SHARE)); // ≤ 4
  });

  it("i. every candidate excluded → result is []", () => {
    const cands = Array.from({ length: 6 }, (_, i) => unseen(`m-${i}`, "t-m"));
    const exclude = new Set(cands.map((c) => c.questionId));
    const out = selectMarathonPage(cands, exclude, { now: NOW, rng: mkRng() });
    expect(out).toEqual([]);
  });

  it("j. deterministic: same seed twice → identical arrays", () => {
    const cands = Array.from({ length: 40 }, (_, i) => unseen(`m-${i}`, "t-m"));
    const a = selectMarathonPage(cands, new Set(), { now: NOW, rng: mkRng() });
    const b = selectMarathonPage(cands, new Set(), { now: NOW, rng: mkRng() });
    expect(a).toEqual(b);
  });
});
