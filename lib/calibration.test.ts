import { describe, it, expect } from "vitest";
import { computeCalibration, type CalibrationRow } from "@/lib/calibration";

// Golden vectors G1–G6 frozen at plan time (2026-07-02), hand-computed BEFORE
// the implementation existed — do NOT derive expected values from
// computeCalibration; this table is the oracle
// (tasks/wave14-05-calibration-pure/journal.md).

function rows(confidence: number | null, total: number, correct: number): CalibrationRow[] {
  return Array.from({ length: total }, (_, i) => ({
    confidence,
    correct: i < correct,
  }));
}

describe("computeCalibration — golden vectors", () => {
  it("G1: 20 mixed rows — calibrated, slope clamps to 1.0", () => {
    const res = computeCalibration([
      ...rows(1, 4, 1),
      ...rows(2, 5, 2),
      ...rows(3, 6, 5),
      ...rows(4, 5, 5),
    ]);
    expect(res.sufficient).toBe(true);
    if (!res.sufficient) return;
    expect(res.sampled).toBe(20);
    expect(res.buckets).toHaveLength(4);
    expect(res.buckets[0]).toMatchObject({ confidence: 1, total: 4, correct: 1 });
    expect(res.buckets[0].accuracy).toBeCloseTo(0.25);
    expect(res.buckets[1].accuracy).toBeCloseTo(0.4);
    expect(res.buckets[2].accuracy).toBeCloseTo(5 / 6);
    expect(res.buckets[3].accuracy).toBeCloseTo(1.0);
    expect(res.highConfidenceAccuracy).toBeCloseTo(10 / 11);
    expect(res.lowConfidenceAccuracy).toBeCloseTo(3 / 9);
    expect(res.verdict).toBe("calibrated");
    // expectedCorrect = 4·0.25 + 5·0.5 + 6·0.75 + 5·0.95 = 12.75; raw ratio
    // 13/12.75 ≈ 1.0196 → slope clamps to the 1.0 cap.
    expect(res.slope).toBe(1);
  });

  it("G2: high-confidence misses — overconfident, slope clamps to the 0.6 floor", () => {
    const res = computeCalibration([...rows(3, 10, 3), ...rows(4, 10, 4)]);
    expect(res.sufficient).toBe(true);
    if (!res.sufficient) return;
    expect(res.highConfidenceAccuracy).toBe(0.35);
    expect(res.verdict).toBe("overconfident");
    // expectedCorrect = 17; raw 7/17 ≈ 0.4118 → slope clamps to 0.6.
    expect(res.slope).toBe(0.6);
  });

  it("G3: low-confidence hits — underconfident, slope caps at 1.0", () => {
    const res = computeCalibration([...rows(1, 10, 8), ...rows(2, 10, 8)]);
    expect(res.sufficient).toBe(true);
    if (!res.sufficient) return;
    expect(res.highConfidenceAccuracy).toBeNull();
    expect(res.lowConfidenceAccuracy).toBeCloseTo(0.8);
    expect(res.verdict).toBe("underconfident");
    // expectedCorrect = 7.5; raw 16/7.5 > 1 → slope 1.0.
    expect(res.slope).toBe(1);
  });

  it("G4: 19 valid rows are insufficient", () => {
    expect(computeCalibration(rows(2, 19, 10))).toEqual({
      sufficient: false,
      sampled: 19,
    });
  });

  it("G5: null-confidence rows are ignored — still insufficient at 19 kept", () => {
    expect(computeCalibration([...rows(2, 19, 10), ...rows(null, 5, 3)])).toEqual({
      sufficient: false,
      sampled: 19,
    });
  });

  it("G6: mid-range slope 10/12.75 with an overconfident verdict", () => {
    const res = computeCalibration([
      ...rows(1, 4, 1),
      ...rows(2, 5, 2),
      ...rows(3, 6, 4),
      ...rows(4, 5, 3),
    ]);
    expect(res.sufficient).toBe(true);
    if (!res.sufficient) return;
    // totalCorrect 10, expectedCorrect 12.75 → slope ≈ 0.7843 (no clamp).
    expect(res.slope).toBeCloseTo(0.7843, 3);
    // highConfidenceAccuracy 7/11 ≈ 0.636 < 0.7.
    expect(res.verdict).toBe("overconfident");
  });
});
