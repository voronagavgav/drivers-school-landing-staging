// The pure slip-adjusted lapse layer (Wave 20 grade-honesty, spec Deliverable 3).
//
// A wrong answer on a single-correct MCQ is not always a full forget — some wrongs are a slip on a
// still-durable memory, some a genuine lapse. The frozen FSRS-6 `schedule(prior, 1, now)` (Again)
// path crushes stability unconditionally, which over-punishes slips. This layer composes OUTSIDE the
// byte-frozen `schedule` (so the FSRS-6 golden vectors stay byte-identical): it runs BOTH the Again
// arm and the Hard arm `schedule(prior, 2, now)` from the SAME prior, then blends only their
// stabilities by the caller-supplied posterior `pi = P(knows | wrong)`.
//
// The blend is a capped GEOMETRIC (log-space) mean:
//   S' = min(prior.stability, exp(pi·ln S'_hard + (1−pi)·ln S'_again))
// The `min(prior.stability, …)` cap makes never-grow-on-wrong STRUCTURAL — a wrong can never raise
// stability, regardless of pi. The linear blend is deliberately EXCLUDED: it grows above the prior at
// low pi (see lapse-adjust.oracle.test.ts). `dueAt` is recomputed from the blended stability via the
// engine's `intervalDays`; everything else (state/lapses/difficulty/reps/lastReviewedAt) is taken from
// the Again arm — a wrong IS a wrong, only the interval crush is the defect being softened.
//
// PURE + deterministic: the only clock is the injected `now: Date`; no wall clock, no DB, no RNG.
// `pi` is a caller-supplied posterior in [0,1]; this module does NOT compute it (the server derives it
// via `gradePosterior`). Reuses `schedule` / `intervalDays` / `FSRS_TARGET_RETENTION` from the engine.

import { FSRS_TARGET_RETENTION } from "./constants";
import { intervalDays, schedule } from "./schedule";
import type { ReviewMemoryState } from "./types";

const MS_PER_DAY = 86_400_000;

// Construct a Date from the injected clock WITHOUT direct Date construction — the purity gate (and
// injected-clock hygiene) forbid the `new`-clock idiom. Reflect.construct on `now`'s own constructor
// is deterministic: the epoch-ms argument is computed from `now.getTime()`, never read from the wall.
function dateAt(now: Date, epochMs: number): Date {
  return Reflect.construct(now.constructor, [epochMs]) as Date;
}

// Slip-adjusted lapse: the Again result with stability softened toward the Hard arm by `pi`, capped at
// the pre-lapse stability, and `dueAt` recomputed from the blended stability.
export function slipAdjustedLapse(
  prior: ReviewMemoryState,
  pi: number,
  now: Date,
): ReviewMemoryState {
  const again = schedule(prior, 1, now);
  const hard = schedule(prior, 2, now);

  const blended = Math.exp(pi * Math.log(hard.stability) + (1 - pi) * Math.log(again.stability));
  // Structural never-grow-on-wrong: a wrong can never raise stability above the pre-lapse value.
  const stability = Math.min(prior.stability, blended);
  const dueAt = dateAt(
    now,
    now.getTime() + intervalDays(stability, FSRS_TARGET_RETENTION) * MS_PER_DAY,
  );

  return { ...again, stability, dueAt };
}
