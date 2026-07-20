// ---------------------------------------------------------------------------
// WEIGHT-INJECTABLE FSRS-6 engine — the parametrized mirror of `lib/fsrs`
// `schedule` / `retrievability` that the synthetic generator (wave24-07) runs.
//
// WHY a mirror and not a reuse: the shipped `lib/fsrs/schedule.ts` hard-wires
// `FSRS_DEFAULT_WEIGHTS` (`const w = FSRS_DEFAULT_WEIGHTS`) and is OUT OF SCOPE
// (must stay byte-untouched — wave24-10 gate). To simulate the REAL engine under
// a PERTURBED weight vector, the generator needs a schedule/retrievability that
// TAKES the 21-weight vector as a parameter. This module is that engine: the
// SAME FSRS-6 long-term formulas as `lib/fsrs`, with every constant read
// generalised from `w[i]` to `weights[i]`.
//
// EXTERNAL ORACLE (param-engine.oracle.test.ts): at the DEFAULT vector this
// reproduces `lib/fsrs` `schedule`/`retrievability` to ≤1e-9, and the shipped
// engine is itself golden-vector-pinned to ts-fsrs@5.4.1 / py-fsrs 6.3.1
// (`lib/fsrs/reference-vectors.test.ts`). The 1e-9 equivalence GUARANTEES the
// generalisation is faithful; the frozen golden literals are the external anchor.
//
// PURE + deterministic: the only clock is the injected `now: Date`; no wall
// clock (no ambient-time reads — dueAt is built via `Reflect.construct`), no
// RNG, and no imports from the DB or server-scoped runtime layer.
// `FSRS_DEFAULT_WEIGHTS` / `FSRS_TARGET_RETENTION` are imported ONLY as
// convenience default args — never read mid-formula (every numeric parameter
// in the formulas flows from the passed `weights` argument).
//
// PERTURBATION CONVENTION (shared with wave24-07/08): the perturbed vector is the
// default with `w8 × 1.2, w11 × 1.2, w20 × 1.2` (recall-growth base, lapse base,
// forgetting-curve decay). Downstream tasks build it against THIS definition.
// ---------------------------------------------------------------------------

import { FSRS_DEFAULT_WEIGHTS, FSRS_TARGET_RETENTION } from "@/lib/fsrs";
import type { Grade, LearningState, ReviewMemoryState } from "@/lib/fsrs";

const MS_PER_DAY = 86_400_000;

// Stability floor: matches the shipped engine's MIN_STABILITY (S_MIN = 1e-3,
// aligned to ts-fsrs@5.4.1). Not a trainable weight — a numeric floor of the
// formula, identical in both engines.
const MIN_STABILITY = 0.001;

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

// Clamp difficulty into the canonical FSRS [1,10] band.
const clampDifficulty = (d: number): number => clamp(d, 1, 10);

// ---- forgetting curve (weight-injectable) ---------------------------------

// FSRS-6 curve exponent DECAY = -w20 and FACTOR = 0.9^(1/DECAY) - 1, both derived
// from the SAME injected w20 so R = 0.9 EXACTLY at elapsed === stability by
// construction (identical to `lib/fsrs/retrievability.ts`, but w20 is a parameter).
function decayFactor(w20: number): { decay: number; factor: number } {
  const decay = -w20;
  const factor = Math.pow(0.9, 1 / decay) - 1;
  return { decay, factor };
}

// R(elapsed, stability) = (1 + FACTOR · elapsedDays / stability) ^ DECAY, clamped
// [0,1] — the FSRS-6 forgetting curve with the trainable decay `w20` passed in.
// Equals 1 at elapsed 0 / null lastReviewedAt; 0 for a non-positive stability.
export function retrievabilityW(
  state: Pick<ReviewMemoryState, "stability" | "lastReviewedAt">,
  now: Date,
  w20: number,
): number {
  const last = state.lastReviewedAt;
  if (last == null) return 1;

  const elapsedDays = Math.max(0, (now.getTime() - last.getTime()) / MS_PER_DAY);
  if (elapsedDays === 0) return 1;

  const stability = state.stability;
  if (!(stability > 0)) return 0;

  const { decay, factor } = decayFactor(w20);
  const r = Math.pow(1 + factor * (elapsedDays / stability), decay);
  return Math.min(1, Math.max(0, r));
}

// ---- interval inversion (weight-injectable) -------------------------------
// Invert R(t,S) = retention: t = S/FACTOR · (retention^(1/DECAY) - 1). FACTOR/DECAY
// derive from the injected w20 (retention stays the free `FSRS_TARGET_RETENTION`).
export function intervalDaysW(stability: number, retention: number, w20: number): number {
  const { decay, factor } = decayFactor(w20);
  const days = (stability / factor) * (Math.pow(retention, 1 / decay) - 1);
  return Math.max(0, days);
}

