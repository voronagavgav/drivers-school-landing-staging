import { describe, it, expect } from "vitest";
import { studyStreak } from "@/lib/streak";

const DAY = 86_400_000;
/** Epoch ms at the start of UTC day index `n` (so it buckets to day `n`). */
const day = (n: number) => n * DAY;

describe("studyStreak", () => {
  it("(empty) returns zero current and longest", () => {
    expect(studyStreak([])).toEqual({ current: 0, longest: 0 });
  });

  it("(single day) returns current 1 and longest 1", () => {
    expect(studyStreak([day(10)])).toEqual({ current: 1, longest: 1 });
  });

  it("counts a consecutive run", () => {
    expect(studyStreak([day(1), day(2), day(3)])).toEqual({ current: 3, longest: 3 });
  });

  it("a gap resets current but longest remembers the earlier run", () => {
    // days 1-4 (run of 4), gap, then 10-11 (run of 2 ending at the latest day)
    const activity = [day(1), day(2), day(3), day(4), day(10), day(11)];
    expect(studyStreak(activity)).toEqual({ current: 2, longest: 4 });
  });

  it("same-day duplicates count once", () => {
    // four timestamps but only two distinct UTC days (5 and 6)
    const sameDay = [day(5), day(5) + 1000, day(5) + DAY - 1, day(6)];
    expect(studyStreak(sameDay)).toEqual({ current: 2, longest: 2 });
  });

  it("Date[] and epoch number[] inputs produce identical results", () => {
    const epochs = [day(1), day(2), day(4)];
    const dates = epochs.map((ms) => new Date(ms));
    expect(studyStreak(dates)).toEqual(studyStreak(epochs));
    expect(studyStreak(dates)).toEqual({ current: 1, longest: 2 });
  });

  it("ignores input order", () => {
    expect(studyStreak([day(3), day(1), day(2)])).toEqual({ current: 3, longest: 3 });
  });
});
