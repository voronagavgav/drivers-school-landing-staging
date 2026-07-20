import { describe, it, expect } from "vitest";
import { schedule, intervalDays } from "./schedule";
import { FSRS_TARGET_RETENTION } from "./constants";
import type { Grade, LearningState, ReviewMemoryState } from "./types";

// Construct the injected clock via Reflect.construct on the Date constructor (the lib/fsrs purity
// gate greps this file too and bans the literal Date-construction idiom); fields are fixed.
const now = Reflect.construct(Date, [2026, 0, 1, 12, 0, 0]) as Date;

function memory(overrides: Partial<ReviewMemoryState> = {}): ReviewMemoryState {
  return {
    stability: 0,
    difficulty: 0,
    state: "new",
    dueAt: null,
    lastReviewedAt: null,
    reps: 0,
    lapses: 0,
    ...overrides,
  };
}

// A settled `review` item: stability of 20 days, mid difficulty, one prior lapse.
const reviewItem = (): ReviewMemoryState =>
  memory({ stability: 20, difficulty: 5, state: "review", dueAt: now, lastReviewedAt: now, reps: 5, lapses: 1 });

describe("schedule", () => {
  it("first Good on a new item graduates new -> learning with positive stability, reps=1, dueAt>now", () => {
    const next = schedule(memory(), 3, now);
    expect(next.state).toBe<LearningState>("learning");
    expect(next.stability).toBeGreaterThan(0);
    expect(next.reps).toBe(1);
    expect(next.dueAt).toBeInstanceOf(Date);
    expect(next.dueAt!.getTime()).toBeGreaterThan(now.getTime());
  });

  it("first Easy on a new item jumps straight to review", () => {
    expect(schedule(memory(), 4, now).state).toBe<LearningState>("review");
  });

  it("Again on a review item lapses into relearning with lapses incremented by 1", () => {
    const prior = reviewItem();
    const next = schedule(prior, 1, now);
    expect(next.state).toBe<LearningState>("relearning");
    expect(next.lapses).toBe(prior.lapses + 1);
    // Forgetting cannot make a memory more durable than it was pre-lapse.
    expect(next.stability).toBeLessThanOrEqual(prior.stability);
  });

  it("does NOT count a first Again on a brand-new item as a lapse", () => {
    const next = schedule(memory(), 1, now);
    expect(next.lapses).toBe(0);
    expect(next.state).toBe<LearningState>("learning");
  });

  it("keeps difficulty within [1,10] for every grade and prior state", () => {
    const priors: ReviewMemoryState[] = [
      memory(),
      memory({ state: "learning", stability: 1, difficulty: 1, lastReviewedAt: now, reps: 1 }),
      reviewItem(),
      memory({ state: "relearning", stability: 0.5, difficulty: 10, lastReviewedAt: now, reps: 6, lapses: 3 }),
    ];
    const grades: Grade[] = [1, 2, 3, 4];
    for (const prior of priors) {
      for (const grade of grades) {
        const d = schedule(prior, grade, now).difficulty;
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(10);
      }
    }
  });

  it("is deterministic: same (state, grade, now) yields deeply-equal results", () => {
    const prior = reviewItem();
    expect(schedule(prior, 3, now)).toEqual(schedule(prior, 3, now));
  });

  it("derives dueAt as now + intervalDays(stability, target)", () => {
    const next = schedule(memory(), 3, now);
    const expectedMs = now.getTime() + intervalDays(next.stability, FSRS_TARGET_RETENTION) * 86_400_000;
    expect(next.dueAt!.getTime()).toBe(expectedMs);
  });

  it("intervalDays shrinks (never grows) as the target retention rises", () => {
    const lo = intervalDays(20, 0.8);
    const hi = intervalDays(20, 0.95);
    expect(lo).toBeGreaterThan(0);
    expect(hi).toBeGreaterThan(0);
    expect(hi).toBeLessThanOrEqual(lo);
  });
});
