import { describe, it, expect } from "vitest";
import {
  correctOptionId,
  isAnswerCorrect,
  summarizeAnswers,
  evaluateExam,
} from "./scoring";
import type { EngineQuestion } from "./types";

const q: EngineQuestion = {
  id: "q1",
  topicId: "t1",
  difficulty: 1,
  options: [
    { id: "a", isCorrect: false },
    { id: "b", isCorrect: true },
    { id: "c", isCorrect: false },
  ],
};

describe("scoring.correctOptionId", () => {
  it("returns the correct option id", () => {
    expect(correctOptionId(q)).toBe("b");
  });
  it("returns null when no correct option", () => {
    expect(correctOptionId({ ...q, options: [{ id: "a", isCorrect: false }] })).toBeNull();
  });
});

describe("scoring.isAnswerCorrect", () => {
  it("true for the correct option", () => {
    expect(isAnswerCorrect(q, "b")).toBe(true);
  });
  it("false for a wrong option", () => {
    expect(isAnswerCorrect(q, "a")).toBe(false);
  });
  it("false for null / unknown selection", () => {
    expect(isAnswerCorrect(q, null)).toBe(false);
    expect(isAnswerCorrect(q, undefined)).toBe(false);
    expect(isAnswerCorrect(q, "zzz")).toBe(false);
  });
});

describe("scoring.summarizeAnswers", () => {
  it("counts correct/wrong and accuracy", () => {
    expect(summarizeAnswers([true, true, false, true])).toEqual({
      total: 4,
      correct: 3,
      wrong: 1,
      accuracy: 0.75,
    });
  });
  it("handles empty", () => {
    expect(summarizeAnswers([])).toEqual({ total: 0, correct: 0, wrong: 0, accuracy: 0 });
  });
});

describe("scoring.evaluateExam", () => {
  it("passes within the error budget", () => {
    expect(evaluateExam(19, 20, 2)).toEqual({ result: "PASSED", errors: 1 });
    expect(evaluateExam(18, 20, 2)).toEqual({ result: "PASSED", errors: 2 });
  });
  it("fails over the error budget", () => {
    expect(evaluateExam(17, 20, 2)).toEqual({ result: "FAILED", errors: 3 });
  });
  it("counts unanswered as errors", () => {
    // answered 15 of 20 correctly, 5 missing => 5 errors
    expect(evaluateExam(15, 20, 2).result).toBe("FAILED");
  });
});
