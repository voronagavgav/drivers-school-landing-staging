import { describe, it, expect } from "vitest";
import {
  perItemPassProb,
  poissonBinomialAtLeast,
  computeReadiness,
} from "./readiness-model";

const bp = { questionCount: 20, passThreshold: 18 };

describe("readiness-model.poissonBinomialAtLeast exact DP", () => {
  it("P(≥2 of [0.2, 0.5, 0.9]) == 0.55", () => {
    expect(poissonBinomialAtLeast(2, [0.2, 0.5, 0.9])).toBeCloseTo(0.55, 9);
  });

  it("all-equal p reduces to the binomial: P(≥2 of three fair coins) == 0.5", () => {
    expect(poissonBinomialAtLeast(2, [0.5, 0.5, 0.5])).toBeCloseTo(0.5, 9);
  });

  it("k ≤ 0 is certain, k > n is impossible", () => {
    expect(poissonBinomialAtLeast(0, [0.3, 0.7])).toBe(1);
    expect(poissonBinomialAtLeast(3, [0.5, 0.5])).toBe(0);
  });
});

describe("readiness-model.perItemPassProb", () => {
  it("clamps R × slope into [0, 1]", () => {
    expect(perItemPassProb(0.8)).toBeCloseTo(0.8, 9);
    expect(perItemPassProb(0.8, 2)).toBe(1);
    expect(perItemPassProb(-0.5)).toBe(0);
  });
});

describe("readiness-model.computeReadiness range", () => {
  it("dialPercent is an integer in [0, 100] and passProbability ∈ [0, 1]", () => {
    const r = computeReadiness({
      seen: Array(40).fill(0.75),
      unseenCount: 10,
      unseenPrior: 0.55,
      blueprint: bp,
    });
    expect(Number.isInteger(r.dialPercent)).toBe(true);
    expect(r.dialPercent).toBeGreaterThanOrEqual(0);
    expect(r.dialPercent).toBeLessThanOrEqual(100);
    expect(r.passProbability).toBeGreaterThanOrEqual(0);
    expect(r.passProbability).toBeLessThanOrEqual(1);
  });

  it("stays in range on the degenerate empty pool", () => {
    const r = computeReadiness({ seen: [], unseenCount: 0, unseenPrior: 0.5, blueprint: bp });
    expect(r.dialPercent).toBeGreaterThanOrEqual(0);
    expect(r.dialPercent).toBeLessThanOrEqual(100);
  });
});

describe("readiness-model.computeReadiness honesty monotonicity", () => {
  it("readiness rises as seen-R rises", () => {
    const hi = computeReadiness({ seen: Array(40).fill(0.95), unseenCount: 0, unseenPrior: 0.55, blueprint: bp });
    const lo = computeReadiness({ seen: Array(40).fill(0.55), unseenCount: 0, unseenPrior: 0.55, blueprint: bp });
    expect(hi.dialPercent).toBeGreaterThan(lo.dialPercent);
    expect(hi.passProbability).toBeGreaterThan(lo.passProbability);
  });

  it("more unseen items must not raise readiness (conservative prior)", () => {
    const few = computeReadiness({ seen: Array(40).fill(0.9), unseenCount: 5, unseenPrior: 0.5, blueprint: bp });
    const many = computeReadiness({ seen: Array(40).fill(0.9), unseenCount: 200, unseenPrior: 0.5, blueprint: bp });
    expect(many.dialPercent).toBeLessThanOrEqual(few.dialPercent);
    expect(many.passProbability).toBeLessThanOrEqual(few.passProbability);
  });
});

describe("readiness-model.computeReadiness unseen-prior honesty", () => {
  // effectiveUnseenPrior = min(unseenPrior, seenMeanProb) when seen exists, so
  // adding unseen items can NEVER raise readiness above the seen-only figure.
  it("weak learner (seenMean < unseenPrior): adding unseen items does not raise readiness", () => {
    // seenMean ≈ 0.40 < unseenPrior 0.60 → clamp pins the unseen prior at 0.40.
    const seenOnly = computeReadiness({ seen: Array(30).fill(0.4), unseenCount: 0, unseenPrior: 0.6, blueprint: bp });
    const withUnseen = computeReadiness({ seen: Array(30).fill(0.4), unseenCount: 100, unseenPrior: 0.6, blueprint: bp });
    // The clamp pins the unseen prior at the seen mean, so μ (and readiness) are
    // mathematically UNCHANGED — never raised. Allow only float-representation
    // noise; a real inflation from the raw prior would be orders larger.
    expect(withUnseen.passProbability).toBeLessThanOrEqual(seenOnly.passProbability + 1e-9);
    expect(withUnseen.dialPercent).toBeLessThanOrEqual(seenOnly.dialPercent);
    expect(withUnseen.meanItemProb).toBeCloseTo(seenOnly.meanItemProb, 12);
    // Without the clamp the raw prior 0.6 > seen mean 0.4 WOULD have lifted μ.
    const naiveMean = (30 * 0.4 + 100 * 0.6) / 130;
    expect(naiveMean).toBeGreaterThan(withUnseen.meanItemProb);
  });

  it("strong learner (seenMean > unseenPrior): effective prior is the raw unseenPrior (unchanged)", () => {
    // seenMean ≈ 0.90 > unseenPrior 0.55 → min(...) = 0.55, the raw prior.
    const withUnseen = computeReadiness({ seen: Array(30).fill(0.9), unseenCount: 20, unseenPrior: 0.55, blueprint: bp });
    // Reference μ computed with the RAW prior on the unseen slots.
    const expectedMean = (30 * 0.9 + 20 * 0.55) / 50;
    expect(withUnseen.meanItemProb).toBeCloseTo(expectedMean, 12);
    // Conservative behaviour preserved: unseen items still drag readiness down.
    const seenOnly = computeReadiness({ seen: Array(30).fill(0.9), unseenCount: 0, unseenPrior: 0.55, blueprint: bp });
    expect(withUnseen.passProbability).toBeLessThanOrEqual(seenOnly.passProbability);
  });

  it("empty seen: the raw unseenPrior still applies", () => {
    const r = computeReadiness({ seen: [], unseenCount: 20, unseenPrior: 0.55, blueprint: bp });
    expect(r.meanItemProb).toBeCloseTo(0.55, 12);
  });
});

