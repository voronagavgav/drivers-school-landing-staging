// Online Elo/Rasch item-difficulty estimator (Wave 22, spec `specs/wave22-elo-difficulty.md`).
//
// Logit-space Rasch/Elo, guess-adjusted 3PL-lite. Each answer nudges the item difficulty β and the
// user ability θ toward the observed outcome, with an uncertainty-adaptive learning rate that shrinks
// as evidence accrues:
//   g   = min(1/optionCount, guessMax)             (guess floor — a 4-option ПДР item ⇒ 0.25)
//   P   = g + (1−g)·sigmoid(θ−β)                    (predicted P(correct))
//   e   = y − P                                      (residual)
//   K(n)= kMax / (1 + n/kHalflife)                   (rate; n = PRE-increment counter for this step)
//   θ'  = θ + K(nUser)·e ,  β' = β − K(nItem)·e     (symmetric: item drops by what the user gains)
//
// A fold consumes answers in the GIVEN order (the server sorts answeredAt ASC, id ASC before calling;
// the fold itself never sorts). Counters used in a step are the PRE-increment values, so a brand-new
// item/user gets K(0)=kMax; both counters increment after the step.
//
// PURE + deterministic — params are injected; no clock, no rng, no module-global mutable state; the
// frozen numeric behaviour is pinned by the python oracle (wave22-01) and `lib/elo.oracle.test.ts`.

import {
  ELO_K_MAX,
  ELO_K_HALFLIFE,
  ELO_INITIAL_BETA,
  ELO_INITIAL_THETA,
} from "@/lib/constants";
import { FSRS_GUESS_MAX } from "@/lib/fsrs/constants";

export type EloParams = {
  kMax: number;
  kHalflife: number;
  guessMax: number;
  initialBeta: number;
  initialTheta: number;
};

export type EloAnswer = {
  userId: string;
  questionId: string;
  correct: boolean;
  optionCount: number;
  answeredAt: Date | number;
  id?: string;
};

/** Default params, single-sourced from constants (guessMax REUSES FSRS_GUESS_MAX, not redeclared). */
export const DEFAULT_ELO_PARAMS: EloParams = {
  kMax: ELO_K_MAX,
  kHalflife: ELO_K_HALFLIFE,
  guessMax: FSRS_GUESS_MAX,
  initialBeta: ELO_INITIAL_BETA,
  initialTheta: ELO_INITIAL_THETA,
};

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Uncertainty-adaptive learning rate; `n` is the pre-increment counter for this step. */
export function kFor(n: number, params: EloParams): number {
  return params.kMax / (1 + n / params.kHalflife);
}

/** Guess floor g = min(1/optionCount, guessMax); a non-positive optionCount falls back to guessMax. */
export function guessFloor(optionCount: number, params: EloParams): number {
  if (optionCount <= 0) return params.guessMax;
  return Math.min(1 / optionCount, params.guessMax);
}

/**
 * Single guess-adjusted update. Counters (`thetaN`/`betaN`) are the PRE-increment values used to size
 * the learning rate for the user and item respectively. Returns the new θ/β only (caller increments).
 */
export function eloUpdate(
  {
    theta,
    beta,
    thetaN,
    betaN,
    correct,
    optionCount,
  }: {
    theta: number;
    beta: number;
    thetaN: number;
    betaN: number;
    correct: boolean;
    optionCount: number;
  },
  params: EloParams,
): { theta: number; beta: number } {
  const g = guessFloor(optionCount, params);
  const p = g + (1 - g) * sigmoid(theta - beta);
  const e = (correct ? 1 : 0) - p;
  return {
    theta: theta + kFor(thetaN, params) * e,
    beta: beta - kFor(betaN, params) * e,
  };
}

/**
 * Fold a stream of answers into per-item difficulty β and per-user ability θ. Consumes `answers` in
 * the GIVEN order (never sorts internally). Each answer reads the current θ/β/counters (defaulting to
 * initialTheta/initialBeta/0), applies `eloUpdate` with the pre-increment counters, then bumps both.
 */
export function foldEloStream(
  answers: readonly EloAnswer[],
  params: EloParams = DEFAULT_ELO_PARAMS,
): {
  items: Map<string, { beta: number; n: number }>;
  users: Map<string, { theta: number; n: number }>;
} {
  const items = new Map<string, { beta: number; n: number }>();
  const users = new Map<string, { theta: number; n: number }>();

  for (const a of answers) {
    const user = users.get(a.userId) ?? { theta: params.initialTheta, n: 0 };
    const item = items.get(a.questionId) ?? { beta: params.initialBeta, n: 0 };
    const { theta, beta } = eloUpdate(
      {
        theta: user.theta,
        beta: item.beta,
        thetaN: user.n,
        betaN: item.n,
        correct: a.correct,
        optionCount: a.optionCount,
      },
      params,
    );
    users.set(a.userId, { theta, n: user.n + 1 });
    items.set(a.questionId, { beta, n: item.n + 1 });
  }

  return { items, users };
}
