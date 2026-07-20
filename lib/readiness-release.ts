// ---------------------------------------------------------------------------
// Pure end-to-end EVIDENCE-RELEASING readiness model "lm-gh1" (wave19d-07).
// No DB, no clock, no randomness — a deterministic COMPOSE of two sub-modules
// plus the outer never-above-independence guarantee.
// (specs/wave19d-blueprint-and-release.md Deliverables 2–3 + properties a–f;
//  reference oracle scripts/oracles/gen-19d-oracles.py.)
//
// Given the exam's blueprint blocks — each with its SEEN per-item retrievabilities,
// an UNSEEN-slot count, and a fixed quota of exam slots — the model returns:
//   1. per block: `pSlot` + `C` via the Lahiri–Mukherjee seen/unseen split
//      (`@/lib/readiness-seen-unseen`, task 05). Seen items are never shrunk;
//      unseen slots are credited at the clamped Jeffreys extrapolation `C`.
//   2. `independence` = the EXACT Poisson-binomial P(≥ threshold) over the raw
//      per-slot p-vector (quota copies of each block's `pSlot`), NO factor.
//   3. `mixture` via the one-factor Gauss–Hermite ICC mixture
//      (`@/lib/readiness-factor-mixture`, task 06) with `σ = σ₀·√(m₀/(m₀+M))`.
//   4. `final = min(mixture, independence)` — the never-above-independence
//      guarantee, structural (spec property a; the 19b lesson made load-bearing).
//
// Dials are reported both as probability (0..1) and as the rounded integer
// percent the UI shows (`round(prob·100)`). This module composes 05 + 06 + the
// existing PB DP; it does NOT reimplement the split, the mixture, or the DP, and
// it does NOT touch the DB / live recompute (task 08).
// ---------------------------------------------------------------------------

import {
  DEFAULT_EXAM_MAX_ERRORS,
  DEFAULT_EXAM_QUESTION_COUNT,
} from "./constants";
import { mixtureDial, sigmaFromEvidence } from "./readiness-factor-mixture";
import { poissonBinomialAtLeast } from "./readiness-model";
import { blockSplit } from "./readiness-seen-unseen";

/** Correct answers required to pass the simulated exam (20 − 2 = 18). */
const THRESHOLD = DEFAULT_EXAM_QUESTION_COUNT - DEFAULT_EXAM_MAX_ERRORS;
/** Conservative unseen-slot honesty prior (READINESS_UNSEEN_PRIOR). */
const UNSEEN_PRIOR = 0.5;

/** One blueprint block's evidence for the release model. */
export interface ReleaseBlockInput {
  /** Exam slots this block contributes (integer ≥ 0). */
  quota: number;
  /** Retrievabilities (0..1) of the block's SEEN items. */
  seenR: number[];
  /** Count of not-yet-studied slots in the block. */
  nUnseen: number;
}

/** Full release-model input. */
export interface ReleaseInput {
  blocks: ReleaseBlockInput[];
  /** Mean per-item review mass M over the seen items (drives the σ decay). */
  reviewMass: number;
  /** Calibration slope (how well retrievability tracks accuracy; 1 = identity). */
  slope?: number;
}

/** Per-block split surfaced alongside the dials. */
export interface ReleaseBlockResult {
  pSlot: number;
  C: number;
  nSeen: number;
}

/** Release-model output: probabilities (0..1) + rounded integer-percent dials. */
export interface ReleaseResult {
  independence: number;
  mixture: number;
  final: number;
  independenceDial: number;
  mixtureDial: number;
  finalDial: number;
  /** Shared-factor scale σ = σ₀·√(m₀/(m₀+M)) used for the mixture. */
  sigma: number;
  perBlock: ReleaseBlockResult[];
}

/**
 * `releaseDial(input)` — the end-to-end evidence-releasing readiness model.
 * Composes the seen/unseen split (task 05) + the factor mixture (task 06) + the
 * exact Poisson-binomial DP, and applies `final = min(mixture, independence)`.
 *
 * The outer `min` is the structural never-above-independence guarantee: the
 * mixture may RAISE the far-upper tail for a below-threshold-mean (weak) student,
 * so `min` picks independence there; for an above-threshold-mean (strong) student
 * the mixture lowers the tail and `min` picks it. `final ≤ independence` always.
 */
export function releaseDial(input: ReleaseInput): ReleaseResult {
  const slope = input.slope ?? 1;

  const perBlock: ReleaseBlockResult[] = [];
  const pvec: number[] = [];
  for (const b of input.blocks) {
    const { pSlot, C } = blockSplit(b.seenR, b.nUnseen, UNSEEN_PRIOR, slope);
    perBlock.push({ pSlot, C, nSeen: b.seenR.length });
    for (let i = 0; i < b.quota; i++) pvec.push(pSlot);
  }

  const independence = poissonBinomialAtLeast(THRESHOLD, pvec);
  const sigma = sigmaFromEvidence(input.reviewMass);
  const mixture = mixtureDial(pvec, THRESHOLD, sigma);
  const final = Math.min(mixture, independence);

  return {
    independence,
    mixture,
    final,
    independenceDial: Math.round(independence * 100),
    mixtureDial: Math.round(mixture * 100),
    finalDial: Math.round(final * 100),
    sigma,
    perBlock,
  };
}
