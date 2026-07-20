import { describe, it, expect } from "vitest";
import {
  accuracyOf,
  topicStats,
  detectWeakTopics,
  estimateReadiness,
  readinessTrend,
} from "./progress";

describe("progress.accuracyOf", () => {
  it("computes ratio and guards divide-by-zero", () => {
    expect(accuracyOf(3, 4)).toBe(0.75);
    expect(accuracyOf(0, 0)).toBe(0);
  });
});

describe("progress.detectWeakTopics", () => {
  it("flags topics below threshold with enough answers, sorted weakest-first", () => {
    const stats = topicStats([
      { topicId: "t1", title: "A", answered: 10, correct: 3 }, // 0.30 weak
      { topicId: "t2", title: "B", answered: 10, correct: 9 }, // 0.90 ok
      { topicId: "t3", title: "C", answered: 2, correct: 0 }, // weak but too few answers
      { topicId: "t4", title: "D", answered: 8, correct: 4 }, // 0.50 weak
    ]);
    const weak = detectWeakTopics(stats).map((t) => t.topicId);
    expect(weak).toEqual(["t1", "t4"]);
  });
});

describe("progress.estimateReadiness", () => {
  it("returns NOT_ENOUGH_DATA below the minimum answers", () => {
    const r = estimateReadiness({
      uniqueAnswered: 5,
      overallAccuracy: 1,
      weakTopicCount: 0,
      unresolvedMistakes: 0,
      recentExam: { passed: 0, total: 0 },
    });
    expect(r.level).toBe("NOT_ENOUGH_DATA");
    expect(r.reasons[0].code).toBe("not_enough_data");
  });

  it("high accuracy + passed exams => READY, with explaining reasons", () => {
    const r = estimateReadiness({
      uniqueAnswered: 50,
      overallAccuracy: 0.95,
      weakTopicCount: 0,
      unresolvedMistakes: 0,
      recentExam: { passed: 3, total: 3 },
    });
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.level).toBe("READY_FOR_EXAM_STYLE_PRACTICE");
    expect(r.reasons.some((x) => x.code === "accuracy")).toBe(true);
    expect(r.reasons.some((x) => x.code === "recent_exam")).toBe(true);
  });

  it("low accuracy => NEEDS_PRACTICE", () => {
    const r = estimateReadiness({
      uniqueAnswered: 40,
      overallAccuracy: 0.4,
      weakTopicCount: 3,
      unresolvedMistakes: 8,
      recentExam: { passed: 0, total: 2 },
    });
    expect(r.level).toBe("NEEDS_PRACTICE");
    expect(r.score).toBeLessThan(40);
  });

  it("penalties are explained and score stays within 0..100", () => {
    const r = estimateReadiness({
      uniqueAnswered: 30,
      overallAccuracy: 0.2,
      weakTopicCount: 10,
      unresolvedMistakes: 50,
      recentExam: { passed: 0, total: 5 },
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.reasons.some((x) => x.code === "weak_topics")).toBe(true);
    expect(r.reasons.some((x) => x.code === "unresolved_mistakes")).toBe(true);
  });
});

describe("progress.readinessTrend", () => {
  it("returns STABLE with fewer than two scores", () => {
    expect(readinessTrend([])).toBe("STABLE");
    expect(readinessTrend([42])).toBe("STABLE");
  });

  it("returns IMPROVING for a clearly rising series", () => {
    expect(readinessTrend([50, 60, 75])).toBe("IMPROVING");
  });

  it("returns DECLINING for a clearly falling series", () => {
    expect(readinessTrend([80, 70, 50])).toBe("DECLINING");
  });

  it("returns STABLE for a nearly-flat series", () => {
    expect(readinessTrend([60, 62, 61])).toBe("STABLE");
  });
});
