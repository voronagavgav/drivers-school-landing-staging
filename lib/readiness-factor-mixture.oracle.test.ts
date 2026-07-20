import { describe, it, expect } from "vitest";

// FROZEN ORACLE for the one-factor Gauss–Hermite ICC mixture (Deliverable 3) —
// the future module `./readiness-factor-mixture` (wave19d-06) MUST MATCH these
// values; the implementation is NOT written here.
//
// Every literal is EXTERNAL: computed by `scripts/oracles/gen-19d-oracles.py`
// (numpy-only reference oracle; run 2026-07-13) from
// `specs/wave19d-blueprint-and-release.md` (Deliverable 3) + the research JSON
// `docs/research/HIERARCHICAL-RELEASE-RESEARCH-2026-07-13.json`.
// DO NOT regenerate these literals from the TS implementation, and do not edit
// the literals or tolerances — wave19d-06 only un-skips and matches them.
//
// Design constants PINNED by wave19d-02 (later tasks read, never edit):
//   nNodes = 20   Gauss–Hermite nodes (probabilists' HermiteE, numpy hermegauss)
//   ρ = 0.35      within-topic ICC (successor of READINESS_TOPIC_CORRELATION_ESTIMATION)
//   σ₀ = √(ρ/(1−ρ)·π²/3)   (logistic-normal latent-ICC map; π²/3 = Var of the
//                            standard logistic ⇒ σ₀ = 1.33096485927)
//   evidence decay  w(M) = √(M0/(M0+M)),  M0 = 1;  σ = σ₀·w(M)   (O(M^−1/2) rate)
// Per node z_i the every-slot logit shifts by σ·z_i; the exact Poisson-binomial
// runs per node; mixtureDial = Σ_i normW_i · PB_i(≥ threshold), normW_i =
// weight_i / √(2π) (sums to 1 for the N(0,1) factor).
//
// While the impl does not yet exist the impl-binding suite is suspended and
// reaches the future module via a dynamic import (the missing-module type error
// is silenced by a `// @ts-expect-error`); wave19d-06 removes both.

// ---- frozen design constants (from gen-19d-oracles.py) ----------------------
const N_NODES = 20;
const RHO = 0.35;
const PI2_3 = 3.2898681337; // π²/3
const SIGMA0 = 1.33096485927;
const M0 = 1;
const THRESHOLD = 18;

// Gauss–Hermite (probabilists' HermiteE) nodes + weights for the N(0,1) factor.
const GH_NODES = [
  -7.61904854167976, -6.51059015701365, -5.5787388058932, -4.73458133404606,
  -3.94396735065732, -3.18901481655339, -2.45866361117237, -1.74524732081413,
  -1.04294534880275, -0.346964157081356, 0.346964157081356, 1.04294534880275,
  1.74524732081413, 2.45866361117237, 3.18901481655339, 3.94396735065732,
  4.73458133404606, 5.5787388058932, 6.51059015701365, 7.61904854167976,
];
const GH_WEIGHTS = [
  3.15283872938279e-13, 6.22160769677664e-10, 1.53593403381993e-07,
  1.10344811931221e-05, 0.000322919595868101, 0.00458738825385709,
  0.035087375128592, 0.154173611285539, 0.405420387684281, 0.65371126667029,
  0.65371126667029, 0.405420387684281, 0.154173611285539, 0.035087375128592,
  0.00458738825385709, 0.000322919595868101, 1.10344811931221e-05,
  1.53593403381993e-07, 6.22160769677664e-10, 3.15283872938279e-13,
];
// normalised weights (÷√(2π)) — sum to 1, so mixtureDial is a proper average.
const GH_NORMW = [
  1.25780067243793e-13, 2.48206236231518e-10, 6.12749025998293e-08,
  4.40212109023086e-06, 0.000128826279961929, 0.00183010313108049,
  0.013997837447101, 0.061506372063977, 0.161739333984, 0.260793063449555,
  0.260793063449555, 0.161739333984, 0.061506372063977, 0.013997837447101,
  0.00183010313108049, 0.000128826279961929, 4.40212109023086e-06,
  6.12749025998293e-08, 2.48206236231518e-10, 1.25780067243793e-13,
];

