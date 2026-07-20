import { describe, it, expect } from "vitest";
import { deriveGrade, gradePosterior } from "./grade";
import { FSRS_HARD_LATENCY_MS } from "./constants";

// GRADE-SIDE-PROBES boundary census (spec Deliverable 7 / D6): pin the interaction of the confidence
// veto and the very-slow latency cap with the honest guess floor. Both secondary axes are CAP-ONLY —
// they sit AFTER the posterior→band map (grade.ts) and never promote. Expected bands are derived from
// the frozen BKT posterior math (grade-posterior.test.ts), NOT by calling the impl.
describe("confidence veto & latency cap census (cap-only, applied after the posterior band)", () => {
  // A 5-option correct at a strong prior lands at Easy(4) before any cap:
  //   g = min(1/5, 0.45) = 0.2, s = 0.10 → π = 0.9·0.9/(0.9·0.9 + 0.1·0.2) = 0.81/0.83 ≈ 0.9759 ≥ 0.93.
  const STRONG_5OPT = { correct: true as const, priorKnow: 0.9, optionCount: 5 };

  it("the frozen strong-5opt posterior is Easy-band (sanity anchor, not the impl)", () => {
    expect(gradePosterior(STRONG_5OPT)).toBeCloseTo(0.9759036145, 10);
  });

  it("confidence ≤2 caps a strong Easy(4) correct down to Hard(2), after the posterior", () => {
    // Uncapped the band is Easy(4); confidence=1 (≤ FSRS_LOW_CONFIDENCE_MAX=2) caps it to Hard(2).
    expect(deriveGrade({ ...STRONG_5OPT, confidence: 1 })).toBe(2);
    expect(deriveGrade({ ...STRONG_5OPT, confidence: 2 })).toBe(2);
  });

  it("the same strong-5opt correct with confidence & latency null is the uncapped band Easy(4)", () => {
    expect(deriveGrade(STRONG_5OPT)).toBe(4);
  });

  it("both caps stack: very-slow (≥ hardMs) AND confidence ≤2 ⇒ Hard(2)", () => {
    // very-slow caps Easy(4)→Good(3); confidence≤2 then caps Good(3)→Hard(2).
    expect(
      deriveGrade({ ...STRONG_5OPT, latencyMs: FSRS_HARD_LATENCY_MS, confidence: 1 }),
    ).toBe(2);
    expect(
      deriveGrade({ ...STRONG_5OPT, latencyMs: FSRS_HARD_LATENCY_MS + 5_000, confidence: 2 }),
    ).toBe(2);
  });

  it("confidence null AND latency null is a NO-OP: exactly the posterior band", () => {
    // Strong 5-opt → Easy(4); weak 4-opt (π ≈ 0.4737 < 0.75) → Hard(2); neutral 2-opt → Hard(2).
    expect(deriveGrade(STRONG_5OPT)).toBe(4);
    expect(deriveGrade({ correct: true, priorKnow: 0.2, optionCount: 4 })).toBe(2);
    expect(deriveGrade({ correct: true, priorKnow: 0.5, optionCount: 2 })).toBe(2);
  });

  it("confidence ≥3 (confident) does NOT promote — the grade stays the posterior band", () => {
    // A confident weak correct is still Hard(2) (no cap raises); a confident strong correct stays Easy(4).
    expect(deriveGrade({ correct: true, priorKnow: 0.2, optionCount: 4, confidence: 4 })).toBe(2);
    expect(deriveGrade({ ...STRONG_5OPT, confidence: 3 })).toBe(4);
    expect(deriveGrade({ ...STRONG_5OPT, confidence: 4 })).toBe(4);
  });

  it("the veto composes with the honest guess floor idempotently", () => {
    // A 2-option correct at a neutral prior is ALREADY Hard(2): g=min(1/2,0.45)=0.45 →
    // π = 0.5·0.9/(0.5·0.9 + 0.5·0.45) = 0.45/0.675 = 0.6666… < 0.75. confidence≤2 leaves it Hard(2).
    expect(gradePosterior({ correct: true, priorKnow: 0.5, optionCount: 2 })).toBeCloseTo(
      0.6666666667,
      10,
    );
    const floored = deriveGrade({ correct: true, priorKnow: 0.5, optionCount: 2 });
    expect(floored).toBe(2);
    expect(deriveGrade({ correct: true, priorKnow: 0.5, optionCount: 2, confidence: 1 })).toBe(2);
  });
});
