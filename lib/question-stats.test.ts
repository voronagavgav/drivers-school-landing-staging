import { describe, it, expect } from "vitest";
import { summarizeQuestionPerformance } from "./question-stats";

describe("question-stats.summarizeQuestionPerformance", () => {
  it("returns an empty array for empty input", () => {
    expect(summarizeQuestionPerformance([])).toEqual([]);
  });

  it("aggregates one question's mixed right/wrong rows", () => {
    const result = summarizeQuestionPerformance([
      { questionId: "q1", isCorrect: true },
      { questionId: "q1", isCorrect: false },
      { questionId: "q1", isCorrect: true },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q1");
    expect(result[0].timesAnswered).toBe(3);
    expect(result[0].correct).toBe(2);
    expect(result[0].accuracy).toBeCloseTo(2 / 3);
  });

  it("sorts hardest-first, breaking accuracy ties by more-answered-first", () => {
    const result = summarizeQuestionPerformance([
      // q-hard: 0/3 => accuracy 0
      { questionId: "q-hard", isCorrect: false },
      { questionId: "q-hard", isCorrect: false },
      { questionId: "q-hard", isCorrect: false },
      // q-mid-more: 2/4 => accuracy 0.5, answered 4
      { questionId: "q-mid-more", isCorrect: true },
      { questionId: "q-mid-more", isCorrect: true },
      { questionId: "q-mid-more", isCorrect: false },
      { questionId: "q-mid-more", isCorrect: false },
      // q-mid-less: 1/2 => accuracy 0.5, answered 2
      { questionId: "q-mid-less", isCorrect: true },
      { questionId: "q-mid-less", isCorrect: false },
      // q-easy: 1/1 => accuracy 1
      { questionId: "q-easy", isCorrect: true },
    ]);
    expect(result.map((r) => r.questionId)).toEqual([
      "q-hard",
      "q-mid-more",
      "q-mid-less",
      "q-easy",
    ]);
  });

  it("surfaces a never-answered question from questionIds as 0/0/0", () => {
    const result = summarizeQuestionPerformance(
      [{ questionId: "q1", isCorrect: true }],
      ["q1", "q-never"],
    );
    const never = result.find((r) => r.questionId === "q-never");
    expect(never).toBeDefined();
    expect(never!.timesAnswered).toBe(0);
    expect(never!.correct).toBe(0);
    expect(never!.accuracy).toBe(0);
    expect(Number.isNaN(never!.accuracy)).toBe(false);
  });

  it("does not mutate the input rows array", () => {
    const rows = [
      { questionId: "q1", isCorrect: true },
      { questionId: "q2", isCorrect: false },
    ];
    const firstBefore = rows[0];
    summarizeQuestionPerformance(rows, ["q1", "q2", "q3"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(firstBefore);
    expect(rows[0]).toEqual({ questionId: "q1", isCorrect: true });
  });
});
