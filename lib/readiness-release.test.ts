import { describe, it, expect } from "vitest";

import {
  READINESS_RELEASE_EVIDENCE_M0,
  READINESS_RELEASE_GH_NODES,
  READINESS_RELEASE_MODEL_KEY,
  READINESS_RELEASE_RHO,
  READINESS_RELEASE_SIGMA0,
} from "./constants";
import { releaseDial, type ReleaseBlockInput } from "./readiness-release";

// The release model's design constants are PINNED by the wave19d-02 reference
// oracle (scripts/oracles/gen-19d-oracles.py). These literals are EXTERNAL — the
// oracle's printed values — not derived from the implementation under test.
describe("release-model constants match the frozen wave19d-02 oracle", () => {
  it("model key, ρ, σ₀, nNodes, m₀ equal the oracle's pinned values", () => {
    expect(READINESS_RELEASE_MODEL_KEY).toBe("lm-gh1");
    expect(READINESS_RELEASE_RHO).toBe(0.35);
    expect(READINESS_RELEASE_GH_NODES).toBe(20);
    expect(READINESS_RELEASE_EVIDENCE_M0).toBe(1);
    // SIGMA0 = 1.33096485927 from ρ→σ₀ = √(ρ/(1−ρ)·π²/3) at ρ=0.35.
    expect(READINESS_RELEASE_SIGMA0).toBeCloseTo(1.33096485927, 9);
  });
});

// Seeded, injectable PRNG (mulberry32) — DEFAULT so the property test is pure and
// deterministic (no Math.random / Date.now). Scope any determinism grep here.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Quotas mirror the official cat-B blueprint (pdr 10 / safety 4 / build 4 / medical 2).
const QUOTAS = [10, 4, 4, 2] as const;

describe("finalDial ≤ independence BY CONSTRUCTION (never-above guarantee)", () => {
  it("holds for every seeded random population (weak AND strong), across σ", () => {
    // Two regimes so the outer min is exercised both ways: weak means (mixture
    // RAISES the far-upper tail ⇒ min picks independence) and strong means
    // (mixture LOWERS the tail ⇒ min picks the mixture).
    for (const regime of ["weak", "strong"] as const) {
      const rng = mulberry32(regime === "weak" ? 0x19d07a : 0x19d07b);
      for (let trial = 0; trial < 200; trial++) {
        const [lo, hi] = regime === "weak" ? [0.3, 0.75] : [0.85, 0.999];
        const blocks: ReleaseBlockInput[] = QUOTAS.map((quota) => {
          const nSeen = 1 + Math.floor(rng() * 40);
          const seenR = Array.from({ length: nSeen }, () => lo + rng() * (hi - lo));
          const nUnseen = Math.floor(rng() * 5);
          return { quota, seenR, nUnseen };
        });
        const reviewMass = rng() * 2000; // spans thin (large σ) to rich (σ→0)
        const slope = 0.6 + rng() * 0.4;
        const r = releaseDial({ blocks, reviewMass, slope });

        expect(r.final).toBeLessThanOrEqual(r.independence + 1e-9);
        expect(r.final).toBe(Math.min(r.mixture, r.independence));
        expect(r.finalDial).toBeLessThanOrEqual(r.independenceDial);
        // dials sit in the valid probability-percent range
        expect(r.finalDial).toBeGreaterThanOrEqual(0);
        expect(r.independenceDial).toBeLessThanOrEqual(100);
      }
    }
  });

  it("exposes the composed per-block split and the σ decay", () => {
    const r = releaseDial({
      blocks: QUOTAS.map((quota) => ({ quota, seenR: [0.9, 0.9, 0.9], nUnseen: 2 })),
      reviewMass: 4,
      slope: 1,
    });
    expect(r.perBlock).toHaveLength(4);
    for (const b of r.perBlock) {
      expect(b.nSeen).toBe(3);
      expect(b.pSlot).toBeGreaterThan(0);
      expect(b.C).toBeLessThanOrEqual(b.pSlot + 1e-9); // unseen credited ≤ seen mean
    }
    // σ decays as review mass grows.
    const rich = releaseDial({
      blocks: QUOTAS.map((quota) => ({ quota, seenR: [0.9, 0.9, 0.9], nUnseen: 2 })),
      reviewMass: 2000,
      slope: 1,
    });
    expect(rich.sigma).toBeLessThan(r.sigma);
  });
});
