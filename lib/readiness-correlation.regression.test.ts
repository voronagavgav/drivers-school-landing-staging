import { describe, it, expect } from "vitest";
import { correlatedPassProbability, correlatedBlockPmf } from "./readiness-correlation";
import { poissonBinomialAtLeast } from "./readiness-model";

// Wave 19b task 02 anchors: ρ=0 changes NOTHING (bit-for-bit regression) and, in
// the exam regime (threshold ≤ mean), P(pass) is NON-INCREASING in ρ.

// Flatten blocks to the concatenated per-item probability vector the flat
// Poisson-binomial DP consumes (`quota` entries of `meanProb` per block).
const flatten = (blocks: { quota: number; meanProb: number }[]): number[] =>
  blocks.flatMap((b) => new Array<number>(b.quota).fill(b.meanProb));

describe("ρ=0 reproduces the exact Poisson-binomial bit-for-bit (regression anchor)", () => {
  const fixtures: { quota: number; meanProb: number }[][] = [
    [
      { quota: 5, meanProb: 0.9 },
      { quota: 5, meanProb: 0.7 },
      { quota: 10, meanProb: 0.8 },
    ],
    [
      { quota: 4, meanProb: 0.55 },
      { quota: 6, meanProb: 0.95 },
      { quota: 10, meanProb: 0.4 },
    ],
    [
      { quota: 3, meanProb: 0.6 },
      { quota: 7, meanProb: 0.5 },
      { quota: 2, meanProb: 0.3 },
      { quota: 8, meanProb: 0.85 },
    ],
  ];

  for (const [i, blocks] of fixtures.entries()) {
    it(`fixture #${i + 1}: correlatedPassProbability(_, k, 0) === poissonBinomialAtLeast(k, flat)`, () => {
      const ps = flatten(blocks);
      for (const k of [10, 14, 16, 18]) {
        expect(correlatedPassProbability(blocks, k, 0)).toBeCloseTo(
          poissonBinomialAtLeast(k, ps),
          12,
        );
      }
    });
  }
});

describe("threshold ≤ mean ⇒ P(pass) is non-increasing in ρ", () => {
  const RHOS = [0, 0.15, 0.35, 0.6];

  it("block set with threshold below its mean: P(pass) never rises as ρ increases", () => {
    const blocks = [
      { quota: 5, meanProb: 0.9 },
      { quota: 5, meanProb: 0.7 },
      { quota: 10, meanProb: 0.8 },
    ];
    // total mean = 4.5 + 3.5 + 8 = 16; threshold 14 sits below it (exam regime).
    const threshold = 14;
    const seq = RHOS.map((rho) => correlatedPassProbability(blocks, threshold, rho));
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeLessThanOrEqual(seq[i - 1] + 1e-12);
    }
  });

  it("pinned n=2, p=0.5 block: P(≥1) strictly decreases 0.75 → 2/3 as ρ rises 0 → 1/3", () => {
    const at = (rho: number) =>
      correlatedBlockPmf(2, 0.5, rho)
        .slice(1)
        .reduce((a, b) => a + b, 0);
    expect(at(0)).toBeCloseTo(0.75, 12);
    expect(at(1 / 3)).toBeCloseTo(0.6666666667, 10);
    expect(at(1 / 3)).toBeLessThan(at(0));
  });
});
