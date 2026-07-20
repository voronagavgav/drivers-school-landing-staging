// Shared, type-only shapes for the pure FSRS engine (lib/fsrs/*).
//
// PURE: no runtime code, no clock, no DB, no randomness — only structural types that the
// retrievability / grade primitives here and task 04's `schedule` state machine both reuse.

// FSRS review grade: the 1..4 rating fed to the scheduler.
//   1 = Again (lapse), 2 = Hard, 3 = Good, 4 = Easy.
export type Grade = 1 | 2 | 3 | 4;

// The learning phase of a card in the FSRS state machine. `schedule` (task 04) owns the
// transitions; declared here so the persisted state has a single canonical union.
export type LearningState = "new" | "learning" | "review" | "relearning";

// Per-user memory state for one question. `stability` (days until R decays to the target)
// and `difficulty` are the FSRS latent variables; `lastReviewedAt` anchors the forgetting
// curve (null = never reviewed). Retrievability is DERIVED from this on demand, never stored.
export interface ReviewMemoryState {
  stability: number;
  difficulty: number;
  // FSRS learning phase; `schedule` (task 04) owns the transitions. Named `state` to mirror the
  // persisted `ReviewState.state` column (prisma/schema.prisma), not `learningState`.
  state: LearningState;
  // Next scheduled review = `lastReviewedAt + intervalDays(stability, target)`; null until the
  // first review. DERIVED by `schedule` from the injected clock, never fed back into the curve.
  dueAt: Date | null;
  lastReviewedAt: Date | null;
  reps: number;
  lapses: number;
}
