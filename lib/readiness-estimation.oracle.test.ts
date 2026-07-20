import { describe, it, expect } from "vitest";

// FROZEN ORACLE for the estimation-side ρ correction (`./readiness-estimation`).
// The IMPLEMENTATION is wave19c-06 — it MUST NOT be written here, and the
// assertions below are the frozen oracle later tasks may not edit.
//
// Every literal is EXTERNAL: the spec `specs/wave19c-estimation-side-rho.md`
// §FROZEN ORACLES, itself frozen from scipy-1.18 in
// docs/research/RHO-CORRECTION-RESEARCH-2026-07-12.json. Never recompute them
// from an implementation.
//
// The correction per topic block t:
//   n_eff = n_t / (1 + (n_t − 1)·ρ)
//   Jeffreys Beta(a,b): a = p̂·n_eff + ½, b = (1−p̂)·n_eff + ½
//   tier MEAN:     p̃ = min(p̂, a/(a+b))
//   tier QUANTILE: p̃ = min(p̂, betaInv(α, a, b))
//   tier "off":    p̃ = p̂  (independence baseline)
// then the p̃ vector (each block expanded to its exam quota) feeds the EXISTING
// `poissonBinomialAtLeast` DP — no new tail math.
//
// While the impl did not yet exist the whole suite was suspended and reached
// the future module via a dynamic import (the missing-module type error was
// silenced by a directive); wave19c-06 removed both once the module landed.

// End-to-end fixtures (4 topics × quota 5, nSeen 5 each, threshold ≥18, ρ=0.3).
type Block = { quota: number; meanProb: number; nSeen: number };
const blocks = (ps: number[]): Block[] =>
  ps.map((p) => ({ quota: 5, meanProb: p, nSeen: 5 }));
const WEAK = [0.55, 0.6, 0.65, 0.6];
const MID = [0.75, 0.8, 0.7, 0.78];
const STRONG = [0.92, 0.95, 0.9, 0.94];
const MIXED = [0.95, 0.95, 0.55, 0.9];
const THRESHOLD = 18;

