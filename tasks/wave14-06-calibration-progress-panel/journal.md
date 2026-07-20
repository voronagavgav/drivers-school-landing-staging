# Task: wave14-06-calibration-progress-panel

**Status:** done
**Driver:** auto
**Updated:** 2026-07-04T00:24Z
**Last compute:** mac-mini

## Goal
Learner-facing calibration panel inside /progress (spec §B — NO new route). Depends on wave14-05.
PASS = ALL true:

1. `lib/server/calibration.ts` exports `getCalibrationForUser(userId: string): Promise<CalibrationResult>`:
   reads the user's ReviewLog rows WITH non-null confidence in CHUNKS ≤ 200 (cursor-paged, select only
   `confidence, grade`), maps `correct = grade >= 2`, feeds `computeCalibration`. No unbounded findMany.
2. `app/(app)/progress/page.tsx` renders a new section «Калібрування впевненості» (after the existing
   «Карта тем» section):
   - sufficient state: headline «Коли ви впевнені — ви маєте рацію в N%» where N =
     round(highConfidenceAccuracy·100) (omit the headline if highConfidenceAccuracy is null), plus the
     per-bucket accuracies and ONE verdict sentence (calm, non-judgmental) per verdict value.
   - insufficient state: EXACTLY «Відповідайте на питання про впевненість — і побачите, наскільки ваше
     відчуття збігається з результатом» (the invite copy, pinned).
   - BOTH states include the offline exclusion note (pinned substring): «Відповіді офлайн не мають
     оцінки впевненості й сюди не входять».
3. Integration test `lib/server/calibration.integration.test.ts` (direct-call justification: page render
   not vitest-testable; wave14-14 asserts the page path in the browser): fixture user with 20 seeded
   ReviewLog rows matching oracle G1's distribution (conf 1..4 with grades: wrong = 1, correct = 3)
   → getCalibrationForUser returns sufficient: true, sampled 20, highConfidenceAccuracy ≈ 10/11
   (toBeCloseTo, expected written as `10 / 11` literal — concat oracle, not the pure fn); a user with
   19 rows → sufficient false. Cleanup FK-safe (ReviewLog→Question is Restrict: delete the USER first,
   Cascade clears logs, then questions/topic/category — house pattern).
4. `npm run test:integration` exits 0; `npm test` exits 0; `npm run typecheck` exits 0;
   `npm run build` exits 0.
5. `lib/calibration.test.ts` UNCHANGED (frozen oracle).
6. `bash tasks/wave14-06-calibration-progress-panel/verify.sh` exits 0.

## Constraints / decisions
- CRAFT RULES: honest framing is the design — never promise improvement, state observed data; the
  insufficient state INVITES action (pinned copy); the section is quiet (no primary CTA, `Card` +
  `SectionTitle` idiom per wave14-01 finding 1e); responsive + visible focus; no motion.
- The panel states the offline exclusion in BOTH states (W13-review requirement) — pinned substring.
- `UserStudyProfile.calibrationSlope` refresh is wave14-07 (nightly), NOT this task — the panel reads
  live buckets, not the stored slope.
- No emoji; Ukrainian only.

## Next
- [x] Read wave14-01 finding 1e + wave14-05; implement server aggregation, then the section.
- Goal fully met; verify.sh PASS. Nothing outstanding (slope refresh is wave14-07).

## Artifacts
- lib/server/calibration.ts, lib/server/calibration.integration.test.ts, app/(app)/progress/page.tsx

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-04T00:24Z ClPcs-Mac-mini: implemented `lib/server/calibration.ts` (`getCalibrationForUser`, cursor-paged ReviewLog scan `take:200` over `confidence:{not:null}`, `correct = grade >= 2` → `computeCalibration`); added «Калібрування впевненості» section to `app/(app)/progress/page.tsx` (sufficient: headline + per-bucket accuracies + one calm verdict sentence; insufficient: pinned invite; offline note both states); wrote `calibration.integration.test.ts` (G1 20-row → sufficient, highConfidenceAccuracy 10/11; 19-row → insufficient). typecheck + unit + integration + build all green; verify.sh PASS.

## Verify
**Last verify:** PASS (2026-07-02T21:26:26Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T21:28:17Z)
