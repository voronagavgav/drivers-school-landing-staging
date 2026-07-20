import { describe, it, expect } from "vitest";
import { examReadiness } from "./readiness";
import type { MasteryBand } from "./mastery";

const strong: MasteryBand = "strong";
const learning: MasteryBand = "learning";
const weak: MasteryBand = "weak";

describe("readiness.examReadiness empty history", () => {
  it("returns a zero score and 'не готовий' for empty history, never throws", () => {
    const r = examReadiness({ recentExamScores: [], topicBands: [] });
    expect(r.score).toBe(0);
    expect(r.band).toBe("не готовий");
    expect(Number.isNaN(r.score)).toBe(false);
  });
});

describe("readiness.examReadiness band cases", () => {
  it("high exam scores + all-non-weak topics ⇒ 'готовий'", () => {
    const r = examReadiness({
      recentExamScores: [95, 95],
      topicBands: [strong, strong, learning],
    });
    // 0.6*95 + 0.4*100 = 57 + 40 = 97
    expect(r.score).toBe(97);
    expect(r.band).toBe("готовий");
  });

  it("a mid case ⇒ 'майже'", () => {
    const r = examReadiness({
      recentExamScores: [70],
      topicBands: [strong, weak], // 0.5 non-weak
    });
    // 0.6*70 + 0.4*50 = 42 + 20 = 62
    expect(r.score).toBe(62);
    expect(r.band).toBe("майже");
  });

  it("a low/mixed case ⇒ 'не готовий'", () => {
    const r = examReadiness({
      recentExamScores: [30],
      topicBands: [strong, weak, weak, weak, weak], // 0.2 non-weak
    });
    // 0.6*30 + 0.4*20 = 18 + 8 = 26
    expect(r.score).toBe(26);
    expect(r.band).toBe("не готовий");
  });
});

describe("readiness.examReadiness band cutoff boundaries", () => {
  it("exactly at the ALMOST cutoff (50) is 'майже'", () => {
    const r = examReadiness({
      recentExamScores: [50],
      topicBands: [strong, weak], // 0.5 non-weak
    });
    // 0.6*50 + 0.4*50 = 50
    expect(r.score).toBe(50);
    expect(r.band).toBe("майже");
  });

  it("just below the ALMOST cutoff is 'не готовий'", () => {
    const r = examReadiness({
      recentExamScores: [48],
      topicBands: [strong, weak], // 0.5 non-weak
    });
    // 0.6*48 + 0.4*50 = 28.8 + 20 = 48.8 ⇒ 49
    expect(r.score).toBe(49);
    expect(r.band).toBe("не готовий");
  });

  it("exactly at the READY cutoff (80) is 'готовий'", () => {
    const r = examReadiness({
      recentExamScores: [80],
      topicBands: [strong, strong, strong, strong, weak], // 0.8 non-weak
    });
    // 0.6*80 + 0.4*80 = 48 + 32 = 80
    expect(r.score).toBe(80);
    expect(r.band).toBe("готовий");
  });

  it("just below the READY cutoff is 'майже'", () => {
    const r = examReadiness({
      recentExamScores: [78],
      topicBands: [strong, strong, strong, strong, weak], // 0.8 non-weak
    });
    // 0.6*78 + 0.4*80 = 46.8 + 32 = 78.8 ⇒ 79
    expect(r.score).toBe(79);
    expect(r.band).toBe("майже");
  });
});

describe("readiness.examReadiness weak-topic share", () => {
  it("a higher weak-topic share lowers the score", () => {
    const scores = [70];
    const fewerWeak = examReadiness({
      recentExamScores: scores,
      topicBands: [strong, strong, strong, weak], // 0.75 non-weak
    });
    const moreWeak = examReadiness({
      recentExamScores: scores,
      topicBands: [strong, weak, weak, weak], // 0.25 non-weak
    });
    expect(moreWeak.score).toBeLessThan(fewerWeak.score);
  });
});
