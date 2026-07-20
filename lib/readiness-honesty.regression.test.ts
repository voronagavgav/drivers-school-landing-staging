import { describe, expect, it } from "vitest";
import { computeReadiness } from "./readiness-model";
import { READINESS_TOPIC_CORRELATION } from "./constants";

/**
 * Direction gate for the wave19b binding honesty rule (specs/wave19b-readiness-honesty.md §1):
 * whatever correlation correction is wired into the LIVE dial must NEVER report a HIGHER
 * pass probability than the uncorrected independent (Poisson-binomial) model for a
 * below-threshold-mean student — the population the dial exists to warn.
 *
 * Regime pinned here is the REAL exam regime (threshold 18 of 20, real cat-B quota shape),
 * with a weak-student mean of 14/20 — exactly the case the wave19b-02 tail inflation got
 * backwards (adversarial review 2026-07-12: ρ=0.35 raised 3.5% → 16.7%). This gate failed
 * against that shipped state and passes with ρ neutralized to 0; a future estimation-side
 * correction (wave19c) must keep it green by construction.
 */
const REAL_QUOTAS = [2, 2, 2, 1, 2, 11]; // live cat-B blueprint block quotas (sum 20)

function weakStudentInput(topicCorrelation: number) {
  return {
    seen: Array(40).fill(0.7), // uniformly weak: expected ≈14/20 < 18 threshold
    unseenCount: 0,
    unseenPrior: 0.5,
    blueprint: {
      questionCount: 20,
      passThreshold: 18,
      blocks: REAL_QUOTAS.map((quota) => ({ quota, meanProb: 0.7 })),
    },
    topicCorrelation,
  };
}

describe("readiness dial honesty direction gate (wave19b review)", () => {
  it("LIVE correlation constant never raises a weak student's dial above the independent model", () => {
    const independent = computeReadiness(weakStudentInput(0));
    const live = computeReadiness(weakStudentInput(READINESS_TOPIC_CORRELATION));
    expect(live.passProbability).toBeLessThanOrEqual(
      independent.passProbability + 1e-12,
    );
  });

  it("documents the inversion: naive tail inflation at ρ=0.35 RAISES the weak student's dial (why it must stay unwired)", () => {
    const independent = computeReadiness(weakStudentInput(0));
    const naiveTail = computeReadiness(weakStudentInput(0.35));
    // The defect this gate exists for: if this ever flips to ≤, the tail math changed —
    // re-evaluate whether ρ>0 may be re-enabled (and delete this pin only with a new oracle).
    expect(naiveTail.passProbability).toBeGreaterThan(
      independent.passProbability,
    );
  });
});