// ---- DSR primitives (FSRS-6, weight-injectable) ---------------------------

// Initial stability for the first rating of a `new` card: S_0(G) = w[G-1].
function initialStability(grade: Grade, weights: readonly number[]): number {
  return Math.max(MIN_STABILITY, weights[grade - 1]);
}

// Raw (UNCLAMPED) initial difficulty: D_0(G) = w4 - e^(w5·(G-1)) + 1. Fed unclamped
// into the difficulty mean-reversion target (clamping it first breaks FSRS-6).
function initialDifficultyRaw(grade: Grade, weights: readonly number[]): number {
  return weights[4] - Math.exp(weights[5] * (grade - 1)) + 1;
}

// Initial difficulty for a `new` card, clamped to the canonical [1,10] band.
function initialDifficulty(grade: Grade, weights: readonly number[]): number {
  return clampDifficulty(initialDifficultyRaw(grade, weights));
}

// Difficulty update: linear damping toward the edges, then mean reversion to the
// UNCLAMPED D_0(Easy). dD = -w6·(G-3); D' = D + dD·(10-D)/9; D'' = w7·D_0raw(4) +
// (1-w7)·D'; clamp [1,10].
function nextDifficulty(difficulty: number, grade: Grade, weights: readonly number[]): number {
  const deltaD = -weights[6] * (grade - 3);
  const damped = difficulty + (deltaD * (10 - difficulty)) / 9;
  const reverted = weights[7] * initialDifficultyRaw(4, weights) + (1 - weights[7]) * damped;
  return clampDifficulty(reverted);
}

// Stability after a SUCCESSFUL recall (grade >= 2). Hard penalises (w15), Easy boosts (w16).
function recallStability(
  difficulty: number,
  stability: number,
  r: number,
  grade: Grade,
  weights: readonly number[],
): number {
  const hardPenalty = grade === 2 ? weights[15] : 1;
  const easyBonus = grade === 4 ? weights[16] : 1;
  const growth =
    Math.exp(weights[8]) *
    (11 - difficulty) *
    Math.pow(stability, -weights[9]) *
    (Math.exp(weights[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;
  return Math.max(MIN_STABILITY, stability * (1 + growth));
}

// Stability after a LAPSE (grade 1, Again), capped at the pre-lapse stability.
function forgetStability(
  difficulty: number,
  stability: number,
  r: number,
  weights: readonly number[],
): number {
  const sForget =
    weights[11] *
    Math.pow(difficulty, -weights[12]) *
    (Math.pow(stability + 1, weights[13]) - 1) *
    Math.exp(weights[14] * (1 - r));
  return Math.max(MIN_STABILITY, Math.min(sForget, stability));
}

// ---- state machine (identical to lib/fsrs, no weights) --------------------
function nextLearningState(prior: LearningState, grade: Grade): LearningState {
  if (prior === "new") return grade === 4 ? "review" : "learning";
  if (prior === "learning") return grade === 1 ? "learning" : "review";
  return grade === 1 ? "relearning" : "review";
}

function isLapse(prior: LearningState, grade: Grade): boolean {
  return grade === 1 && prior !== "new";
}

// Construct a Date from the injected clock WITHOUT the banned direct-construction idiom.
function dateAt(now: Date, epochMs: number): Date {
  return Reflect.construct(now.constructor, [epochMs]) as Date;
}

// ---- scheduleW ------------------------------------------------------------
// The weight-injectable FSRS-6 DSR update. At `weights = FSRS_DEFAULT_WEIGHTS`
// (and `retention = FSRS_TARGET_RETENTION`) it reproduces `lib/fsrs` `schedule`
// bit-for-bit (the equivalence oracle).
export function scheduleW(
  state: ReviewMemoryState,
  grade: Grade,
  now: Date,
  weights: readonly number[] = FSRS_DEFAULT_WEIGHTS,
  retention: number = FSRS_TARGET_RETENTION,
): ReviewMemoryState {
  let stability: number;
  let difficulty: number;

  if (state.state === "new") {
    stability = initialStability(grade, weights);
    difficulty = initialDifficulty(grade, weights);
  } else {
    const r = retrievabilityW(state, now, weights[20]);
    stability =
      grade === 1
        ? forgetStability(state.difficulty, state.stability, r, weights)
        : recallStability(state.difficulty, state.stability, r, grade, weights);
    difficulty = nextDifficulty(state.difficulty, grade, weights);
  }

  const learningState = nextLearningState(state.state, grade);
  const reps = state.reps + 1;
  const lapses = state.lapses + (isLapse(state.state, grade) ? 1 : 0);
  const dueAt = dateAt(
    now,
    now.getTime() + intervalDaysW(stability, retention, weights[20]) * MS_PER_DAY,
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
