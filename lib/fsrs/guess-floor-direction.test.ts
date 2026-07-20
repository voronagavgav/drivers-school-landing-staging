// guess-floor-direction.test.ts — DIRECTION gate for the Wave 20 honest guess floor (spec Deliverable
// 5 / design point 4). The capped BKT guess floor g = min(1/optionCount, FSRS_GUESS_MAX=0.45) makes a
// first-exposure correct answer's grade DEPEND on the option count: fewer options ⇒ a bigger lucky-guess
// probability ⇒ weaker evidence of knowledge ⇒ a lower posterior ⇒ a harsher grade. This file freezes
// two properties against the REAL deriveGrade/gradePosterior:
//   (1) MONOTONICITY — for a fixed prior, the grade is non-decreasing in optionCount.
//   (2) The BULK-SHIFT table at the neutral 0.5 prior (the production first-exposure bulk), with the
//       posteriors + grades FROZEN from the Python oracle (scripts/oracles/gen-wave20-oracles.py §(g)),
//       written as literals — never recomputed from the impl.

import { describe, it, expect } from "vitest";
import { deriveGrade, gradePosterior } from "./grade";

describe("guess-floor DIRECTION — grade monotonicity in optionCount", () => {
  // A correct answer is stronger evidence when there were MORE options to get wrong by luck, so the
  // posterior rises with optionCount and the grade can only stay level or improve — never regress.
  const OPTION_COUNTS = [2, 3, 4, 5] as const;

  for (const priorKnow of [0.3, 0.5, 0.7, 0.9]) {
    it(`grade is non-decreasing over optionCount ∈ {2,3,4,5} at prior ${priorKnow}`, () => {
      const grades = OPTION_COUNTS.map((optionCount) =>
        deriveGrade({ correct: true, priorKnow, optionCount }),
      );
      for (let i = 1; i < grades.length; i++) {
        expect(grades[i]).toBeGreaterThanOrEqual(grades[i - 1]);
      }
      // …and the underlying posterior is STRICTLY increasing (the driver of the grade order).
      const posteriors = OPTION_COUNTS.map((optionCount) =>
        gradePosterior({ correct: true, priorKnow, optionCount }),
      );
      for (let i = 1; i < posteriors.length; i++) {
        expect(posteriors[i]).toBeGreaterThan(posteriors[i - 1]);
      }
    });
  }
});

describe("guess-floor DIRECTION — the frozen bulk-shift table (neutral 0.5 prior)", () => {
  // FROZEN from scripts/oracles/gen-wave20-oracles.py §(g) posterior_direction (the 6dp Python oracle),
  // NOT recomputed from deriveGrade. π = 0.9 / (0.9 + g) with the capped g at prior 0.5.
  const TABLE = [
    { optionCount: 2, posterior: 0.666667, grade: 2 }, // g=0.45 (capped) → Hard(2)
    { optionCount: 3, posterior: 0.729730, grade: 2 }, //  g=1/3        → Hard(2)
    { optionCount: 4, posterior: 0.782609, grade: 3 }, // g=1/4        → Good(3)
    { optionCount: 5, posterior: 0.818182, grade: 3 }, // g=1/5        → Good(3)
  ] as const;

  for (const { optionCount, posterior, grade } of TABLE) {
    it(`optionCount ${optionCount}: posterior ${posterior} → grade ${grade}`, () => {
      expect(gradePosterior({ correct: true, priorKnow: 0.5, optionCount })).toBeCloseTo(posterior, 6);
      expect(deriveGrade({ correct: true, priorKnow: 0.5, optionCount })).toBe(grade);
    });
  }

  it("the shift is Good→Hard: the 2/3-option majority drops from Good to Hard vs the default g=0.25", () => {
    // BEFORE the honest floor (no optionCount ⇒ default g=0.25) every first-exposure correct is Good(3).
    expect(deriveGrade({ correct: true, priorKnow: 0.5 })).toBe(3);
    // AFTER: 2- and 3-option items (the ~68% majority of the bank) fall to Hard(2); 4/5 stay Good(3).
    expect(deriveGrade({ correct: true, priorKnow: 0.5, optionCount: 2 })).toBe(2);
    expect(deriveGrade({ correct: true, priorKnow: 0.5, optionCount: 3 })).toBe(2);
    expect(deriveGrade({ correct: true, priorKnow: 0.5, optionCount: 4 })).toBe(3);
    expect(deriveGrade({ correct: true, priorKnow: 0.5, optionCount: 5 })).toBe(3);
  });
});
