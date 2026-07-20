// ---------------------------------------------------------------------------
// Pure difficulty-outlier math for the admin learning-health page (spec §E).
// The "generation = free data audit" loop: compare a question's OBSERVED answer
// accuracy against the accuracy its AUTHORED difficulty predicts. A question that
// reads far easier or harder than its level is a content signal for an editor.
//
// No DB, no clock, no React — the server layer (lib/server/learning-health.ts)
// supplies pre-grouped rows and the admin UI (wave14-12) just renders the result.
// ---------------------------------------------------------------------------

import {
  DIFFICULTY_EXPECTED_ACCURACY,
  DIFFICULTY_OUTLIER_DELTA,
  DIFFICULTY_OUTLIER_MIN_ANSWERS,
} from "./constants";

/** One question's answer tally: authored difficulty plus observed correct/total. */
export interface DifficultyRow {
  questionId: string;
  difficulty: number;
  total: number;
  correct: number;
}

/** A question whose observed accuracy strays from its authored difficulty. */
export interface DifficultyOutlier {
  questionId: string;
  observed: number; // correct / total
  expected: number; // DIFFICULTY_EXPECTED_ACCURACY[difficulty-1]
  delta: number; // observed − expected (signed)
  direction: "easier" | "harder"; // observed > expected → "easier"
}

/**
 * Flag questions whose observed accuracy is out of step with their authored
 * difficulty. Pure and deterministic.
 *
 * - Rows with `total < DIFFICULTY_OUTLIER_MIN_ANSWERS` are excluded (too noisy).
 * - `observed = correct / total`; `expected = DIFFICULTY_EXPECTED_ACCURACY` at
 *   `difficulty - 1`, with difficulty clamped to 1..5.
 * - Outlier iff `|observed − expected| > DIFFICULTY_OUTLIER_DELTA` (strict).
 * - `direction` is "easier" when observed > expected, else "harder".
 * - Sorted by `|delta|` descending (biggest mismatch first).
 */
export function difficultyOutliers(rows: DifficultyRow[]): DifficultyOutlier[] {
  const out: DifficultyOutlier[] = [];

  for (const row of rows) {
    if (row.total < DIFFICULTY_OUTLIER_MIN_ANSWERS) continue;

    const clamped = Math.min(5, Math.max(1, Math.round(row.difficulty)));
    const expected = DIFFICULTY_EXPECTED_ACCURACY[clamped - 1];
    const observed = row.correct / row.total;
    const delta = observed - expected;

    if (Math.abs(delta) > DIFFICULTY_OUTLIER_DELTA) {
      out.push({
        questionId: row.questionId,
        observed,
        expected,
        delta,
        direction: delta > 0 ? "easier" : "harder",
      });
    }
  }

  out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return out;
}
