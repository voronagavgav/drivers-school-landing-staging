// ---------------------------------------------------------------------------
// Pure, deterministic exam-readiness MODEL. No DB, no clock, no randomness.
//
// Honest pass-probability via the EXACT Poisson-binomial DP: given a per-item
// probability of answering correctly, P(passing) is P(≥ passThreshold correct
// out of questionCount) over INDEPENDENT, NON-identical Bernoulli trials. Unlike
// a normal approximation this is exact, and — by construction — never over-
// reports readiness when coverage is thin (unseen items carry a conservative
// prior that drags the number down).
//
// This is a SEPARATE, richer model from the legacy 3-band estimator in
// lib/readiness.ts (wave5-09). Do not conflate or merge them.
// ---------------------------------------------------------------------------

import { correlatedPassProbability } from "./readiness-correlation";

/** Clamp `x` into the closed unit interval `[0, 1]`. */
function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Per-item probability of a CORRECT answer, from a retrievability `r` (0..1)
 * scaled by an optional `calibrationSlope` (how well retrievability tracks
 * real accuracy; 1 = identity). The product is clamped to `[0, 1]`.
 */
export function perItemPassProb(r: number, calibrationSlope = 1): number {
  return clamp01(r * calibrationSlope);
}

/**
 * `P(≥ k successes)` over INDEPENDENT Bernoulli trials with per-trial success
 * probabilities `ps` — the exact Poisson-binomial tail, computed in O(n·k) time
 * and O(k) space via the standard convolution DP.
 *
 * `dp[j]` holds `P(exactly j successes)` among the trials processed so far, for
 * `j` in `0..k-1` only; probability mass that reaches `k` successes is dropped
 * (it belongs to the `≥k` event we ultimately want). The tail is then
 * `1 − Σ dp[0..k-1]`.
 *
 * Edge cases: `k ≤ 0` ⇒ `1` (zero-or-more successes is certain); `k > n` ⇒ `0`
 * (cannot exceed the trial count). All-equal `ps` reduce to the binomial tail.
 */
export function poissonBinomialAtLeast(k: number, ps: number[]): number {
  const n = ps.length;
  if (k <= 0) return 1;
  if (k > n) return 0;

  // dp[j] = P(exactly j successes so far), tracked only for j in 0..k-1.
  const dp = new Array<number>(k).fill(0);
  dp[0] = 1;

  for (const p of ps) {
    const q = clamp01(p);
    // Descend so dp[j-1] is still the PREVIOUS iteration's value when read.
    for (let j = k - 1; j >= 1; j--) {
      dp[j] = dp[j] * (1 - q) + dp[j - 1] * q;
    }
    dp[0] = dp[0] * (1 - q);
  }

  let below = 0;
  for (let j = 0; j < k; j++) below += dp[j];
  return clamp01(1 - below);
}

/**
 * One blueprint block: a fixed-quota slice of the exam (e.g. a cat-B thematic
 * block) with its own mean per-item success probability. Heterogeneity across
 * blocks is what a constant pool-mean vector erases.
 */
export interface ReadinessBlock {
  /** Number of exam slots this block contributes (integer ≥ 0). */
  quota: number;
  /** Mean per-item success probability for items in this block, in `[0, 1]`. */
  meanProb: number;
}

/** Blueprint of the simulated exam: how many questions and how many to pass. */
export interface ReadinessBlueprint {
  /** Questions in the simulated exam (default 20). */
  questionCount?: number;
  /** Correct answers required to pass (default 18). */
  passThreshold?: number;
  /**
   * Per-block quotas + mean probabilities. When supplied, the DP p-vector is
   * built heterogeneously (`quota` entries of `meanProb`, concatenated across
   * blocks) instead of a degenerate `fill(poolMean)` vector — so weakness
   * concentrated in a small fixed-quota block is no longer averaged away.
   */
  blocks?: ReadinessBlock[];
}

