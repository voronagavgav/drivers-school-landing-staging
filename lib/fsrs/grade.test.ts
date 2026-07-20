import { describe, it, expect } from "vitest";
import { deriveGrade, gradePosterior } from "./grade";
import { FSRS_HARD_LATENCY_MS } from "./constants";

describe("gradePosterior (BKT guess/slip) — matches the frozen Bayes oracle", () => {
  it("recovers the frozen CORRECT-answer posteriors (g=0.25, s=0.10)", () => {
    // Hand-computed Bayes rationals, identical to grade-posterior.test.ts.
    expect(gradePosterior({ correct: true, priorKnow: 0.2 })).toBeCloseTo(0.4736842105, 10);
    expect(gradePosterior({ correct: true, priorKnow: 0.5 })).toBeCloseTo(0.7826086957, 10);
    expect(gradePosterior({ correct: true, priorKnow: 0.8 })).toBeCloseTo(0.9350649351, 10);
    expect(gradePosterior({ correct: true, priorKnow: 0.9 })).toBeCloseTo(0.9700598802, 10);
  });

  it("caps a 2-option item's guess floor at the honest degeneracy bound (g=0.45, Wave 20)", () => {
    // Wave 20 design point 3: g = min(1/optionCount, FSRS_GUESS_MAX=0.45), so a 2-option item's naive
    // g=0.5 shades to 0.45 (below the Baker et al. P(G)<0.5 degeneracy boundary). π = 0.5·0.9 /
    // (0.5·0.9 + 0.5·0.45) = 0.45/0.675 = 0.6666…; frozen to 6dp (0.666667) by the Python oracle.
    expect(gradePosterior({ correct: true, priorKnow: 0.5, optionCount: 2 })).toBeCloseTo(
      0.6666666667,
      10,
    );
  });

  it("recovers the frozen WRONG-answer posterior", () => {
    expect(gradePosterior({ correct: false, priorKnow: 0.8 })).toBeCloseTo(0.347826087, 10);
  });

  it("is monotone increasing in the prior for a correct answer", () => {
    const seq = [0.2, 0.5, 0.8, 0.9].map((p0) => gradePosterior({ correct: true, priorKnow: p0 }));
    for (let i = 1; i < seq.length; i++) expect(seq[i]).toBeGreaterThan(seq[i - 1]);
  });
});

describe("deriveGrade (guessing-corrected posterior model)", () => {
  it("maps a wrong answer to Again(1) regardless of prior/latency/confidence", () => {
    expect(deriveGrade({ correct: false, priorKnow: 0.9 })).toBe(1);
    expect(deriveGrade({ correct: false })).toBe(1);
    expect(deriveGrade({ correct: false, latencyMs: 100, confidence: 4 })).toBe(1);
  });

  it("(a) a lucky fast-correct on a WEAK item is NOT Easy — caps at Hard(2)", () => {
    const g = deriveGrade({ correct: true, latencyMs: 1000, priorKnow: 0.2 });
    expect(g).toBe(2);
    expect(g).not.toBe(4); // the whole point of the fix — old code returned Easy(4)
  });

  it("(b) a genuine strong-item correct is Easy(4)", () => {
    expect(deriveGrade({ correct: true, latencyMs: 1000, priorKnow: 0.9 })).toBe(4);
  });

  it("a first-exposure (neutral 0.5 prior) correct is Good(3), never Easy", () => {
    const g = deriveGrade({ correct: true, latencyMs: 1000, priorKnow: 0.5 });
    expect(g).toBe(3);
    expect(g).not.toBe(4);
  });

  it("the confidence veto caps even a strong correct at Hard(2)", () => {
    expect(deriveGrade({ correct: true, latencyMs: 1000, priorKnow: 0.9, confidence: 1 })).toBe(2);
  });

  it("absent priorKnow falls back to a neutral 0.5 prior → Good(3)", () => {
    expect(deriveGrade({ correct: true, latencyMs: 1000 })).toBe(3);
    expect(deriveGrade({ correct: true })).toBe(3);
  });

  it("a very slow correct caps Easy→Good(3), never promotes", () => {
    expect(
      deriveGrade({ correct: true, latencyMs: FSRS_HARD_LATENCY_MS + 1, priorKnow: 0.9 }),
    ).toBe(3);
    // …and a fast strong correct stays Easy.
    expect(deriveGrade({ correct: true, latencyMs: 1000, priorKnow: 0.9 })).toBe(4);
  });

  it("respects the hardMs override for the very-slow cap", () => {
    const ov = { hardMs: 20_000 };
    expect(deriveGrade({ correct: true, latencyMs: 21_000, priorKnow: 0.9 }, ov)).toBe(3);
    expect(deriveGrade({ correct: true, latencyMs: 19_000, priorKnow: 0.9 }, ov)).toBe(4);
  });

  it("always returns one of 1|2|3|4", () => {
    const inputs = [
      { correct: false },
      { correct: true },
      { correct: true, latencyMs: 500, priorKnow: 0.9, confidence: 4 },
      { correct: true, latencyMs: 60_000, priorKnow: 0.2, confidence: 1 },
      { correct: true, priorKnow: 0.5, confidence: 3 },
      { correct: true, latencyMs: 500, priorKnow: 0.7 },
      { correct: true, latencyMs: 15_000, optionCount: 2 },
    ];
    for (const inp of inputs) {
      expect([1, 2, 3, 4]).toContain(deriveGrade(inp));
    }
  });
});
