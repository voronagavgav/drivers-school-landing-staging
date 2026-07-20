# Task: wave14-05-calibration-pure

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02T21:20Z
**Last compute:** mac-mini

## Goal
PURE confidence-calibration math (spec §B) — `lib/calibration.ts`, no DB/server-only/wall-clock.
PASS = ALL true:

1. `lib/constants.ts` exports `CALIBRATION_MIN_SAMPLES = 20`,
   `CALIBRATION_EXPECTED_ACCURACY = [0.25, 0.5, 0.75, 0.95] as const` (expected accuracy for
   confidence 1..4), `CALIBRATION_SLOPE_MIN = 0.6`, `CALIBRATION_OVERCONFIDENT_BELOW = 0.7`,
   `CALIBRATION_UNDERCONFIDENT_ABOVE = 0.6` (with why-comments).
2. `lib/calibration.ts` exports `CalibrationRow = { confidence: number | null; correct: boolean }`,
   `CalibrationBucket = { confidence: 1|2|3|4; total: number; correct: number; accuracy: number }`,
   `CalibrationResult`, and `computeCalibration(rows: CalibrationRow[]): CalibrationResult`.
3. Pinned semantics (implement exactly):
   - Rows with confidence null / not an integer in 1..4 are IGNORED (offline reviews carry no
     confidence — the §B exclusion); `sampled` = count of kept rows.
   - `sampled < CALIBRATION_MIN_SAMPLES` → `{ sufficient: false, sampled }` (no buckets/verdict/slope).
   - Else `{ sufficient: true, sampled, buckets, highConfidenceAccuracy, lowConfidenceAccuracy,
     verdict, slope }` where: buckets = the 1..4 buckets with total > 0; highConfidenceAccuracy =
     correct/total over confidence ∈ {3,4} (null if no such rows); lowConfidenceAccuracy same over
     {1,2}; verdict = "overconfident" if highConfidenceAccuracy !== null &&
     highConfidenceAccuracy < CALIBRATION_OVERCONFIDENT_BELOW, else "underconfident" if
     lowConfidenceAccuracy !== null && lowConfidenceAccuracy > CALIBRATION_UNDERCONFIDENT_ABOVE,
     else "calibrated"; slope = clamp(totalCorrect / expectedCorrect, CALIBRATION_SLOPE_MIN, 1.0)
     with expectedCorrect = Σ over kept rows of CALIBRATION_EXPECTED_ACCURACY[confidence-1].
4. ORACLE (frozen at plan time 2026-07-02, hand-computed — do not alter expected values).
   `lib/calibration.test.ts` asserts these golden vectors:
   - G1 (exactly 20 rows): conf1 4 rows/1 correct; conf2 5 rows/2 correct; conf3 6 rows/5 correct;
     conf4 5 rows/5 correct → sufficient true, sampled 20; bucket accuracies 0.25, 0.4, 5/6, 1.0
     (toBeCloseTo); highConfidenceAccuracy = 10/11; lowConfidenceAccuracy = 3/9; verdict "calibrated";
     expectedCorrect = 12.75 (4·0.25+5·0.5+6·0.75+5·0.95); raw ratio 13/12.75 ≈ 1.0196 → slope
     CLAMPS to 1.0 (assert slope === 1).
   - G2 (overconfident, 20 rows): conf3 10 rows/3 correct; conf4 10 rows/4 correct →
     highConfidenceAccuracy = 7/20 = 0.35 → verdict "overconfident"; expectedCorrect = 17;
     raw 7/17 ≈ 0.4118 → slope CLAMPS to 0.6 (assert slope === 0.6).
   - G3 (underconfident, 20 rows): conf1 10 rows/8 correct; conf2 10 rows/8 correct →
     highConfidenceAccuracy null; lowConfidenceAccuracy 0.8 → verdict "underconfident";
     expectedCorrect = 7.5; raw 16/7.5 > 1 → slope 1.0.
   - G4: any 19 valid rows → { sufficient: false, sampled: 19 }.
   - G5: 19 valid rows + 5 rows with confidence null → sampled 19 → insufficient (nulls ignored).
   - G6 (mid-range slope, 20 rows): conf1 4/1, conf2 5/2, conf3 6/4, conf4 5/3 → totalCorrect 10,
     expectedCorrect 12.75, slope = 10/12.75 ≈ 0.7843 (toBeCloseTo 0.7843, 3 dp), verdict
     "overconfident" (7/11 ≈ 0.636 < 0.7).
5. Purity: no `server-only|@/lib/db|@prisma/client|lib/generated|Math.random|Date.now|new Date(` in
   lib/calibration.ts.
6. `npm test` exits 0; vitest list contains `calibration.test.ts`; `npm run typecheck` exits 0.
7. No schema/migration change; `bash tasks/wave14-05-calibration-pure/verify.sh` exits 0.

## Constraints / decisions
- Oracle G1–G6 frozen by the planner BEFORE implementation (anti self-grading); implementer may add
  cases, never edit these. Literals also pinned in verify.sh.
- correct-from-grade mapping (`correct = grade >= 2`, since deriveGrade assigns 1 to wrong answers) is
  the SERVER's job (wave14-06/07) — the pure fn only sees booleans. Document the mapping in the
  CalibrationRow doc comment WITHOUT the forbidden purity tokens.
- slope caps at 1.0: calibration never INFLATES readiness, only discounts (matches
  perItemPassProb(r, slope) semantics in lib/readiness-model.ts).
- Same no-red-window rationale as wave14-02 for folding oracle-authoring + implementation into one
  driver task with plan-time-frozen literals.

## Next
- [x] Add constants; implement computeCalibration; write G1–G6 exactly as pinned.
- (none — Goal met; verify.sh PASS)

## Artifacts
- lib/calibration.ts, lib/calibration.test.ts, lib/constants.ts (calibration block)

## Log
- 2026-07-02T20:43Z planner: task created; oracle G1–G6 frozen (12.75 / 10⁄11 / 0.35 / 0.7843 literals).
- 2026-07-02T21:20Z ClPcs-Mac-mini: added the 5 CALIBRATION_* constants (lib/constants.ts, why-comments), implemented computeCalibration in lib/calibration.ts (pure: null/non-1..4 rows dropped, insufficient <20, buckets/high-low accuracy/verdict/clamped slope per §B), wrote G1–G6 as pinned in lib/calibration.test.ts (rows() helper, nudge-policy.test.ts style). verify.sh PASS end-to-end (typecheck + 548 unit tests green, 49 files). Status → done.

## Verify
**Last verify:** PASS (2026-07-02T21:20:47Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T21:21:40Z)
