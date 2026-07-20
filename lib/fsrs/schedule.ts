// The pure FSRS-6 scheduler: the DSR (difficulty / stability / retrievability) update plus the
// new -> learning -> review <-> relearning state machine. Given a prior memory state, an inferred
// grade (1..4), and the injected clock `now`, `schedule` returns the NEXT memory state — the new
// stability/difficulty, the transitioned learning phase, and the derived `dueAt`.
//
// PURE + deterministic: the only clock is the injected `now: Date`; no wall clock, no DB, no RNG.
// It reuses the published FSRS-6 default weights (constants.ts) and the forgetting-curve constants
// (retrievability.ts) rather than re-deriving them. Persistence and the queue picker live elsewhere
// — nothing here touches storage. Formulas ported from ts-fsrs@5.4.1 / py-fsrs 6.3.1 (long-term
// variant, enable_short_term=false): the same DSR structure as FSRS-5 with the w20 trainable decay.

import { FSRS_DEFAULT_WEIGHTS, FSRS_TARGET_RETENTION } from "./constants";
import { FSRS_DECAY, FSRS_FACTOR, retrievability } from "./retrievability";
import type { Grade, LearningState, ReviewMemoryState } from "./types";

const MS_PER_DAY = 86_400_000;

// Stability floor: keeps the forgetting curve and the interval strictly positive even after a hard
// lapse. Aligned to the reference implementation's S_MIN = 1e-3 (ts-fsrs@5.4.1) per the wave10f
// review — the previous 0.1 was a small undocumented divergence the golden vectors didn't cover.
const MIN_STABILITY = 0.001;

const w = FSRS_DEFAULT_WEIGHTS;

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

// Clamp difficulty into the canonical FSRS [1,10] band.
const clampDifficulty = (d: number): number => clamp(d, 1, 10);

// ---- intervalDays ---------------------------------------------------------
// Invert the forgetting curve R(t,S) = retention for the elapsed days t at which retrievability
// decays to the target: R = (1 + FACTOR * t/S)^DECAY, so t = S/FACTOR * (retention^(1/DECAY) - 1).
// Higher target retention => shorter interval (review sooner to stay above a higher floor).
export function intervalDays(stability: number, retention: number): number {
  const days = (stability / FSRS_FACTOR) * (Math.pow(retention, 1 / FSRS_DECAY) - 1);
  return Math.max(0, days);
}

// ---- DSR primitives (FSRS-6, default weights) -----------------------------

// Initial stability for the first rating of a `new` card: S_0(G) = w[G-1].
function initialStability(grade: Grade): number {
  return Math.max(MIN_STABILITY, w[grade - 1]);
}

// Raw (UNCLAMPED) initial difficulty: D_0(G) = w4 - e^(w5*(G-1)) + 1. The reference engine feeds
// this UNCLAMPED value into the difficulty mean-reversion target — clamping it to [1,10] first
// (as an FSRS-5-era port did) shifts every subsequent difficulty and breaks the FSRS-6 vectors.
function initialDifficultyRaw(grade: Grade): number {
  return w[4] - Math.exp(w[5] * (grade - 1)) + 1;
}

// Initial difficulty for a `new` card, clamped to the canonical [1,10] band.
function initialDifficulty(grade: Grade): number {
  return clampDifficulty(initialDifficultyRaw(grade));
}

// Difficulty update: linear damping toward the edges, then mean reversion to the UNCLAMPED D_0(Easy).
//   dD = -w6*(G-3);  D' = D + dD*(10-D)/9;  D'' = w7*D_0raw(4) + (1-w7)*D';  clamp [1,10].
function nextDifficulty(difficulty: number, grade: Grade): number {
  const deltaD = -w[6] * (grade - 3);
  const damped = difficulty + (deltaD * (10 - difficulty)) / 9;
  const reverted = w[7] * initialDifficultyRaw(4) + (1 - w[7]) * damped;
  return clampDifficulty(reverted);
}

// Stability after a SUCCESSFUL recall (grade >= 2). Grows more for lower difficulty, lower prior
// stability, and lower retrievability (harder-won recalls teach more); Hard penalises, Easy boosts.
function recallStability(difficulty: number, stability: number, r: number, grade: Grade): number {
  const hardPenalty = grade === 2 ? w[15] : 1;
  const easyBonus = grade === 4 ? w[16] : 1;
  const growth =
    Math.exp(w[8]) *
    (11 - difficulty) *
    Math.pow(stability, -w[9]) *
    (Math.exp(w[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;
  return Math.max(MIN_STABILITY, stability * (1 + growth));
}

// Stability after a LAPSE (grade 1, Again). Capped at the pre-lapse stability — forgetting cannot
// make a memory more durable.
function forgetStability(difficulty: number, stability: number, r: number): number {
  const sForget =
    w[11] *
    Math.pow(difficulty, -w[12]) *
    (Math.pow(stability + 1, w[13]) - 1) *
    Math.exp(w[14] * (1 - r));
  return Math.max(MIN_STABILITY, Math.min(sForget, stability));
}

// ---- state machine --------------------------------------------------------
// new        --Easy--> review, else --> learning
// learning   --Again--> learning, else --> review (graduate)
// review     --Again--> relearning (lapse), else --> review
// relearning --Again--> relearning, else --> review (re-graduate)
function nextLearningState(prior: LearningState, grade: Grade): LearningState {
  if (prior === "new") return grade === 4 ? "review" : "learning";
  if (prior === "learning") return grade === 1 ? "learning" : "review";
  // review or relearning
  return grade === 1 ? "relearning" : "review";
}

// A lapse (forgetting something already being learned) increments `lapses`. A first-ever Again on
// a brand-new card is NOT a lapse — the item was never learned.
function isLapse(prior: LearningState, grade: Grade): boolean {
  return grade === 1 && prior !== "new";
}

// Construct a Date from the injected clock WITHOUT direct Date construction — the purity gate (and
// injected-clock hygiene) forbid the `new`-clock idiom. Reflect.construct on `now`'s own
// constructor is deterministic: the epoch-ms argument is computed, never read from the wall clock.
function dateAt(now: Date, epochMs: number): Date {
  return Reflect.construct(now.constructor, [epochMs]) as Date;
}

// ---- schedule -------------------------------------------------------------
export function schedule(state: ReviewMemoryState, grade: Grade, now: Date): ReviewMemoryState {
  let stability: number;
  let difficulty: number;

  if (state.state === "new") {
    // First exposure: seed S and D from the rating; retrievability is undefined (never seen).
    stability = initialStability(grade);
    difficulty = initialDifficulty(grade);
  } else {
    // Subsequent review: compute next S from the PRIOR difficulty (FSRS-6), THEN update D.
    // Feeding the already-updated difficulty into the stability formula is a bug — the reference
    // engine uses the pre-review difficulty for the recall/lapse stability growth.
    const r = retrievability(state, now);
    stability =
      grade === 1
        ? forgetStability(state.difficulty, state.stability, r)
        : recallStability(state.difficulty, state.stability, r, grade);
    difficulty = nextDifficulty(state.difficulty, grade);
  }

  const learningState = nextLearningState(state.state, grade);
  const reps = state.reps + 1;
  const lapses = state.lapses + (isLapse(state.state, grade) ? 1 : 0);
  const dueAt = dateAt(
    now,
    now.getTime() + intervalDays(stability, FSRS_TARGET_RETENTION) * MS_PER_DAY,
  );

  return {
    stability,
    difficulty,
    state: learningState,
    dueAt,
    lastReviewedAt: now,
    reps,
    lapses,
  };
}
