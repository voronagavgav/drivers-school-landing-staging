// gen-fsrs6-vectors.mjs — DEV / THROWAWAY oracle generator (NOT a runtime dependency of the app).
//
// Regenerates the external FSRS-6 golden vectors that `lib/fsrs/reference-vectors.test.ts` pins as
// plain numeric literals. It drives a PINNED FSRS-6 reference implementation and prints the
// stability / difficulty / learning-state / derived-interval rows for each grade sequence; the
// literals are then copied by hand into the test. `ts-fsrs` / `fsrs` are NEVER imported at runtime —
// only our own `@/lib/fsrs` is exercised by the test.
//
// Reference implementation (pinned):
//   - PRIMARY driver here: ts-fsrs@5.4.1 (devDependency). ts-fsrs 5.x already ships the FSRS-6
//     algorithm: passing a full 21-length weight vector activates the FSRS-6 trainable-decay path
//     (w20 as the forgetting-curve decay) instead of the FSRS-5 fixed -0.5, and enable_short_term:false
//     selects the long-term-only formulas our pure engine implements.
//   - CANONICAL cross-check: py-fsrs (PyPI `fsrs`) ==6.3.1 — the FSRS-6 reference. Its Scheduler
//     `default parameters` ARE the 21-weight vector below, verbatim. Running the same four sequences
//     under py-fsrs 6.3.1 with `learning_steps=() , relearning_steps=()` (short-term disabled) and
//     `enable_fuzzing=False` reproduces every stability/difficulty here to within toBeCloseTo(4)
//     (max observed |Δ| ≈ 1.2e-5, i.e. ~0.24× the 5e-5 tolerance). The two implementations differ
//     only in float summation order; both are FSRS-6.
//
// Config: request_retention 0.90, enable_short_term:false, enable_fuzz:false, and the EXACT 21-weight
// FSRS-6 vector we ship (NOT the library's own default_w — though for py-fsrs 6.3.1 they coincide).
// Deterministic: whole-day UTC-midnight timestamps + a fixed 10-day inter-review gap. Re-running
// produces byte-identical output.
//
// Run:  node scripts/gen-fsrs6-vectors.mjs

import { fsrs, createEmptyCard, Rating } from "ts-fsrs";

// The 21-length FSRS-6 default weight vector we ship (spec Part 1 §A / research finding 33).
const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835,
  0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];

const REQUEST_RETENTION = 0.9;

const scheduler = fsrs({
  w: W,
  request_retention: REQUEST_RETENTION,
  enable_short_term: false,
  enable_fuzz: false,
});

// Shorthand grade letters -> FSRS 1..4 ratings (matches the test's GRADE map).
const RATING = { A: Rating.Again, H: Rating.Hard, G: Rating.Good, E: Rating.Easy };

const MS_PER_DAY = 86_400_000;
const BASE = Date.UTC(2026, 0, 1); // fixed UTC-midnight epoch base
const GAP_DAYS = 10; // constant inter-review gap

// Our engine's learning-state machine (lib/fsrs/schedule.ts `nextLearningState`) — re-stated here so
// the golden `state` column reflects OUR app's fixed four-phase spec, not the reference library's
// enum (ts-fsrs/py-fsrs collapse everything to Review once short-term steps are disabled and have no
// distinct "new" phase). The transitions are a product spec, independent of the FSRS-6 numeric
// formulas; the numeric oracle (S/D) is the reference library's.
function nextState(prior, grade) {
  if (prior === "new") return grade === 4 ? "review" : "learning";
  if (prior === "learning") return grade === 1 ? "learning" : "review";
  return grade === 1 ? "relearning" : "review"; // review or relearning
}

// The four grade sequences — collectively cover new/learning/review/relearning and grades 1..4.
const SEQUENCES = [
  { name: "G,G,G,G", grades: ["G", "G", "G", "G"] },
  { name: "G,A,G,G", grades: ["G", "A", "G", "G"] },
  { name: "E,E,E", grades: ["E", "E", "E"] },
  { name: "H,G,A,H,G", grades: ["H", "G", "A", "H", "G"] },
];

for (const { name, grades } of SEQUENCES) {
  let card = createEmptyCard(new Date(BASE));
  let state = "new";
  const rows = [];
  grades.forEach((g, i) => {
    const now = new Date(BASE + i * GAP_DAYS * MS_PER_DAY);
    const rec = scheduler.next(card, now, RATING[g]);
    card = rec.card;
    state = nextState(state, RATING[g]);
    const interval = Math.round(card.stability); // = round(intervalDays(S, 0.90)) at R=0.90
    rows.push(
      `      { grade: "${g}", stability: ${card.stability.toFixed(8)}, ` +
        `difficulty: ${card.difficulty.toFixed(8)}, state: "${state}", interval: ${interval} },`,
    );
  });
  console.log(`  {\n    name: "${name}",\n    steps: [\n${rows.join("\n")}\n    ],\n  },`);
}