export interface ReadinessInput {
  /** Per-seen-item retrievability `R` (0..1) — one entry per studied question. */
  seen: number[];
  /** Count of published-but-not-yet-seen questions in the pool. */
  unseenCount: number;
  /** Conservative success prior for an unseen item (~0.5–0.6). */
  unseenPrior: number;
  /** Exam shape; defaults to 18-of-20 (see `DEFAULT_EXAM_*` in lib/constants). */
  blueprint?: ReadinessBlueprint;
  /** Number of recent mock exams taken (Beta evidence count `m`, integer ≥ 0). */
  mockAttempts?: number;
  /** Number of those mocks passed (Beta successes `k`, integer in `[0, mockAttempts]`). */
  mockPasses?: number;
  /** How well retrievability tracks real accuracy (1 = identity). */
  calibrationSlope?: number;
  /**
   * Within-topic intraclass correlation ρ (0..1). Default `0` — so every
   * existing caller/test is byte-identical (the exact Poisson-binomial path).
   * When `> 0` AND `blueprint.blocks` is supplied, `P_model` is computed via the
   * beta-binomial variance-inflation correction (lib/readiness-correlation.ts),
   * inflating per-block variance by the design effect `1 + (n−1)·ρ`; with no
   * blocks there is no topic structure to correlate, so the PB path is kept.
   */
  topicCorrelation?: number;
}

export interface ReadinessResult {
  /** `P(≥ passThreshold correct of questionCount)`, possibly shrunk toward the mock rate. */
  passProbability: number;
  /** `passProbability` rendered as an integer percent in `[0, 100]` for the dial. */
  dialPercent: number;
  /** Mean per-item success probability across the whole pool (seen + unseen). */
  meanItemProb: number;
  /** Expected number correct on the simulated exam (`meanItemProb × questionCount`). */
  expectedCorrect: number;
  /** Share of the pool the learner has actually seen, in `[0, 1]`. */
  coverage: number;
}

/**
 * Beta anchor strength: the number of pseudo-observations the model probability
 * `P_model` is worth when blending in real mock-exam evidence. Mock counts move
 * the estimate toward the empirical pass rate `k/m` and away from the model as
 * `m` grows; with `m = 0` the estimate is exactly `P_model`.
 */
export const READINESS_ANCHOR_STRENGTH = 4;

/**
 * Honest exam-readiness from per-item retrievability.
 *
 * The pool is the union of the `seen` items (each mapped through
 * `perItemPassProb`) and `unseenCount` not-yet-studied items carrying the
 * conservative `unseenPrior`. A random exam draws `questionCount` items from
 * this pool, so each drawn slot is — marginally — a Bernoulli trial at the pool
 * MEAN `μ` (a uniformly-random draw is equally likely to land on any item).
 * `passProbability` is therefore `P(≥ passThreshold of questionCount)` over
 * `questionCount` trials at `μ`, computed with the exact Poisson-binomial DP.
 *
 * Honesty by construction: the unseen prior is clamped to `min(unseenPrior,
 * seenMeanProb)` whenever seen data exists, so an unseen item is never assumed
 * better than the learner's own seen mean — adding unseen items can only drag
 * `μ` down (or leave it flat), so thin coverage never over-reports readiness.
 * When mock-exam evidence (`mockAttempts` m, `mockPasses` k) is supplied the
 * estimate is a Beta shrinkage anchored at the model probability `P_model`:
 * `(k + S·P_model) / (m + S)` with `S = READINESS_ANCHOR_STRENGTH`. At `m = 0`
 * this is exactly `P_model`; as `m` grows it converges on the empirical `k/m`.
 */
