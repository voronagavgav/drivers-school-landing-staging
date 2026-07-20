// The FSRS-6 forgetting curve: predicted probability of successful recall (retrievability)
// as a function of elapsed time and stability. PURE + deterministic — the clock is the
// injected `now: Date` argument; nothing here reads the wall clock or touches the DB.

import { FSRS_DEFAULT_WEIGHTS } from "./constants";
import type { ReviewMemoryState } from "./types";

const MS_PER_DAY = 86_400_000;

// FSRS-6 trainable curve exponent. Recall probability follows a power law (heavier tail than a
// pure exponential); the decay is the negated trainable weight w20 (FSRS-6's key change over
// FSRS-5's fixed -0.5). DERIVED from the shipped weight vector, NOT hardcoded — a re-optimised
// w20 automatically re-shapes the curve. It is NOT derived from the (free) target retention.
const W20 = FSRS_DEFAULT_WEIGHTS[20];
export const FSRS_DECAY = -W20;

// FSRS-6 curve factor, DERIVED from the same w20 so the curve stays self-consistent: FACTOR is the
// constant that makes retrievability equal exactly 0.9 at elapsed === stability, regardless of the
// (free) FSRS_TARGET_RETENTION knob. Provenance: FACTOR = 0.9^(1/DECAY) - 1 = 0.9^(-1/w20) - 1,
// matching the reference implementation's computeDecayFactor (ts-fsrs@5.4.1 / py-fsrs 6.3.1).
// Because DECAY and FACTOR share w20, R equals 0.9 at elapsed === stability BY CONSTRUCTION.
export const FSRS_FACTOR = Math.pow(0.9, 1 / FSRS_DECAY) - 1;

// R(elapsed, stability) = (1 + FACTOR · elapsedDays / stability) ^ DECAY, clamped to [0,1].
//   - equals 1 at elapsed 0 (now === lastReviewedAt) and when lastReviewedAt is null,
//   - strictly decreases as `now` advances for a fixed positive stability,
//   - never stored; computed on demand from the injected clock.
export function retrievability(
  state: Pick<ReviewMemoryState, "stability" | "lastReviewedAt">,
  now: Date,
): number {
  const last = state.lastReviewedAt;
  // Never reviewed → treat elapsed as 0 (fully retrievable at the anchor moment).
  if (last == null) return 1;

  const elapsedDays = Math.max(0, (now.getTime() - last.getTime()) / MS_PER_DAY);
  if (elapsedDays === 0) return 1;

  // A non-positive stability is degenerate (no durable memory) → treated as fully forgotten.
  const stability = state.stability;
  if (!(stability > 0)) return 0;

  const r = Math.pow(1 + FSRS_FACTOR * (elapsedDays / stability), FSRS_DECAY);
  // r is mathematically in the open-to-one interval here; clamp only against float error.
  return Math.min(1, Math.max(0, r));
}