describe("readiness-model.computeReadiness mock Beta shrinkage", () => {
  // A strong model: high seen-R, full coverage → high pure-model pass probability.
  const strong = { seen: Array(40).fill(0.95), unseenCount: 0, unseenPrior: 0.55, blueprint: bp };

  it("high model readiness + 0/10 mocks drags readiness < 0.35", () => {
    const noMock = computeReadiness(strong);
    expect(noMock.passProbability).toBeGreaterThan(0.5);

    const withMock = computeReadiness({ ...strong, mockAttempts: 10, mockPasses: 0 });
    expect(withMock.passProbability).toBeLessThan(0.35);
  });

  it("10/10 mocks raises readiness above a weak model's pure estimate", () => {
    const weak = { seen: Array(40).fill(0.55), unseenCount: 0, unseenPrior: 0.5, blueprint: bp };
    const pure = computeReadiness(weak);
    const withMock = computeReadiness({ ...weak, mockAttempts: 10, mockPasses: 10 });
    expect(withMock.passProbability).toBeGreaterThan(pure.passProbability);
    // (0·? ...) — anchor 4 at P_model, 10 passes: (10 + 4·P)/(10 + 4) > P for P < 1.
    expect(withMock.passProbability).toBeGreaterThan(0.7);
  });

  it("m = 0 (no attempts) yields exactly the pure model probability", () => {
    const pure = computeReadiness(strong);
    const zeroAttempts = computeReadiness({ ...strong, mockAttempts: 0, mockPasses: 0 });
    expect(zeroAttempts.passProbability).toBeCloseTo(pure.passProbability, 12);
  });
});

describe("readiness-model.computeReadiness blueprint block heterogeneity", () => {
  // Two-block blueprint: 18 strong slots at 0.95 + a 2-slot weak block at 0.10,
  // pass 18-of-20. A constant pool-mean vector would smear the weak block into
  // the average and over-report readiness; the heterogeneous p-vector must not.
  const blocks = [
    { quota: 18, meanProb: 0.95 },
    { quota: 2, meanProb: 0.1 },
  ];
  const blueprint = { questionCount: 20, passThreshold: 18, blocks };

  it("matches the exact heterogeneous Poisson-binomial tail, NOT the pool-mean binomial", () => {
    const r = computeReadiness({
      seen: [],
      unseenCount: 0,
      unseenPrior: 0.5,
      blueprint,
    });

    // (a) Independent reference: the exact tail over the heterogeneous vector.
    const hetVector = [...Array(18).fill(0.95), ...Array(2).fill(0.1)];
    const hetTail = poissonBinomialAtLeast(18, hetVector);
    expect(r.passProbability).toBeCloseTo(hetTail, 12);

    // (b) The degenerate pool-mean binomial value the OLD path would have used:
    // every slot at μ = (18·0.95 + 2·0.10)/20 = 0.865. Heterogeneity must have
    // changed the answer.
    const poolMean = (18 * 0.95 + 2 * 0.1) / 20;
    const degenerate = poissonBinomialAtLeast(18, Array(20).fill(poolMean));
    expect(r.passProbability).not.toBeCloseTo(degenerate, 6);
    // The weak 2-slot block makes passing 18-of-20 much harder than the smeared
    // binomial implies.
    expect(r.passProbability).toBeLessThan(degenerate);
  });

  // Exact-value directional oracle (wave19b-06): correct blueprint bucketing changes the number.
  // Blocks [{quota:2, meanProb:0.4}, {quota:2, meanProb:0.95}], pass 3-of-4. Hand-computed exact
  // Poisson-binomial tail over p=[0.4,0.4,0.95,0.95]:
  //   P(4) = 0.4²·0.95² = 0.1444
  //   P(3) = 2·(0.6·0.4·0.95²) + 2·(0.4²·0.05·0.95) = 2·0.2166 + 2·0.0076 = 0.4484
  //   P(≥3) = 0.5928
  // The HOMOGENEOUS flat-pool fallback at the SAME pool mean μ = (2·0.4 + 2·0.95)/4 = 0.675 gives
  // Binomial(4, 0.675) P(≥3) = 0.675⁴ + 4·0.675³·0.325 = 0.607405078125 — STRICTLY HIGHER. Concentrated
  // weakness in a fixed-quota block therefore gives a LOWER P(pass) than the pooled average.
  it("exact heterogeneous P(pass) 0.5928 < homogeneous pooled 0.6074050781 (3-of-4)", () => {
    const blueprint = {
      questionCount: 4,
      passThreshold: 3,
      blocks: [
        { quota: 2, meanProb: 0.4 },
        { quota: 2, meanProb: 0.95 },
      ],
    };
    const r = computeReadiness({ seen: [], unseenCount: 0, unseenPrior: 0.5, blueprint });
    expect(r.passProbability).toBeCloseTo(0.5928, 10);

    const homogeneous = poissonBinomialAtLeast(3, Array(4).fill(0.675));
    expect(homogeneous).toBeCloseTo(0.6074050781, 10);
    expect(r.passProbability).toBeLessThan(homogeneous);
  });
});