export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const {
    seen,
    unseenCount,
    unseenPrior,
    blueprint,
    mockAttempts,
    mockPasses,
    calibrationSlope = 1,
    topicCorrelation = 0,
  } = input;

  const questionCount = Math.max(1, Math.trunc(blueprint?.questionCount ?? 20));
  const rawThreshold = Math.trunc(blueprint?.passThreshold ?? 18);
  const passThreshold = Math.min(questionCount, Math.max(0, rawThreshold));

  const seenPs = seen.map((r) => perItemPassProb(r, calibrationSlope));
  const seenSum = seenPs.reduce((s, p) => s + p, 0);
  const rawPrior = clamp01(unseenPrior);
  const unseen = Math.max(0, Math.trunc(unseenCount));
  const poolSize = seenPs.length + unseen;

  // Honest interim unseen prior (per-topic empirical-Bayes is Wave 11). When
  // seen data exists, an unseen item can NEVER be assumed better than the
  // learner's own seen mean, so cap the prior at `seenMeanProb`:
  // `effectiveUnseenPrior = min(unseenPrior, seenMeanProb)`. For a weak learner
  // (seenMean < prior) this pins the unseen contribution at the seen mean, so
  // adding unseen items leaves μ flat (never raises readiness); for a strong
  // learner (seenMean > prior) `min(...) = unseenPrior` keeps today's
  // conservative behaviour. With NO seen data the raw prior still applies.
  const hasSeen = seenPs.length > 0;
  const seenMeanProb = hasSeen ? seenSum / seenPs.length : rawPrior;
  const prior = hasSeen ? Math.min(rawPrior, seenMeanProb) : rawPrior;

  // Mean per-item success across the whole pool. A uniformly-random exam draw
  // lands on any pool item with equal chance, so each slot ~ Bernoulli(μ).
  const poolSum = seenSum + unseen * prior;
  const meanItemProb = poolSize > 0 ? poolSum / poolSize : prior;

  // Pre-mock model probability — the Beta anchor `P_model`. When blueprint
  // blocks are supplied, build the DP p-vector HETEROGENEOUSLY: `quota_b`
  // entries of `meanProb_b`, concatenated across blocks. This runs the SAME
  // exact Poisson-binomial DP over a non-identical vector, so a small
  // fixed-quota block of weakness (e.g. cat-B block C2) actually lowers the
  // pass probability instead of being averaged into the pool mean. Callers
  // that supply no blocks fall back to the previous whole-pool constant vector.
  const blocks = blueprint?.blocks;
  let modelProb: number;
  if (blocks && blocks.length > 0 && topicCorrelation > 0) {
    // Correlated tail: blocks independent, items WITHIN a block correlated at ρ.
    // Reproduces the flat PB path bit-for-bit at ρ=0 (see readiness-correlation).
    modelProb = correlatedPassProbability(
      blocks.map((b) => ({
        quota: Math.max(0, Math.trunc(b.quota)),
        meanProb: clamp01(b.meanProb),
      })),
      passThreshold,
      topicCorrelation,
    );
  } else {
    const ps =
      blocks && blocks.length > 0
        ? blocks.flatMap((b) =>
            new Array<number>(Math.max(0, Math.trunc(b.quota))).fill(
              clamp01(b.meanProb),
            ),
          )
        : new Array<number>(questionCount).fill(meanItemProb);
    modelProb = poissonBinomialAtLeast(passThreshold, ps);
  }

  // Beta shrinkage anchored at `P_model`: mock counts are real observations,
  // the anchor is `S` pseudo-observations at the model estimate.
  const m = Math.max(0, Math.trunc(mockAttempts ?? 0));
  const k = Math.min(m, Math.max(0, Math.trunc(mockPasses ?? 0)));
  const passProbability = clamp01(
    (k + READINESS_ANCHOR_STRENGTH * modelProb) / (m + READINESS_ANCHOR_STRENGTH),
  );

  return {
    passProbability,
    dialPercent: Math.round(passProbability * 100),
    meanItemProb,
    expectedCorrect: meanItemProb * questionCount,
    coverage: poolSize > 0 ? seenPs.length / poolSize : 0,
  };
}