// factor-mixture sub-oracle: fixed 20-slot p-vector (10×0.97 + 10×0.9), M=4.
const FM_PVEC = [...Array(10).fill(0.97), ...Array(10).fill(0.9)];
const FM_M = 4;
const FM_SIGMA = 0.595225580197; // σ₀·√(1/(1+4))
const FM_INDEP = 0.86461291215; // plain PB over FM_PVEC (no factor)
const FM_PERNODE = [
  2.97872837506929e-13, 2.28832919280109e-09, 1.24367492615463e-06,
  0.000121289597962648, 0.0032294173247045, 0.0312949481403534,
  0.139819487951342, 0.353543095432413, 0.602682191845, 0.798047774729375,
  0.912380836040956, 0.966462704680686, 0.98837378783691, 0.996285740480947,
  0.998897127268461, 0.999695717397456, 0.999922799698213, 0.99998244095071,
  0.999996616345922, 0.999999527185125,
];
const FM_MIXTURE = 0.800318847809; // Σ normW_i · FM_PERNODE_i

describe("readiness-factor-mixture (frozen oracle, un-skipped in wave19d-06)", () => {
  it("Gauss–Hermite nodes/weights match numpy hermegauss(20) ≥8dp; normW sums to 1", async () => {
    const { gaussHermite } = await import("./readiness-factor-mixture");
    const gh = gaussHermite(N_NODES);
    for (let i = 0; i < N_NODES; i++) {
      expect(gh.nodes[i]).toBeCloseTo(GH_NODES[i], 8);
      expect(gh.normWeights[i]).toBeCloseTo(GH_NORMW[i], 12);
    }
    expect(gh.normWeights.reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("σ₀ from the ρ→σ₀ map and σ(evidence) = σ₀·√(M0/(M0+M))", async () => {
    const { SIGMA0: s0, sigmaFromEvidence } = await import("./readiness-factor-mixture");
    expect(s0).toBeCloseTo(SIGMA0, 8);
    expect(sigmaFromEvidence(FM_M)).toBeCloseTo(FM_SIGMA, 8);
  });

  it("mixtureDial = node-weighted average of the per-node PB pass probs (fixed fixture)", async () => {
    const { mixtureDial } = await import("./readiness-factor-mixture");
    expect(mixtureDial(FM_PVEC, THRESHOLD, FM_SIGMA)).toBeCloseTo(FM_MIXTURE, 8);
  });
});

// IMPL-INDEPENDENT self-consistency of the frozen literals themselves — so
// `npx vitest list` collects this file and it stays green BEFORE wave19d-06.
describe("frozen factor-mixture literals are self-consistent (no impl)", () => {
  it("normalised weights sum to 1 (proper probabilist average)", () => {
    expect(GH_NORMW.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    // normW_i = weight_i / √(2π)
    for (let i = 0; i < N_NODES; i++) {
      expect(GH_WEIGHTS[i] / Math.sqrt(2 * Math.PI)).toBeCloseTo(GH_NORMW[i], 12);
    }
  });

  it("nodes are symmetric about 0 (node[i] = −node[n−1−i])", () => {
    for (let i = 0; i < N_NODES; i++) {
      expect(GH_NODES[i]).toBeCloseTo(-GH_NODES[N_NODES - 1 - i], 12);
    }
  });

  it("σ₀ = √(ρ/(1−ρ)·π²/3) and σ(M=4) = σ₀·√(1/5)", () => {
    expect(Math.sqrt((RHO / (1 - RHO)) * PI2_3)).toBeCloseTo(SIGMA0, 8);
    expect(SIGMA0 * Math.sqrt(M0 / (M0 + FM_M))).toBeCloseTo(FM_SIGMA, 8);
  });

  it("mixtureDial equals the node-weighted average of the frozen per-node probs", () => {
    const weighted = FM_PERNODE.reduce((acc, v, i) => acc + GH_NORMW[i] * v, 0);
    expect(weighted).toBeCloseTo(FM_MIXTURE, 8);
  });

  it("this above-threshold-mean fixture: mixtureDial < independence (thin-evidence discount)", () => {
    expect(FM_MIXTURE).toBeLessThan(FM_INDEP);
  });
});
