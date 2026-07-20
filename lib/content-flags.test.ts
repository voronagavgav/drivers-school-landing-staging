import { describe, it, expect } from "vitest";
import { flagQuestion } from "./content-flags";
import type { QuestionSummary } from "./content-stats";

// Build a per-option pick breakdown the way `summarizeQuestion` would.
const opt = (
  optionKey: string,
  picks: number,
  isCorrect: boolean,
  timesAnswered: number,
) => ({
  optionKey,
  picks,
  isCorrect,
  pickRate: timesAnswered ? picks / timesAnswered : 0,
});

const kinds = (stat: QuestionSummary, minSample: number) =>
  flagQuestion(stat, { minSample }).map((f) => f.kind);

describe("content-flags.flagQuestion", () => {
  it("flags WRONG_KEY_SUSPECTED when a distractor out-draws the keyed-correct option", () => {
    const stat: QuestionSummary = {
      timesAnswered: 20,
      correct: 2,
      accuracy: 0.1,
      avgTimeSeconds: 12,
      options: [
        opt("a", 2, true, 20),
        opt("b", 7, false, 20),
        opt("c", 6, false, 20),
        opt("d", 5, false, 20),
      ],
    };
    expect(kinds(stat, 10)).toContain("WRONG_KEY_SUSPECTED");
  });

  it("flags LOW_DISCRIMINATION for a near-random question (accuracy ≈ 1/optionCount)", () => {
    const stat: QuestionSummary = {
      timesAnswered: 20,
      correct: 5,
      accuracy: 0.25, // == 1/4, the band centre
      avgTimeSeconds: 12,
      options: [
        opt("a", 5, true, 20),
        opt("b", 5, false, 20),
        opt("c", 5, false, 20),
        opt("d", 5, false, 20),
      ],
    };
    expect(kinds(stat, 10)).toContain("LOW_DISCRIMINATION");
  });

  it("emits EXACTLY [INSUFFICIENT_DATA] on thin data — never another flag", () => {
    const stat: QuestionSummary = {
      timesAnswered: 3,
      correct: 1,
      accuracy: 0.333,
      avgTimeSeconds: 9,
      options: [opt("a", 1, true, 3), opt("b", 2, false, 3)],
    };
    const result = flagQuestion(stat, { minSample: 10 });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("INSUFFICIENT_DATA");
    expect(kinds(stat, 10)).not.toContain("WRONG_KEY_SUSPECTED");
    expect(kinds(stat, 10)).not.toContain("LOW_DISCRIMINATION");
  });

  it("returns an empty array for a healthy question (correct option dominates, high accuracy)", () => {
    const stat: QuestionSummary = {
      timesAnswered: 20,
      correct: 18,
      accuracy: 0.9,
      avgTimeSeconds: 11,
      options: [
        opt("a", 18, true, 20),
        opt("b", 1, false, 20),
        opt("c", 1, false, 20),
        opt("d", 0, false, 20),
      ],
    };
    expect(flagQuestion(stat, { minSample: 10 })).toEqual([]);
  });

  it("carries a Ukrainian (Cyrillic) label and evidence counts on each flag", () => {
    const stat: QuestionSummary = {
      timesAnswered: 20,
      correct: 2,
      accuracy: 0.1,
      avgTimeSeconds: 12,
      options: [
        opt("a", 2, true, 20),
        opt("b", 7, false, 20),
        opt("c", 6, false, 20),
        opt("d", 5, false, 20),
      ],
    };
    const [flag] = flagQuestion(stat, { minSample: 10 });
    expect(flag.kind).toBe("WRONG_KEY_SUSPECTED");
    expect(flag.label).toMatch(/[А-Яа-яІіЇїЄєҐґ]/);
    expect(typeof flag.evidence).toBe("object");
  });
});
