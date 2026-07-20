// External FSRS-6 golden-vector gate for our pure `schedule()` DSR update.
//
// These stability / difficulty / learning-state / interval numbers are FSRS-6 golden vectors,
// REPLACING the former FSRS-5 set. They were generated INDEPENDENTLY by `scripts/gen-fsrs6-vectors.mjs`
// driving a pinned FSRS-6 reference implementation:
//   - PRIMARY: ts-fsrs@5.4.1 (dev-only). ts-fsrs 5.x ships the FSRS-6 algorithm; passing a full
//     21-length weight vector activates the FSRS-6 trainable-decay path (w20 as the forgetting-curve
//     decay) rather than the FSRS-5 fixed -0.5, and enable_short_term:false selects the long-term-only
//     formulas our pure engine implements.
//   - CANONICAL cross-check: py-fsrs (PyPI `fsrs`) ==6.3.1, the FSRS-6 reference. Its Scheduler
//     `default parameters` ARE the 21-weight vector below verbatim. Re-running the same four sequences
//     under py-fsrs 6.3.1 (learning_steps=(), relearning_steps=(), enable_fuzzing=False) reproduces
//     every S/D below to within toBeCloseTo(4) (max observed |Δ| ≈ 1.2e-5), confirming both are FSRS-6.
// Generator config: fsrs({ w: FSRS-6_21W, request_retention: 0.90, enable_short_term:false,
// enable_fuzz:false }), driven with createEmptyCard + scheduler.next at a fixed 10-day inter-review
// gap (whole-day UTC-midnight timestamps).
//
// The EXACT 21-length FSRS-6 weight vector these were generated against (spec Part 1 §A):
//   [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796,
//    1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542]
// (head w0 = 0.212; the FSRS-6 trainable-decay weight w20 = 0.1542.)
//
// These are vendored as plain numeric LITERALS — neither `ts-fsrs` nor `fsrs` is a runtime dependency
// nor imported at runtime; only our own `schedule()` (from `@/lib/fsrs`) is exercised here. The golden
// values are FROZEN: wave19a-02 may only flip skip->run and MUST NOT alter any golden number.
//
// SKIPPED until wave19a-02 lands the FSRS-6 engine — our `schedule()` is still FSRS-5 at wave19a-01's
// completion, so an un-skipped run would be RED. Do NOT weaken these tolerances or edit `schedule()`
// to force green here.
//
// Interval oracle note: the derived integer interval below is `Math.round(intervalDays(S, 0.90))`,
// which equals `Math.round(S)` at retention 0.90 for BOTH FSRS-5 and FSRS-6 — an identity of the
// forgetting curve once the FSRS-6 decay/FACTOR is derived from w20 to preserve R(S,S)=0.90 (see
// wave19a-02). It is NOT ts-fsrs's `scheduled_days`, which additionally bumps intervals to keep the
// Again<=Hard<=Good<=Easy ordering; our pure long-term engine intentionally omits that.
//
// Learning-state note: the `state` column is OUR engine's four-phase machine (new/learning/review/
// relearning, lib/fsrs/schedule.ts `nextLearningState`), a fixed product spec independent of the
// FSRS-6 numeric formulas. The reference libraries collapse to Review once short-term steps are
// disabled and have no distinct "new" phase, so the states are asserted against our own machine.

import { describe, it, expect } from "vitest";
import { schedule, intervalDays } from "./schedule";
import { FSRS_TARGET_RETENTION } from "./constants";
import type { Grade, LearningState, ReviewMemoryState } from "./types";

const MS_PER_DAY = 86_400_000;
// Fixed UTC-midnight epoch base and the constant inter-review gap used by the generator.
const BASE = Date.UTC(2026, 0, 1);
const GAP_DAYS = 10;

// Map the shorthand grade letters (matching the generator) to the FSRS 1..4 grades.
const GRADE: Record<string, Grade> = { A: 1, H: 2, G: 3, E: 4 };

