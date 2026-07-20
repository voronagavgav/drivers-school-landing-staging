import { describe, it, expect } from "vitest";
import { dueMistakes } from "./selection";
import { REVIEW_INTERVALS_HOURS } from "@/lib/constants";
import type { EngineMistake } from "./types";

const HOUR = 3_600_000;

function mkM(
  questionId: string,
  correctRepeatCount: number,
  lastMistakeAt: number,
): EngineMistake {
  return { questionId, topicId: null, mistakeCount: 1, correctRepeatCount, lastMistakeAt };
}

describe("selection.dueMistakes", () => {
  const now = 1_000 * HOUR;

  it("(a) a streak-0 mistake with interval 0 is due immediately", () => {
    // REVIEW_INTERVALS_HOURS[0] === 0 → due the instant it is recorded.
    const m = [mkM("a", 0, now)];
    expect(dueMistakes(m, now).map((x) => x.questionId)).toEqual(["a"]);
  });

  it("(b) a just-reviewed mistake (small elapsed, streak >= 1) is NOT due", () => {
    // streak 1 → 24h ladder entry; only 1h elapsed.
    const m = [mkM("a", 1, now - 1 * HOUR)];
    expect(dueMistakes(m, now)).toEqual([]);
  });

  it("(c) a mistake whose interval has elapsed IS due", () => {
    // streak 1 → 24h; 25h elapsed.
    const m = [mkM("a", 1, now - 25 * HOUR)];
    expect(dueMistakes(m, now).map((x) => x.questionId)).toEqual(["a"]);
  });

  it("(d) a higher correctRepeatCount requires a LONGER wait before due", () => {
    // Same elapsed (30h); streak 1 (24h) is due, streak 2 (72h) is not.
    const elapsed = now - 30 * HOUR;
    const lowStreak = [mkM("low", 1, elapsed)];
    const highStreak = [mkM("high", 2, elapsed)];
    expect(dueMistakes(lowStreak, now).map((x) => x.questionId)).toEqual(["low"]);
    expect(dueMistakes(highStreak, now)).toEqual([]);
  });

  it("(e) the boundary elapsed === interval is DUE (inclusive >=)", () => {
    // streak 1 → exactly 24h elapsed.
    const m = [mkM("a", 1, now - 24 * HOUR)];
    expect(dueMistakes(m, now).map((x) => x.questionId)).toEqual(["a"]);
  });

  it("(f) correctRepeatCount past the ladder length clamps to the last interval", () => {
    const lastHours = REVIEW_INTERVALS_HOURS[REVIEW_INTERVALS_HOURS.length - 1];
    const wayPast = REVIEW_INTERVALS_HOURS.length + 5;
    // Just under the last interval ⇒ not due; at/over it ⇒ due.
    expect(dueMistakes([mkM("a", wayPast, now - (lastHours - 1) * HOUR)], now)).toEqual([]);
    expect(
      dueMistakes([mkM("a", wayPast, now - lastHours * HOUR)], now).map((x) => x.questionId),
    ).toEqual(["a"]);
  });

  it("respects a custom intervalsHours ladder over the default", () => {
    const m = [mkM("a", 0, now - 5 * HOUR)];
    // Default index 0 is 0h ⇒ due; a custom [10, ...] ladder makes it NOT due.
    expect(dueMistakes(m, now, [10, 20]).map((x) => x.questionId)).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const m = [mkM("a", 0, now), mkM("b", 5, now)];
    dueMistakes(m, now);
    expect(m.map((x) => x.questionId)).toEqual(["a", "b"]);
  });
});
