// ---------------------------------------------------------------------------
// SUPERSEDED (wave19d-09) — correct-but-retired math, kept for the audit trail.
// The live persisted readiness dial no longer uses this module: wave19d replaced
// the estimation-side effective-sample-size shrink WHOLESALE with the evidence-
// releasing release model "lm-gh1" (lib/readiness-release.ts), whose LOGIT-scale
// one-factor Gauss–Hermite mixture handles within-topic correlation instead. This
// file + its frozen oracle (lib/readiness-estimation.oracle.test.ts) REMAIN green
// and are retained (mirroring the retained-but-superseded lib/readiness-
// correlation.ts β-binomial lib); no live server module calls correctBlockMeanProb
// for the dial. The estimation ρ/tier constants now only feed this module and the
// append-only nEff/rhoEst/tier audit fields in recomputeReadiness's inputsJson.
//
// Pure, deterministic ESTIMATION-SIDE ρ correction. No DB, no clock, no
// randomness.
//
// Same-topic items are correlated, so a block's few SEEN items over-state how
// well the whole block is known. This module shrinks each block's raw success
// probability p̂ toward a conservative Jeffreys-Beta posterior whose evidence
// weight is DEFLATED by the design effect (effective sample size), then feeds
// the shrunk p̃ vector to the EXISTING Poisson-binomial tail. The MIN-CLAMP
// `p̃ = min(p̂, …)` guarantees the corrected dial never sits ABOVE the naive
// independence baseline — the never-over-report law.
//
// This is the estimation side (how confident are we in p̂). The draw-side
// correlation inflation lives in lib/readiness-correlation.ts; keep them
// distinct.
// ---------------------------------------------------------------------------

import { betaInv } from "./beta-incomplete";
import { poissonBinomialAtLeast } from "./readiness-model";

/** Clamp `x` into the closed unit interval `[0, 1]`. */
function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Effective sample size after the design-effect deflation for `nSeen`
 * same-topic (correlation `rho`) items: `n_eff = n / (1 + (n−1)·ρ)`.
 *
 * `n = 1` ⇒ `(n−1) = 0` ⇒ no deflation (a single item carries its full weight);
 * `n = 0` ⇒ `0` (an unseen block contributes no evidence, stays finite).
 */
export function effectiveN(nSeen: number, rho: number): number {
  if (nSeen <= 0) return 0;
  return nSeen / (1 + (nSeen - 1) * rho);
}

/**
 * Jeffreys-prior Beta(a, b) posterior parameters for a block with observed
 * success rate `pHat` weighted by `nEff` effective observations:
 * `a = p̂·n_eff + ½`, `b = (1−p̂)·n_eff + ½`. The ½ prior keeps `a`, `b > 0`
 * even at degenerate `p̂ ∈ {0, 1}` or `n_eff = 0`, so no downstream NaN.
 */
export function jeffreysBetaParams(pHat: number, nEff: number): { a: number; b: number } {
  return {
    a: pHat * nEff + 0.5,
    b: (1 - pHat) * nEff + 0.5,
  };
}

/** Correction options: shrinkage tier and (for QUANTILE) the lower-tail level. */
export interface CorrectBlockOpts {
  /**
   * `"mean"` (default) → posterior mean `a/(a+b)`; `"quantile"` → lower Beta
   * quantile `betaInv(α, a, b)` (α default 0.2); `"off"` → no shrinkage.
   */
  tier?: "mean" | "quantile" | "off";
  /** Lower-tail level for the QUANTILE tier (default 0.2). */
  alpha?: number;
}

/**
 * Shrink a block's raw success probability `pHat` toward a conservative
 * Jeffreys-Beta posterior whose weight is deflated by the design effect.
 *
 * MEAN:     `p̃ = min(p̂, a/(a+b))`
 * QUANTILE: `p̃ = min(p̂, betaInv(α, a, b))`
 * off:      `p̃ = p̂`
 *
 * The `min()` clamp is load-bearing: it makes `p̃ ≤ p̂` unconditionally, so the
 * corrected dial can never exceed the naive independence baseline. Result is
 * clamped to `[0, 1]`.
 */
export function correctBlockMeanProb(
  pHat: number,
  nSeen: number,
  rho: number,
  opts?: CorrectBlockOpts,
): number {
  const tier = opts?.tier ?? "mean";
  if (tier === "off") return clamp01(pHat);

  const nEff = effectiveN(nSeen, rho);
  const { a, b } = jeffreysBetaParams(pHat, nEff);
  const shrunk =
    tier === "quantile" ? betaInv(opts?.alpha ?? 0.2, a, b) : a / (a + b);

  return clamp01(Math.min(pHat, shrunk));
}

/** One estimation-side block: exam quota, raw success prob, and seen count. */
export interface EstimationBlock {
  /** Number of exam slots this block contributes (integer ≥ 0). */
  quota: number;
  /** Raw per-item success probability `p̂` for this block, in `[0, 1]`. */
  meanProb: number;
  /** Number of SEEN items backing `p̂` (drives the design-effect deflation). */
  nSeen: number;
}

/**
 * Corrected pass probability: shrink each block's `meanProb` via
 * `correctBlockMeanProb`, expand each to its `quota` copies, concatenate, and
 * feed the vector to the EXISTING `poissonBinomialAtLeast` DP (no new tail
 * math). With `tier: "off"` this is exactly the naive independence baseline.
 */
export function correctedPassProbability(
  blocks: EstimationBlock[],
  threshold: number,
  rho: number,
  opts?: CorrectBlockOpts,
): number {
  const ps: number[] = [];
  for (const block of blocks) {
    const p = correctBlockMeanProb(block.meanProb, block.nSeen, rho, opts);
    for (let i = 0; i < block.quota; i++) ps.push(p);
  }
  return poissonBinomialAtLeast(threshold, ps);
}
