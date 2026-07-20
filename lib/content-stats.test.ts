import { describe, it, expect } from "vitest";
import { summarizeQuestion } from "./content-stats";

describe("content-stats.summarizeQuestion", () => {
  it("returns all-zero stats and no options for empty input", () => {
    expect(summarizeQuestion([])).toEqual({
      timesAnswered: 0,
      correct: 0,
      accuracy: 0,
      avgTimeSeconds: 0,
      options: [],
    });
  });

  it("aggregates counts, accuracy, avgTimeSeconds, and per-option pick rates", () => {
    const result = summarizeQuestion([
      { optionKey: "a", isCorrect: true, timeSpentSeconds: 10 },
      { optionKey: "a", isCorrect: true, timeSpentSeconds: 20 },
      { optionKey: "b", isCorrect: false, timeSpentSeconds: null },
      { optionKey: "c", isCorrect: false, timeSpentSeconds: 30 },
    ]);

    expect(result.timesAnswered).toBe(4);
    expect(result.correct).toBe(2);
    expect(result.accuracy).toBeCloseTo(0.5);
    // mean over the present (non-null) samples only: (10 + 20 + 30) / 3
    expect(result.avgTimeSeconds).toBeCloseTo(20);

    const a = result.options.find((o) => o.optionKey === "a");
    expect(a).toBeDefined();
    expect(a!.picks).toBe(2);
    expect(a!.isCorrect).toBe(true);
    expect(a!.pickRate).toBeCloseTo(0.5);

    const b = result.options.find((o) => o.optionKey === "b");
    expect(b!.picks).toBe(1);
    expect(b!.isCorrect).toBe(false);
    expect(b!.pickRate).toBeCloseTo(0.25);

    // pickRates sum to 1 whenever timesAnswered > 0
    const sum = result.options.reduce((s, o) => s + o.pickRate, 0);
    expect(sum).toBeCloseTo(1);
  });

  it("returns avgTimeSeconds 0 when there are no time samples (0-sample → 0)", () => {
    const result = summarizeQuestion([
      { optionKey: "x", isCorrect: false, timeSpentSeconds: null },
      { optionKey: "y", isCorrect: true, timeSpentSeconds: null },
    ]);
    expect(result.avgTimeSeconds).toBe(0);
    expect(result.timesAnswered).toBe(2);
  });

  it("does not mutate the input rows array", () => {
    const rows = [
      { optionKey: "a", isCorrect: true, timeSpentSeconds: 5 },
      { optionKey: "b", isCorrect: false, timeSpentSeconds: null },
    ];
    const firstBefore = rows[0];
    summarizeQuestion(rows);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(firstBefore);
    expect(rows[0]).toEqual({ optionKey: "a", isCorrect: true, timeSpentSeconds: 5 });
  });
});
