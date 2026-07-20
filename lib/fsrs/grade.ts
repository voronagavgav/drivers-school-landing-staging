// deriveGrade — infer the FSRS 1..4 grade from a single-correct-MCQ answer signal (spec §2,
// Wave 19b guessing correction).
//
// ПДР is not free-recall, so the learner never self-reports Again/Hard/Good/Easy. A fast+correct
// answer on a WEAK item is often a lucky GUESS, not genuine recall — so the primary grade axis is a
// Bayesian guess/slip posterior (`gradePosterior`), NOT raw latency. Given a prior belief the learner
// knows the item, a correct answer is a guess/slip observation; the posterior π updates that belief:
//   wrong                          → Again(1)   (unconditional — preserves `correct = grade ≥ 2`,
//                                                 which lib/server/calibration.ts depends on)
//   correct & π ≥ FSRS_KNOW_EASY   → Easy(4)
//   correct & π ≥ FSRS_KNOW_GOOD   → Good(3)    (a neutral 0.5 prior lands here — the production bulk)
//   correct (weaker posterior)     → Hard(2)
// SECONDARY (cap-only, never promote): a very-slow recall caps Easy→Good(3); an explicit
// low-confidence sample (≤ FSRS_LOW_CONFIDENCE_MAX) caps to Hard(2) — the preserved Wave-12b veto.
// Latency NO LONGER promotes to Easy on its own: the posterior is the primary axis.
//
// When `priorKnow` is absent (legacy/untimed callers) a NEUTRAL 0.5 prior is used so behaviour stays
// defined (→ π≈0.78 → Good, matching the old production bulk).
//
// MIGRATION HONESTY: existing `ReviewState` rows built under the old latency-only heuristic are NOT
// retro-rewritten — this inference applies FORWARD ONLY (to answers recorded after it ships).
//
// PURE + deterministic — thresholds live in constants.ts; no clock, no DB, no randomness.

import {
  FSRS_HARD_LATENCY_MS,
  FSRS_LOW_CONFIDENCE_MAX,
  FSRS_GUESS_DEFAULT,
  FSRS_GUESS_MAX,
  FSRS_SLIP,
  FSRS_KNOW_EASY,
  FSRS_KNOW_GOOD,
} from "./constants";
import type { Grade } from "./types";

export interface GradePosteriorInput {
  // Was the answer correct? (The two outcomes have different likelihoods.)
  correct: boolean;
  // Prior P(knows this item) BEFORE this answer, in [0,1]. Sourced by the server as the retrievability
  // of the prior memory state (0.5 neutral for a fresh card — never the R=1 of an unreviewed card).
  priorKnow: number;
  // Number of answer options (a 4-option ПДР item ⇒ guess floor g = 1/4 = 0.25). Default 4.
  optionCount?: number;
}

/**
 * BKT (Bayesian Knowledge Tracing) guess/slip posterior — the pure closed form pinned by the frozen
 * oracle in grade-posterior.test.ts. Likelihoods: P(correct | knows) = 1 − s, P(correct | ¬knows) = g
 * with g = min(1/optionCount, FSRS_GUESS_MAX) (the honest degeneracy cap, Wave 20 design point 3)
 * and s = FSRS_SLIP. Returns π = P(knows | outcome) in [0,1].
 */
export function gradePosterior({ correct, priorKnow, optionCount }: GradePosteriorInput): number {
  const g =
    optionCount != null && optionCount > 0
      ? Math.min(1 / optionCount, FSRS_GUESS_MAX)
      : FSRS_GUESS_DEFAULT;
  const s = FSRS_SLIP;
  const p0 = priorKnow;
  if (correct) {
    return (p0 * (1 - s)) / (p0 * (1 - s) + (1 - p0) * g);
  }
  return (p0 * s) / (p0 * s + (1 - p0) * (1 - g));
}

export interface DeriveGradeInput {
  correct: boolean;
  // Answer latency in ms (optional — absent for legacy/untimed answers). Cap-only (very slow → Good).
  latencyMs?: number;
  // Optional self-reported confidence on a 1..4 scale (4 = most confident). Cap-only (≤2 → Hard).
  confidence?: number;
  // Prior P(knows) fed to the posterior. Absent ⇒ a neutral 0.5 prior (defined legacy behaviour).
  priorKnow?: number;
  // Answer option count for the guess floor. Absent ⇒ default 4 (g = 0.25).
  optionCount?: number;
}

// Per-topic latency-band overrides (Wave 11): production derives these from ReviewLog medians.
// `hardMs` drives the very-slow cap; `easyMs` is retained for caller compatibility (latency no longer
// promotes to Easy, so it no longer affects the output).
export interface DeriveGradeOverrides {
  easyMs?: number;
  hardMs?: number;
}

export function deriveGrade(input: DeriveGradeInput, overrides?: DeriveGradeOverrides): Grade {
  // Wrong is Again, unconditionally — latency/confidence/prior are irrelevant to a lapse.
  if (!input.correct) return 1;

  const { latencyMs, confidence, priorKnow, optionCount } = input;
  const hardMs = overrides?.hardMs ?? FSRS_HARD_LATENCY_MS;

  // PRIMARY axis: the guessing-corrected posterior belief the learner knows the item. A missing
  // prior falls back to a neutral 0.5 (legacy/untimed callers) so the mapping stays defined.
  const posterior = gradePosterior({ correct: true, priorKnow: priorKnow ?? 0.5, optionCount });
  let grade: Grade = posterior >= FSRS_KNOW_EASY ? 4 : posterior >= FSRS_KNOW_GOOD ? 3 : 2;

  // SECONDARY caps (never promote). A genuinely effortful (very slow) recall can't be Easy.
  const verySlow = latencyMs != null && latencyMs >= hardMs;
  if (verySlow && grade > 3) grade = 3;

  // The preserved Wave-12b veto: an explicit low-confidence sample caps at Hard.
  const lowConfidence = confidence != null && confidence <= FSRS_LOW_CONFIDENCE_MAX;
  if (lowConfidence && grade > 2) grade = 2;

  return grade;
}
