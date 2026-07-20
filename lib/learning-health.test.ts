import { describe, it, expect } from "vitest";
import { difficultyOutliers, type DifficultyRow } from "./learning-health";

// Frozen oracle O1–O5 (planner-pinned): observed accuracy vs authored difficulty.
// expected accuracy per difficulty 1..5 = [0.9, 0.8, 0.7, 0.6, 0.5]; outlier iff
// |observed − expected| > 0.25 with ≥ 20 answers.
const row = (
  questionId: string,
  difficulty: number,
  total: number,
  correct: number,
): DifficultyRow => ({ questionId, difficulty, total, correct });

describe("learning-health.difficultyOutliers", () => {
  it("O1: an easy-reading hard question surfaces as 'easier' (36/40 at difficulty 5)", () => {
    const [o] = difficultyOutliers([row("q1", 5, 40, 36)]);
    expect(o.questionId).toBe("q1");
    expect(o.observed).toBeCloseTo(0.9, 10); // 36/40
    expect(o.expected).toBeCloseTo(0.5, 10);
    expect(o.delta).toBeCloseTo(0.4, 10);
    expect(o.direction).toBe("easier");
  });

  it("O2: a hard-reading easy question surfaces as 'harder' (12/30 at difficulty 1)", () => {
    const [o] = difficultyOutliers([row("q2", 1, 30, 12)]);
    expect(o.observed).toBeCloseTo(0.4, 10); // 12/30
    expect(o.expected).toBeCloseTo(0.9, 10);
    expect(o.delta).toBeCloseTo(-0.5, 10);
    expect(o.direction).toBe("harder");
  });

  it("O3: within-tolerance question is NOT an outlier (17/25 = 0.68 vs 0.7)", () => {
    // |0.68 − 0.7| = 0.02 ≤ 0.25 → excluded.
    expect(difficultyOutliers([row("q3", 3, 25, 17)])).toEqual([]);
  });

  it("O4: a huge delta below the min-answers floor is excluded (total: 19)", () => {
    // 2/19 ≈ 0.11 vs 0.8 is a big miss, but 19 < 20 → too noisy to trust.
    expect(difficultyOutliers([row("q4", 2, 19, 2)])).toEqual([]);
  });

  it("O5: min-answers boundary of 20 is INCLUDED; delta must strictly exceed 0.25", () => {
    // total: 20 at difficulty 3 → observed 0.25, delta −0.45 → outlier.
    const [o] = difficultyOutliers([row("q5", 3, 20, 5)]);
    expect(o.questionId).toBe("q5");
    expect(o.observed).toBeCloseTo(0.25, 10);
    expect(o.delta).toBeCloseTo(-0.45, 10);
    expect(o.direction).toBe("harder");

    // total: 20 at difficulty 4 → observed 0.35, delta exactly −0.25 → NOT an outlier (strict >).
    expect(difficultyOutliers([row("q6", 4, 20, 7)])).toEqual([]);
  });

  it("O1+O2 together sort by |delta| descending → [O2 (0.5), O1 (0.4)]", () => {
    const out = difficultyOutliers([row("q1", 5, 40, 36), row("q2", 1, 30, 12)]);
    expect(out.map((o) => o.questionId)).toEqual(["q2", "q1"]);
  });
});