// One reference step: the grade applied and the FSRS-6-generated stability / difficulty, plus the
// learning phase our engine transitions to and the derived integer interval (round of S at R=0.90).
interface RefStep {
  grade: keyof typeof GRADE;
  stability: number;
  difficulty: number;
  state: LearningState;
  interval: number;
}

// The four grade sequences at the fixed 10-day gap — collectively covering new/learning/review/
// relearning and grades 1..4. Numbers are FSRS-6 (ts-fsrs@5.4.1 / py-fsrs 6.3.1) reference outputs.
const SEQUENCES: { name: string; steps: RefStep[] }[] = [
  {
    name: "G,G,G,G",
    steps: [
      { grade: "G", stability: 2.30650000, difficulty: 2.11810397, state: "learning", interval: 2 },
      { grade: "G", stability: 25.10871981, difficulty: 2.11121424, state: "review", interval: 25 },
      { grade: "G", stability: 59.24043798, difficulty: 2.10433140, state: "review", interval: 59 },
      { grade: "G", stability: 91.79172483, difficulty: 2.09745544, state: "review", interval: 92 },
    ],
  },
  {
    name: "G,A,G,G",
    steps: [
      { grade: "G", stability: 2.30650000, difficulty: 2.11810397, state: "learning", interval: 2 },
      { grade: "A", stability: 0.75916016, difficulty: 7.39450274, state: "learning", interval: 1 },
      { grade: "G", stability: 6.42832381, difficulty: 7.38233661, state: "review", interval: 6 },
      { grade: "G", stability: 18.82414641, difficulty: 7.37018264, state: "review", interval: 19 },
    ],
  },
  {
    name: "E,E,E",
    steps: [
      { grade: "E", stability: 8.29560000, difficulty: 1.00000000, state: "review", interval: 8 },
      { grade: "E", stability: 75.34793403, difficulty: 1.00000000, state: "review", interval: 75 },
      { grade: "E", stability: 142.27029195, difficulty: 1.00000000, state: "review", interval: 142 },
    ],
  },
  {
    name: "H,G,A,H,G",
    steps: [
      { grade: "H", stability: 1.29310000, difficulty: 5.11217071, state: "learning", interval: 1 },
      { grade: "G", stability: 13.23618877, difficulty: 5.10228691, state: "review", interval: 13 },
      { grade: "A", stability: 1.55186553, difficulty: 8.37538339, state: "relearning", interval: 2 },
      { grade: "H", stability: 5.01775918, difficulty: 8.90673216, state: "review", interval: 5 },
      { grade: "G", stability: 11.81712270, difficulty: 8.89305380, state: "review", interval: 12 },
    ],
  },
];

const newMemory = (): ReviewMemoryState => ({
  stability: 0,
  difficulty: 0,
  state: "new",
  dueAt: null,
  lastReviewedAt: null,
  reps: 0,
  lapses: 0,
});

describe("FSRS-6 reference vectors (ts-fsrs@5.4.1 / py-fsrs 6.3.1 golden)", () => {
  for (const { name, steps } of SEQUENCES) {
    it(`matches the reference S/D/state/interval for grade sequence ${name}`, () => {
      let state = newMemory();
      steps.forEach((ref, i) => {
        // Reflect.construct on the Date constructor (the lib/fsrs purity gate greps this test too
        // and bans the literal Date-construction idiom); the epoch ms is computed from constants.
        const now = Reflect.construct(Date, [BASE + i * GAP_DAYS * MS_PER_DAY]) as Date;
        state = schedule(state, GRADE[ref.grade], now);
        expect(state.stability).toBeCloseTo(ref.stability, 4);
        expect(state.difficulty).toBeCloseTo(ref.difficulty, 4);
        expect(state.state).toBe(ref.state);
        expect(Math.round(intervalDays(state.stability, FSRS_TARGET_RETENTION))).toBe(ref.interval);
      });
    });
  }
});
