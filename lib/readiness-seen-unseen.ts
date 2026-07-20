// ---------------------------------------------------------------------------
// Pure per-block SEEN/UNSEEN split for the exam-readiness model (Deliverable 2,
// Lahiri–Mukherjee form). No DB, no clock, no randomness.
// (specs/wave19d-blueprint-and-release.md §Deliverable 2.)
//
// Within one stratum block the exam draws `nPool = nSeen + nUnseen` slots. The
// SEEN slots carry each item's own per-item pass probability (never shrunk —
// release from studying comes free). The UNSEEN slots are credited at a single
// conservative extrapolation `C`: the posterior-predictive mean of a JEFFREYS
// Beta (prior Beta(½, ½)) updated by the block's seen evidence, then CLAMPED by
// the existing global honesty rule, now applied PER BLOCK:
//
//   seenPs   = perItemPassProb(R_i, slope)         over the block's SEEN items
//   seenMean = mean(seenPs)
//   C0       = (0.5 + Σ seenPs) / (1 + nSeen)       Jeffreys post.-pred. mean
//   C        = min(C0, seenMean, prior·slope)       honesty clamp, per block
//   pSlot    = (Σ seenPs + nUnseen · C) / nPool
//
// Properties this pins (the frozen oracle in readiness-seen-unseen.oracle.test.ts):
//   - seen NEVER shrunk: nUnseen = 0 ⇒ pSlot === seenMean exactly.
//   - C stays near the clamped prior while coverage is thin (nSeen small), so
//     sparse blocks do NOT certify unstudied slots at the seen mean.
//   - study-never-hurts (block level): moving a slot from unseen (credited at C)
//     to seen at retrievability R ≥ C does not lower pSlot.
//
// The cross-block assembly, factor mixture, and min-clamp/release entrypoint
// live in wave19d-06/07; this module computes ONE block's split only.
// ---------------------------------------------------------------------------

import { perItemPassProb } from "./readiness-model";

/** One block's seen/unseen split. */
export interface BlockSplit {
  /** Mean of the seen per-item pass probabilities (release comes free). */
  seenMean: number;
  /** Clamped Jeffreys posterior-predictive mean crediting each unseen slot. */
  C: number;
  /** Blended per-slot pass probability for the whole block. */
  pSlot: number;
}

/**
 * Split ONE stratum block into its seen contribution + a conservative unseen
 * extrapolation, returning `{ seenMean, C, pSlot }` (see the module header).
 *
 * @param seenR         retrievabilities (0..1) of the block's SEEN items
 * @param nUnseen       count of not-yet-studied slots in the block
 * @param prior         honesty prior for an unseen slot (READINESS_UNSEEN_PRIOR)
 * @param calibrationSlope  how well retrievability tracks accuracy (1 = identity)
 */
export function blockSplit(
  seenR: number[],
  nUnseen: number,
  prior: number,
  calibrationSlope = 1,
): BlockSplit {
  const seenPs = seenR.map((r) => perItemPassProb(r, calibrationSlope));
  const nSeen = seenPs.length;
  const seenSum = seenPs.reduce((a, b) => a + b, 0);
  const priorAdj = perItemPassProb(prior, calibrationSlope);

  // FULLY-UNSEEN block (nSeen = 0): no evidence in either direction, so the block
  // sits AT the slope-adjusted honesty prior — matching the frozen reference oracle
  // (scripts/oracles/gen-19d-oracles.py `block_extrapolation` n == 0 branch:
  // C0 = C = seenMean = prior_cap). The previous code let seenMean=0 flow into the
  // min-clamp, scoring an untouched stratum CERTAIN-WRONG (p=0) and crushing the
  // dial of anyone who hadn't opened a small stratum (2026-07-13 wave-review MAJOR —
  // the one boundary every test avoided).
  if (nSeen === 0) {
    return { seenMean: priorAdj, C: priorAdj, pSlot: nUnseen > 0 ? priorAdj : 0 };
  }

  const seenMean = seenSum / nSeen;

  // Jeffreys Beta(½,½) posterior-predictive mean over the block's seen evidence.
  const C0 = (0.5 + seenSum) / (1 + nSeen);
  // Per-block honesty clamp: an unseen slot may never be credited above the
  // seen mean, nor above the slope-adjusted prior.
  const C = Math.min(C0, seenMean, priorAdj);

  const nPool = nSeen + nUnseen;
  const pSlot = nPool > 0 ? (seenSum + nUnseen * C) / nPool : 0;

  return { seenMean, C, pSlot };
}
