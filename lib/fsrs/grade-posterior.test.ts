// FROZEN oracle for the Bayesian guessing-corrected grade inference (Wave 19b deliverable #2).
//
// TESTS ONLY. This file PINS the exact BKT (Bayesian Knowledge Tracing) guess/slip posterior update
// math BEFORE task wave19b-05 implements `deriveGrade` / `gradePosterior`, so the implementation
// cannot be tuned to a self-consistent test (anti self-grading).
//
// THE MODEL — a single-correct MCQ answer is a guess/slip observation of a latent "knows this item"
// variable K:
//   - Prior  p0 = P(knows) BEFORE this answer. Sourced by the server (task 05) as the retrievability
//     of the prior memory state for a card with history; a NEUTRAL 0.5 for a first-ever/`new` card
//     (never the R=1 of an unreviewed card).
//   - Guess floor  g = 1/optionCount   (default 0.25 for 4-option ПДР items; 0.5 for a 2-option item).
//   - Slip         s = FSRS_SLIP = 0.10 (constant; pinned here, added to constants.ts by task 05).
//   - Likelihoods: P(correct | knows) = 1 − s ,  P(correct | ¬knows) = g.
//
// Bayes' theorem with this 2-outcome likelihood gives closed forms (EXTERNAL truth — exact rationals,
// NOT fitted to any implementation):
//   CORRECT: π = p0·(1−s) / ( p0·(1−s) + (1−p0)·g )
//   WRONG:   π = p0·s     / ( p0·s     + (1−p0)·(1−g) )
//
// ORACLE INTEGRITY: the frozen literals below are hand-computed from Bayes' theorem, not derived by
// calling any implementation. They are asserted against a small pinned PURE helper this file defines
// (`bktPosterior`, itself the closed form) — a self-consistency check that grades the FROZEN VECTORS
// against the Bayes formula, independent of task 05's not-yet-written `gradePosterior`. Task 05 must
// reproduce these exact posteriors; it MUST NOT change them to fit its code.
//
// SCOPE: this task freezes only the posterior PROBABILITY (the mathematical core) plus the two
// behavioral intents documented at the bottom. The posterior→grade THRESHOLDS (which FSRS band π maps
// to) are product tuning OWNED BY TASK 05 and are deliberately NOT frozen here.

import { describe, it, expect } from "vitest";

/**
 * Pinned pure closed form of the BKT guess/slip posterior — the EXTERNAL Bayes truth the frozen
 * literals below are graded against. Defined locally (not imported) so this oracle is green and
 * non-skipped BEFORE task 05 exports `gradePosterior`; task 05's implementation must match it.
 */
function bktPosterior(p0: number, correct: boolean, g: number, s: number): number {
  if (correct) {
    // P(K|correct) = P(correct|K)·P(K) / P(correct)
    return (p0 * (1 - s)) / (p0 * (1 - s) + (1 - p0) * g);
  }
  return (p0 * s) / (p0 * s + (1 - p0) * (1 - g));
}

describe("BKT guess/slip posterior — FROZEN Bayes oracle (g=0.25, s=0.10)", () => {
  const g = 0.25;
  const s = 0.1;

  it("CORRECT-answer posterior π(p0) matches the hand-computed Bayes rationals", () => {
    // p0=0.2: 0.2·0.9 / (0.2·0.9 + 0.8·0.25) = 0.18 / 0.38
    expect(bktPosterior(0.2, true, g, s)).toBeCloseTo(0.4736842105, 10);
    // p0=0.5: 0.5·0.9 / (0.5·0.9 + 0.5·0.25) = 0.45 / 0.575
    expect(bktPosterior(0.5, true, g, s)).toBeCloseTo(0.7826086957, 10);
    // p0=0.8: 0.8·0.9 / (0.8·0.9 + 0.2·0.25) = 0.72 / 0.77
    expect(bktPosterior(0.8, true, g, s)).toBeCloseTo(0.9350649351, 10);
    // p0=0.9: 0.9·0.9 / (0.9·0.9 + 0.1·0.25) = 0.81 / 0.835
    expect(bktPosterior(0.9, true, g, s)).toBeCloseTo(0.9700598802, 10);
  });

  it("WRONG-answer posterior π(p0) matches the hand-computed Bayes rational (informational only)", () => {
    // p0=0.8: 0.8·0.10 / (0.8·0.10 + 0.2·0.75) = 0.08 / 0.23
    // (A wrong answer still grades Again(1) in task 05 — this posterior is not on the grade path.)
    expect(bktPosterior(0.8, false, g, s)).toBeCloseTo(0.3478260870, 10);
  });
});

describe("BKT guess/slip posterior — FROZEN oracle for a 2-option item (g=0.50, s=0.10)", () => {
  it("CORRECT-answer posterior at p0=0.5 is higher-guess-floor corrected", () => {
    // g = 1/2 for a 2-option item: 0.5·0.9 / (0.5·0.9 + 0.5·0.5) = 0.45 / 0.70
    expect(bktPosterior(0.5, true, 0.5, 0.1)).toBeCloseTo(0.6428571429, 10);
  });
});

describe("BKT posterior — the two BEHAVIORAL intents task wave19b-05 must satisfy", () => {
  const g = 0.25;
  const s = 0.1;

  // INTENT (a): a lucky FAST-CORRECT on a WEAK item (low prior p0) must NOT grade Easy(4). The
  // guessing correction pulls the posterior well below any Easy band — at p0=0.2 a correct answer
  // only reaches π≈0.47, i.e. barely-better-than-a-coin-flip belief, so a fast latency alone must
  // not fabricate Easy. This is the whole point of the fix.
  it("(a) a weak-item correct stays LOW — the anti-lucky-guess property", () => {
    const weak = bktPosterior(0.2, true, g, s);
    expect(weak).toBeCloseTo(0.4736842105, 10);
    expect(weak).toBeLessThan(0.5); // task 05's Easy band must sit ABOVE this posterior
  });

  // INTENT (b): a genuine strong-item correct (high prior p0) still reaches a near-certain posterior,
  // so it CAN grade Easy(4). The correction must not punish confident, well-remembered items.
  it("(b) a strong-item correct reaches near-certainty — Easy stays reachable", () => {
    const strong = bktPosterior(0.9, true, g, s);
    expect(strong).toBeCloseTo(0.9700598802, 10);
    expect(strong).toBeGreaterThan(0.95);
  });

  it("posterior is monotone increasing in the prior for a CORRECT answer", () => {
    const seq = [0.2, 0.5, 0.8, 0.9].map((p0) => bktPosterior(p0, true, g, s));
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeGreaterThan(seq[i - 1]);
    }
  });
});
