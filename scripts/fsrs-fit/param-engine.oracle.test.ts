// ---------------------------------------------------------------------------
// EQUIVALENCE ORACLE for the weight-injectable FSRS-6 engine (param-engine.ts).
//
// Two independent anchors, no self-grading:
//   (1) DEFAULT-VECTOR EQUIVALENCE — at `FSRS_DEFAULT_WEIGHTS`, `scheduleW` /
//       `retrievabilityW` reproduce the SHIPPED `lib/fsrs` `schedule` /
//       `retrievability` to ≤1e-9 / ≤1e-12. The shipped engine is the trusted
//       reference (itself golden-vector-pinned to ts-fsrs@5.4.1 / py-fsrs 6.3.1).
//   (2) EXTERNAL GOLDEN LITERALS — the frozen S/D vectors from
//       `lib/fsrs/reference-vectors.test.ts` (ts-fsrs / py-fsrs generated, NOT
//       our impl's output) via `toBeCloseTo(_, 4)`. Copying them here is a
//       legitimate external pin, not oracle-tampering.
//   (3) PERTURBATION WIRING — a w20 scaled ×1.2 shifts `retrievabilityW` at some
//       grid point by >1e-4, proving the passed weight actually flows through.
//
// Same four grade sequences + fixed 10-day gap as reference-vectors.test.ts; same
// retrievability grid as wave24-02 / emit-ts-retrievability.ts.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { schedule, retrievability, FSRS_DEFAULT_WEIGHTS } from "@/lib/fsrs";
import type { Grade, LearningState, ReviewMemoryState } from "@/lib/fsrs";
import { scheduleW, retrievabilityW } from "./param-engine";

const MS_PER_DAY = 86_400_000;
// Fixed UTC-midnight epoch base and the constant inter-review gap (matches the generator).
const BASE = Date.UTC(2026, 0, 1);
const GAP_DAYS = 10;

// Reflect.construct on the Date constructor — no injected `now` to hand off in a test,
// and this mirrors reference-vectors.test.ts's purity-safe fixed-clock idiom.
const mkDate = (ms: number): Date => Reflect.construct(Date, [ms]) as Date;

const GRADE: Record<string, Grade> = { A: 1, H: 2, G: 3, E: 4 };

interface RefStep {
  grade: keyof typeof GRADE;
  stability: number;
  difficulty: number;
  state: LearningState;
}

// FROZEN external golden vectors (ts-fsrs@5.4.1 / py-fsrs 6.3.1), copied verbatim from
// lib/fsrs/reference-vectors.test.ts. These are NOT our engine's output.
const SEQUENCES: { name: string; steps: RefStep[] }[] = [
  {
    name: "G,G,G,G",
    steps: [
      { grade: "G", stability: 2.30650000, difficulty: 2.11810397, state: "learning" },
      { grade: "G", stability: 25.10871981, difficulty: 2.11121424, state: "review" },
      { grade: "G", stability: 59.24043798, difficulty: 2.10433140, state: "review" },
      { grade: "G", stability: 91.79172483, difficulty: 2.09745544, state: "review" },
    ],
  },
  {
    name: "G,A,G,G",
    steps: [
      { grade: "G", stability: 2.30650000, difficulty: 2.11810397, state: "learning" },
      { grade: "A", stability: 0.75916016, difficulty: 7.39450274, state: "learning" },
      { grade: "G", stability: 6.42832381, difficulty: 7.38233661, state: "review" },
      { grade: "G", stability: 18.82414641, difficulty: 7.37018264, state: "review" },
    ],
  },
  {
    name: "E,E,E",
    steps: [
      { grade: "E", stability: 8.29560000, difficulty: 1.00000000, state: "review" },
      { grade: "E", stability: 75.34793403, difficulty: 1.00000000, state: "review" },
      { grade: "E", stability: 142.27029195, difficulty: 1.00000000, state: "review" },
    ],
  },
  {
    name: "H,G,A,H,G",
    steps: [
      { grade: "H", stability: 1.29310000, difficulty: 5.11217071, state: "learning" },
      { grade: "G", stability: 13.23618877, difficulty: 5.10228691, state: "review" },
      { grade: "A", stability: 1.55186553, difficulty: 8.37538339, state: "relearning" },
      { grade: "H", stability: 5.01775918, difficulty: 8.90673216, state: "review" },
      { grade: "G", stability: 11.81712270, difficulty: 8.89305380, state: "review" },
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

describe("param-engine default-vector equivalence to lib/fsrs schedule + external golden", () => {
  for (const { name, steps } of SEQUENCES) {
    it(`scheduleW(default) === schedule() and matches the golden vectors for ${name}`, () => {
      let shipped = newMemory();
      let param = newMemory();
      steps.forEach((ref, i) => {
        const now = mkDate(BASE + i * GAP_DAYS * MS_PER_DAY);
        shipped = schedule(shipped, GRADE[ref.grade], now);
        param = scheduleW(param, GRADE[ref.grade], now, FSRS_DEFAULT_WEIGHTS);

        // (a) equivalence to the shipped engine at the default vector, ≤1e-9.
        expect(param.stability).toBeCloseTo(shipped.stability, 9);
        expect(param.difficulty).toBeCloseTo(shipped.difficulty, 9);
        expect(param.state).toBe(shipped.state);

        // (b) external frozen golden literals (ts-fsrs / py-fsrs), toBeCloseTo(4).
        expect(param.stability).toBeCloseTo(ref.stability, 4);
        expect(param.difficulty).toBeCloseTo(ref.difficulty, 4);
        expect(param.state).toBe(ref.state);
      });
    });
  }
});

// wave24-02 / emit-ts-retrievability.ts grid: stability × elapsedDays = {0,1,10,S,2·S}.
const STABILITIES = [1, 10, 50, 100, 365];

describe("retrievabilityW default-w20 equivalence to lib/fsrs retrievability", () => {
  it("matches retrievability() to ≤1e-12 across the wave24-02 grid", () => {
    for (const stability of STABILITIES) {
      for (const elapsedDays of [0, 1, 10, stability, 2 * stability]) {
        const lastReviewedAt = mkDate(0);
        const now = mkDate(elapsedDays * MS_PER_DAY);
        const shipped = retrievability({ stability, lastReviewedAt }, now);
        const param = retrievabilityW({ stability, lastReviewedAt }, now, FSRS_DEFAULT_WEIGHTS[20]);
        expect(Math.abs(param - shipped)).toBeLessThanOrEqual(1e-12);
      }
    }
  });

  it("w20 flows through: a ×1.2-scaled w20 shifts R by >1e-4 at some grid point", () => {
    const defaultW20 = FSRS_DEFAULT_WEIGHTS[20];
    const perturbedW20 = defaultW20 * 1.2; // 0.1542 · 1.2 = 0.18504 (shared perturbation convention)
    let maxDiff = 0;
    for (const stability of STABILITIES) {
      for (const elapsedDays of [0, 1, 10, stability, 2 * stability]) {
        const lastReviewedAt = mkDate(0);
        const now = mkDate(elapsedDays * MS_PER_DAY);
        const base = retrievabilityW({ stability, lastReviewedAt }, now, defaultW20);
        const perturbed = retrievabilityW({ stability, lastReviewedAt }, now, perturbedW20);
        maxDiff = Math.max(maxDiff, Math.abs(perturbed - base));
      }
    }
    expect(maxDiff).toBeGreaterThan(1e-4);
  });
});
