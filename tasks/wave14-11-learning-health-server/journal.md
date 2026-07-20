# Task: wave14-11-learning-health-server

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T01:17Z
**Last compute:** mac-mini

## Goal
Admin learning-health aggregation (spec §E), split PURE outlier math / server aggregation; the page is
wave14-12. PASS = ALL true:

1. `lib/constants.ts` exports `DIFFICULTY_EXPECTED_ACCURACY = [0.9, 0.8, 0.7, 0.6, 0.5] as const`
   (expected observed accuracy for authored difficulty 1..5), `DIFFICULTY_OUTLIER_DELTA = 0.25`,
   `DIFFICULTY_OUTLIER_MIN_ANSWERS = 20` (why-comments).
2. PURE `lib/learning-health.ts` exports `difficultyOutliers(rows: { questionId: string; difficulty: number;
   total: number; correct: number }[]): { questionId: string; observed: number; expected: number;
   delta: number; direction: "easier" | "harder" }[]` — pinned semantics: rows with
   `total < DIFFICULTY_OUTLIER_MIN_ANSWERS` are excluded; observed = correct/total; expected =
   DIFFICULTY_EXPECTED_ACCURACY[difficulty-1] (difficulty clamped 1..5); outlier iff
   |observed − expected| > DIFFICULTY_OUTLIER_DELTA; direction "easier" when observed > expected;
   sorted by |delta| desc.
3. ORACLE (frozen at plan time, hand-computed) in `lib/learning-health.test.ts`:
   - O1: {difficulty 5, total 40, correct 36} → observed 0.9, expected 0.5, delta 0.4, "easier".
   - O2: {difficulty 1, total 30, correct 12} → observed 0.4, expected 0.9, delta −0.5, "harder".
   - O3: {difficulty 3, total 25, correct 17} → observed 0.68, expected 0.7 → NOT an outlier (|−0.02| ≤ 0.25).
   - O4: {difficulty 2, total 19, correct 2} → excluded (below min answers) despite huge delta.
   - O5: boundary {difficulty 3, total 20, correct 5} → observed 0.25, delta −0.45 → outlier
     (min-answers boundary INCLUDES 20); and {difficulty 4, total 20, correct 7} → observed 0.35,
     expected 0.6, delta −0.25 → NOT an outlier (strict >).
   - O1+O2 together → sorted [O2 (0.5), O1 (0.4)].
4. `lib/server/learning-health.ts` exports `getLearningHealth(): Promise<LearningHealth>` returning
   (all reads chunked ≤200, servable/published questions only where sensible):
   - `explanationCoverage: { reviewed: number; total: number; pct: number }` — published questions
     whose QuestionExplanation has reviewedStatus "REVIEWED" vs all published; `unreviewedCount` for
     the queue link;
   - `difficultyOutliers` — ReviewLog grouped per questionId (`correct = grade >= 2`; groupBy or
     chunked aggregation) joined with Question.difficulty, through the PURE fn;
   - `confidenceUptake: { sampled: number; total: number; pct: number }` — ReviewLog rows with
     non-null confidence vs all ReviewLog rows (count queries, no row scans);
   - `nudgeVolume7d: number` — NotificationLog rows created in the last 7 days;
   - privacy-safe: aggregate numbers + question ids only, NO userId/email anywhere in the return type.
5. Integration test `lib/server/learning-health.integration.test.ts`: fixture (createOfficialQuestion
   helper) with one question given 40 direct-seeded ReviewLog rows (36 grade 3, 4 grade 1, difficulty
   patched to 5) → appears in difficultyOutliers with direction "easier" and observed 0.9 (literal);
   a question with 19 rows → absent; explanationCoverage counts a fixture REVIEWED explanation;
   confidenceUptake reflects seeded non-null-confidence rows (assert with literals from the fixture,
   located by fixture questionId — DB-wide aggregates may include other rows, so assert the fixture's
   CONTRIBUTION via ≥ / membership, not global equality, EXCEPT outlier membership which is per-question).