describe("readiness-estimation ρ correction (frozen oracle, un-skipped in wave19c-06)", () => {
  it("effectiveN — design-effect deflation n/(1+(n−1)ρ)", async () => {
    const { effectiveN } = await import("./readiness-estimation");
    expect(Math.abs(effectiveN(5, 0.3) - 5 / 2.2)).toBeLessThan(1e-10); // 2.2727272727
    expect(effectiveN(1, 0.3)).toBeCloseTo(1, 10); // (n−1)=0 ⇒ no deflation
    expect(effectiveN(0, 0.3)).toBe(0); // unseen block, finite
  });

  it("jeffreysBetaParams — a = p̂·n_eff + ½, b = (1−p̂)·n_eff + ½", async () => {
    const { jeffreysBetaParams } = await import("./readiness-estimation");
    const nEff = 5 / 2.2; // 2.2727272727
    const j = jeffreysBetaParams(0.6, nEff);
    expect(j.a).toBeCloseTo(1.863636364, 6);
    expect(j.b).toBeCloseTo(1.409090909, 6);
  });

  it("tier MEAN posterior-mean shrinkage (n_eff = 5/2.2)", async () => {
    const { correctBlockMeanProb } = await import("./readiness-estimation");
    expect(correctBlockMeanProb(0.6, 5, 0.3, { tier: "mean" })).toBeCloseTo(0.569444, 6);
    expect(correctBlockMeanProb(0.8, 5, 0.3, { tier: "mean" })).toBeCloseTo(0.708333, 6);
    expect(correctBlockMeanProb(0.95, 5, 0.3, { tier: "mean" })).toBeCloseTo(0.8125, 6);
  });

  it("tier QUANTILE (α=0.2) shrinkage — scipy-1.18 frozen", async () => {
    const { correctBlockMeanProb } = await import("./readiness-estimation");
    expect(correctBlockMeanProb(0.6, 5, 0.3, { tier: "quantile", alpha: 0.2 })).toBeCloseTo(0.339343, 6);
    expect(correctBlockMeanProb(0.8, 5, 0.3, { tier: "quantile", alpha: 0.2 })).toBeCloseTo(0.511245, 6);
    expect(correctBlockMeanProb(0.95, 5, 0.3, { tier: "quantile", alpha: 0.2 })).toBeCloseTo(0.665395, 6);
  });

  it("tier off returns p̂ unchanged", async () => {
    const { correctBlockMeanProb } = await import("./readiness-estimation");
    for (const p of [0.3, 0.6, 0.95]) {
      expect(correctBlockMeanProb(p, 5, 0.3, { tier: "off" })).toBeCloseTo(p, 12);
    }
  });

  it("end-to-end dials — independence(off) baseline (== raw poissonBinomialAtLeast on p̂)", async () => {
    const { correctedPassProbability } = await import("./readiness-estimation");
    const off = { tier: "off" as const };
    expect(correctedPassProbability(blocks(WEAK), THRESHOLD, 0.3, off)).toBeCloseTo(0.003541, 6);
    expect(correctedPassProbability(blocks(MID), THRESHOLD, 0.3, off)).toBeCloseTo(0.103036, 6);
    expect(correctedPassProbability(blocks(STRONG), THRESHOLD, 0.3, off)).toBeCloseTo(0.827096, 6);
    expect(correctedPassProbability(blocks(MIXED), THRESHOLD, 0.3, off)).toBeCloseTo(0.317318, 6);
  });

  it("end-to-end dials — tier MEAN", async () => {
    const { correctedPassProbability } = await import("./readiness-estimation");
    const mean = { tier: "mean" as const };
    expect(correctedPassProbability(blocks(WEAK), THRESHOLD, 0.3, mean)).toBeCloseTo(0.001586, 6);
    expect(correctedPassProbability(blocks(MID), THRESHOLD, 0.3, mean)).toBeCloseTo(0.022708, 6);
    expect(correctedPassProbability(blocks(STRONG), THRESHOLD, 0.3, mean)).toBeCloseTo(0.196467, 6);
    expect(correctedPassProbability(blocks(MIXED), THRESHOLD, 0.3, mean)).toBeCloseTo(0.061504, 6);
  });

  it("end-to-end dials — tier QUANTILE (α=0.2)", async () => {
    const { correctedPassProbability } = await import("./readiness-estimation");
    const q = { tier: "quantile" as const, alpha: 0.2 };
    expect(correctedPassProbability(blocks(WEAK), THRESHOLD, 0.3, q)).toBeLessThan(1e-5); // ≈0
    expect(correctedPassProbability(blocks(MID), THRESHOLD, 0.3, q)).toBeCloseTo(0.000078, 6);
    expect(correctedPassProbability(blocks(STRONG), THRESHOLD, 0.3, q)).toBeCloseTo(0.009722, 6);
    expect(correctedPassProbability(blocks(MIXED), THRESHOLD, 0.3, q)).toBeCloseTo(0.000722, 6);
  });

  // DIRECTION GUARANTEES — pinned on the WEAK population (.55,.60,.65,.60),
  // matching the spec's weak row so the correction is proven where it matters.
  it("(i) min-clamp p̃ ≤ p̂ for BOTH tiers, all p̂ (binds for p̂ < ½)", async () => {
    const { correctBlockMeanProb } = await import("./readiness-estimation");
    for (const p of [0.3, 0.45, 0.6, 0.8, 0.95]) {
      expect(correctBlockMeanProb(p, 5, 0.3, { tier: "mean" })).toBeLessThanOrEqual(p);
      expect(correctBlockMeanProb(p, 5, 0.3, { tier: "quantile", alpha: 0.2 })).toBeLessThanOrEqual(p);
    }
    // clamp binds exactly at p̂ = .30 (posterior mean > p̂, so min() returns p̂)
    expect(correctBlockMeanProb(0.3, 5, 0.3, { tier: "mean" })).toBe(0.3);
  });

  it("(ii) tier-MEAN dial ≤ independence(off) dial for EVERY student incl. weak", async () => {
    const { correctedPassProbability } = await import("./readiness-estimation");
    for (const ps of [WEAK, MID, STRONG, MIXED]) {
      const off = correctedPassProbability(blocks(ps), THRESHOLD, 0.3, { tier: "off" });
      const mean = correctedPassProbability(blocks(ps), THRESHOLD, 0.3, { tier: "mean" });
      expect(mean).toBeLessThanOrEqual(off);
    }
  });

  it("(iii) monotone in ρ on the WEAK student — larger ρ ⇒ lower dial", async () => {
    const { correctedPassProbability } = await import("./readiness-estimation");
    const hi = correctedPassProbability(blocks(WEAK), THRESHOLD, 0.5, { tier: "mean" });
    const lo = correctedPassProbability(blocks(WEAK), THRESHOLD, 0.3, { tier: "mean" });
    expect(hi).toBeLessThanOrEqual(lo);
  });

  it("degenerate p̂ ∈ {0,1} and n_t=0 — finite, in [0,1], clamp holds", async () => {
    const { correctBlockMeanProb } = await import("./readiness-estimation");
    const one = correctBlockMeanProb(1, 5, 0.3, { tier: "mean" });
    expect(one).toBeCloseTo(0.847222, 6); // a/(a+b) < 1, clamp inert
    expect(one).toBeLessThanOrEqual(1);
    expect(correctBlockMeanProb(0, 5, 0.3, { tier: "mean" })).toBe(0); // clamp to p̂=0
    // both tiers finite at the boundaries
    for (const p of [0, 1]) {
      for (const tier of ["mean", "quantile"] as const) {
        const v = correctBlockMeanProb(p, 5, 0.3, { tier, alpha: 0.2 });
        expect(Number.isNaN(v)).toBe(false);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    // n_t = 0 (unseen block): n_eff=0 ⇒ Beta(½,½) mean=½ > .4 ⇒ clamp returns p̂
    expect(correctBlockMeanProb(0.4, 0, 0.3, { tier: "mean" })).toBe(0.4);
  });
});

// IMPL-INDEPENDENT self-consistency of the frozen literals themselves — so
// `npx vitest list` collects this file and it stays green before wave19c-06.
// This grades the frozen vectors, not the not-yet-written impl (no self-grading).
describe("frozen oracle literals are self-consistent (no impl)", () => {
  it("every tier-MEAN dial is strictly below its independence(off) dial", () => {
    // [off, mean] per student, from the spec §FROZEN ORACLES end-to-end table.
    const rows: [number, number][] = [
      [0.003541, 0.001586], // weak
      [0.103036, 0.022708], // mid
      [0.827096, 0.196467], // strong
      [0.317318, 0.061504], // mixed
    ];
    for (const [off, mean] of rows) {
      expect(mean).toBeLessThan(off);
    }
  });

  it("every QUANTILE(α=.2) dial is below its tier-MEAN dial", () => {
    // [mean, quantile] per student (weak quantile ≈0).
    const rows: [number, number][] = [
      [0.001586, 0.0], // weak (quantile ≈ 0)
      [0.022708, 0.000078], // mid
      [0.196467, 0.009722], // strong
      [0.061504, 0.000722], // mixed
    ];
    for (const [mean, quantile] of rows) {
      expect(quantile).toBeLessThan(mean);
    }
  });

  it("n_eff literal 5/2.2 ≈ 2.2727272727", () => {
    expect(5 / 2.2).toBeCloseTo(2.2727272727, 10);
  });
});
