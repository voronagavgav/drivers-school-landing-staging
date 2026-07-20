import {
  EXAM_READINESS_ALMOST_CUTOFF,
  EXAM_READINESS_EXAM_WEIGHT,
  EXAM_READINESS_MASTERY_WEIGHT,
  EXAM_READINESS_READY_CUTOFF,
} from "@/lib/constants";
import type { MasteryBand } from "@/lib/mastery";

// ---------------------------------------------------------------------------
// Pure, learner-facing exam-readiness estimate. No DB, no clock, no randomness.
// The DB/UI layers aggregate recent exam-simulation scores and per-topic mastery
// bands and call examReadiness; the UI renders the score + Ukrainian band label
// (with its own legal disclaimer — this module makes NO guarantee of passing).
//
// This is a SEPARATE, simpler estimate from the internal 5-level estimateReadiness
// in lib/progress.ts. Do not conflate them.
// ---------------------------------------------------------------------------

/** The 3-band Ukrainian preparation label. NOT a guarantee — a readiness signal only. */
export type ReadinessBand = "не готовий" | "майже" | "готовий";

export interface ExamReadiness {
  score: number; // 0..100, rounded integer
  band: ReadinessBand;
}

/**
 * Estimate exam readiness as a 0..100 score with a 3-band label.
 *
 * The score is a weighted blend of two signals, with weights summing to 1
 * (EXAM_READINESS_EXAM_WEIGHT + EXAM_READINESS_MASTERY_WEIGHT):
 *   - the MEAN of recentExamScores (each 0..100; empty history ⇒ 0 contribution), and
 *   - the SHARE of topicBands that are NON-weak (`band !== "weak"`; empty ⇒ 0),
 *     scaled to a 0..100 range.
 * The blend is clamped to 0..100 and rounded to an integer.
 *
 * Band mapping is monotonic in `score` via named cutoffs:
 *   - score < EXAM_READINESS_ALMOST_CUTOFF        ⇒ "не готовий"
 *   - EXAM_READINESS_ALMOST_CUTOFF ≤ score < READY ⇒ "майже"
 *   - score ≥ EXAM_READINESS_READY_CUTOFF          ⇒ "готовий"
 *
 * Empty history is SAFE: `{ recentExamScores: [], topicBands: [] }` ⇒ `{ score: 0,
 * band: "не готовий" }` — no division-by-zero, no NaN, never throws.
 */
export function examReadiness(input: {
  recentExamScores: number[];
  topicBands: MasteryBand[];
}): ExamReadiness {
  const { recentExamScores, topicBands } = input;

  const examMean =
    recentExamScores.length > 0
      ? recentExamScores.reduce((sum, s) => sum + s, 0) / recentExamScores.length
      : 0;

  const nonWeakShare =
    topicBands.length > 0
      ? topicBands.filter((band) => band !== "weak").length / topicBands.length
      : 0;

  const blended =
    EXAM_READINESS_EXAM_WEIGHT * examMean +
    EXAM_READINESS_MASTERY_WEIGHT * (nonWeakShare * 100);

  const score = Math.round(Math.min(100, Math.max(0, blended)));

  let band: ReadinessBand;
  if (score < EXAM_READINESS_ALMOST_CUTOFF) band = "не готовий";
  else if (score < EXAM_READINESS_READY_CUTOFF) band = "майже";
  else band = "готовий";

  return { score, band };
}