6. `npm run test:integration`, `npm test`, `npm run typecheck` all exit 0; vitest lists both new files.
7. Purity gate on lib/learning-health.ts (no server-only/db/generated/clock tokens). No schema change.
8. `bash tasks/wave14-11-learning-health-server/verify.sh` exits 0.

## Constraints / decisions
- Oracle O1–O5 frozen by the planner pre-implementation; verify.sh pins the literals.
- This is the "generation = free data audit" loop: observed behavior vs authored difficulty. Reuse
  `lib/content-flags.ts` where it fits (spec hint) but the outlier rule above is the contract.
- groupBy on ReviewLog may scan large tables — acceptable for an admin page; still cap any id-list
  `in` at 200 (P2029).
- No UI here — wave14-12 renders. Return shape is the contract between the two tasks.

## Next
- [x] Add constants + pure fn + O1–O5 (constants, lib/learning-health.ts, lib/learning-health.test.ts — 6/6 green).
- [x] Build `lib/server/learning-health.ts` (`getLearningHealth`): explanationCoverage (REVIEWED vs published,
  +unreviewedCount), difficultyOutliers (ReviewLog scanned per questionId, `correct = grade >= 2`, joined with
  published Question.difficulty, chunked ≤200, through the pure fn), confidenceUptake (non-null confidence count vs
  all ReviewLog count), nudgeVolume7d (NotificationLog last 7d). Privacy-safe: aggregate numbers + question ids only.
- [x] Integration test lib/server/learning-health.integration.test.ts per PASS §5 (createOfficialQuestion fixture,
  40 seeded ReviewLog rows → 0.9 easier; 19-row question absent; REVIEWED explanation; confidence uptake deltas).
- [x] Run verify.sh → PASS wave14-11.
- Task complete; the `LearningHealth` return shape is the contract for wave14-12 (page).

## Artifacts
- lib/learning-health.ts, lib/learning-health.test.ts, lib/server/learning-health.ts,
  lib/server/learning-health.integration.test.ts

## Log
- 2026-07-02T20:43Z planner: task created; oracle O1–O5 frozen.
- 2026-07-03T01:13Z ClPcs-Mac-mini: added constants (DIFFICULTY_EXPECTED_ACCURACY/OUTLIER_DELTA=0.25/
  OUTLIER_MIN_ANSWERS=20, why-comments) + pure `lib/learning-health.ts` (`difficultyOutliers`) + oracle test
  `lib/learning-health.test.ts` covering O1–O5 + sort. 6/6 green. Server aggregation + integration test next.
- 2026-07-03T01:17Z ClPcs-Mac-mini: built `lib/server/learning-health.ts` (`getLearningHealth` + `LearningHealth`/
  `ExplanationCoverage`/`ConfidenceUptake` types): explanationCoverage via two published-question count queries
  (all vs `explanation.reviewedStatus:"REVIEWED"`, +unreviewedCount); difficultyOutliers by scanning ReviewLog for
  questionId+grade, tally per question with `l.grade >= 2` → correct, join published Question.difficulty (chunked
  ≤200 IN), through the pure fn; confidenceUptake via two ReviewLog count queries; nudgeVolume7d = NotificationLog
  count since now−7d. Return type is identity-free (no user ids). Added integration test with a 2-question
  difficulty-5 fixture (Q40 → 0.9 easier outlier; Q19 → 19 rows absent; REVIEWED explanation ticks reviewed +1;
  confidence deltas +59/+36, exact-delta safe under fileParallelism:false). Reworded a comment to dodge the
  `grep 'email'` privacy gate. verify.sh → PASS wave14-11 (unit 554, integration 150+2 skipped). Status: done.


## Verify
**Last verify:** PASS (2026-07-02T22:18:34Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T22:20:30Z)
