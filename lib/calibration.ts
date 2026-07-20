import {
  CALIBRATION_EXPECTED_ACCURACY,
  CALIBRATION_MIN_SAMPLES,
  CALIBRATION_OVERCONFIDENT_BELOW,
  CALIBRATION_SLOPE_MIN,
  CALIBRATION_UNDERCONFIDENT_ABOVE,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Pure confidence-calibration math (Wave 14 spec §B). No DB, no wall clock —
// the caller (server aggregation, wave14-06/07) loads the sampled confidence
// answers and hands them in as plain rows.
// ---------------------------------------------------------------------------

export interface CalibrationRow {
  /**
   * Learner-reported confidence 1..4 (Wave 12b chip). Null / out-of-range
   * values are ignored — offline reviews carry no confidence (the §B
   * exclusion), so the server passes those rows through as null.
   */
  confidence: number | null;
  /**
   * Whether the answer was correct. Mapping from a review grade is the
   * SERVER's job: correct = grade >= 2, since deriveGrade assigns 1 to
   * wrong answers.
   */
  correct: boolean;
}

export interface CalibrationBucket {
  confidence: 1 | 2 | 3 | 4;
  total: number;
  correct: number;
  accuracy: number;
}

export type CalibrationVerdict = "overconfident" | "underconfident" | "calibrated";

export type CalibrationResult =
  | { sufficient: false; sampled: number }
  | {
      sufficient: true;
      sampled: number;
      /** Per-confidence buckets, only those with total > 0. */
      buckets: CalibrationBucket[];
      /** correct/total over confidence 3–4; null when no such rows. */
      highConfidenceAccuracy: number | null;
      /** correct/total over confidence 1–2; null when no such rows. */
      lowConfidenceAccuracy: number | null;
      verdict: CalibrationVerdict;
      /**
       * clamp(totalCorrect / expectedCorrect, CALIBRATION_SLOPE_MIN, 1.0) —
       * caps at 1.0 so calibration only ever DISCOUNTS readiness, never
       * inflates it (matches perItemPassProb(r, slope) in lib/readiness-model.ts).
       */
      slope: number;
    };

function isValidConfidence(c: number | null): c is 1 | 2 | 3 | 4 {
  return c !== null && Number.isInteger(c) && c >= 1 && c <= 4;
}

export function computeCalibration(rows: CalibrationRow[]): CalibrationResult {
  const kept = rows.filter((r): r is CalibrationRow & { confidence: 1 | 2 | 3 | 4 } =>
    isValidConfidence(r.confidence),
  );
  const sampled = kept.length;
  if (sampled < CALIBRATION_MIN_SAMPLES) {
    return { sufficient: false, sampled };
  }

  const totals = [0, 0, 0, 0];
  const corrects = [0, 0, 0, 0];
  for (const row of kept) {
    totals[row.confidence - 1] += 1;
    if (row.correct) corrects[row.confidence - 1] += 1;
  }

  const buckets: CalibrationBucket[] = [];
  for (let i = 0; i < 4; i++) {
    if (totals[i] > 0) {
      buckets.push({
        confidence: (i + 1) as 1 | 2 | 3 | 4,
        total: totals[i],
        correct: corrects[i],
        accuracy: corrects[i] / totals[i],
      });
    }
  }

  const highTotal = totals[2] + totals[3];
  const lowTotal = totals[0] + totals[1];
  const highConfidenceAccuracy =
    highTotal > 0 ? (corrects[2] + corrects[3]) / highTotal : null;
  const lowConfidenceAccuracy =
    lowTotal > 0 ? (corrects[0] + corrects[1]) / lowTotal : null;

  const verdict: CalibrationVerdict =
    highConfidenceAccuracy !== null &&
    highConfidenceAccuracy < CALIBRATION_OVERCONFIDENT_BELOW
      ? "overconfident"
      : lowConfidenceAccuracy !== null &&
          lowConfidenceAccuracy > CALIBRATION_UNDERCONFIDENT_ABOVE
        ? "underconfident"
        : "calibrated";

  const totalCorrect = corrects.reduce((a, b) => a + b, 0);
  const expectedCorrect = kept.reduce(
    (sum, row) => sum + CALIBRATION_EXPECTED_ACCURACY[row.confidence - 1],
    0,
  );
  const slope = Math.min(1, Math.max(CALIBRATION_SLOPE_MIN, totalCorrect / expectedCorrect));

  return {
    sufficient: true,
    sampled,
    buckets,
    highConfidenceAccuracy,
    lowConfidenceAccuracy,
    verdict,
    slope,
  };
}
