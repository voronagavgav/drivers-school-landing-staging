# Task: wave20-05-server-wiring

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** laptop

Wire the pure layer into the production write path (spec Deliverable 4). Thread `optionCount` through
`submitAnswer → recordReview → deriveGrade/gradePosterior`, and route WRONG answers' applied memory
state through `slipAdjustedLapse` while keeping the LOGGED grade = the true Again(1). Bump
`REVIEW_ENGINE_VERSION → "fsrs6-bkt2"` and update the integration pin in the SAME task.

## Goal
PASS = ALL true:

1. `RecordReviewParams` (`lib/server/study.ts`) gains an optional `optionCount?: number`.
2. `submitAnswer` (`lib/server/test-engine.ts`) passes `optionCount: question.options.length` into the
   `recordReview` call (options already loaded at the `include: { options: true }` fetch — ZERO extra
   DB reads). Queue-driven `study.ts` start*/session flows pass `optionCount` where options are loaded,
   else omit it (default preserves today's 4-option behavior).
3. In `recordReview`: `deriveGrade`/`gradePosterior` receive `optionCount` (so the honest guess floor
   applies to CORRECT grading), and the logged `grade` for a wrong answer is STILL `1` (Again) — no
   Hard-on-wrong is ever fed or logged (`ReviewLog.grade` = the true outcome; `correct ⟺ grade≥2`
   preserved; NO migration).
4. For a WRONG answer on a card WITH history, the persisted `ReviewState` is the `slipAdjustedLapse`
   result: `pi = gradePosterior({correct:false, priorKnow: retrievability(prior,now), optionCount})`,
   applied state = `slipAdjustedLapse(prior, pi, now)`. The Again branch's state/lapses/difficulty are
   preserved; only stability/dueAt are the log-blend. A wrong on a fresh `new` card (no history) keeps
   today's behavior (schedule's new/Again path — the crush defect never applied to new cards).
5. CORRECT answers and the log-only / replay guards are UNCHANGED from today (still route through
   `schedule`); `lastGrade` stays the TRUE grade.
6. `REVIEW_ENGINE_VERSION = "fsrs6-bkt2"` in `lib/fsrs/constants.ts`, written at the ReviewLog create,
   and `lib/server/srs-review.integration.test.ts`'s pin updated from `"fsrs6-bkt1"` to `"fsrs6-bkt2"`
   in THIS task (conscious semantics-boundary bump).
7. `npm run -s typecheck` exits 0; `npm run -s test` exits 0; `npm run -s db:seed` then
   `npm run -s test:integration --` (config `vitest.integration.config.ts`) exits 0 — including the
   existing `srs-review.integration.test.ts` (now expecting `"fsrs6-bkt2"`) and
   `grade-inference.integration.test.ts`.

## Constraints / decisions
- PRODUCTION-PATH: the wrong-answer routing must live in `recordReview` (the fn `submitAnswer` actually
  calls in the transaction), so the real answer path — not a helper — gets the slip-adjusted lapse.
- Keep `recordReview` composable inside the caller's interactive `$transaction`: route ALL reads/writes
  through the passed `tx` (the existing pattern) — do not add a module-global `prisma` read (deadlock
  risk, see root CLAUDE.md).
- `priorKnow` stays `retrievability(prior, now)` for cards with `lastReviewedAt`, else 0.5 — UNCHANGED
  from today; only `optionCount` is newly threaded and the wrong-answer state now uses `slipAdjustedLapse`.
- Grade/ReviewLog semantics: wrong stays grade 1 in BOTH `deriveGrade` and the logged row — no
  `ReviewLog.correct` column, no migration (log-true-grade preserves the invariant).
- Do NOT change `schedule`, the readiness dial, thresholds, or weights.

## Next
- [x] Add `optionCount?` to `RecordReviewParams`; pass `question.options.length` in `submitAnswer`;
      in `recordReview` compute `pi` for wrong answers and route state through `slipAdjustedLapse`; bump
      the engine tag + integration pin; run typecheck/test/seed+integration.
- All Goal criteria met; task done. Follow-on wave20-06/07/08 own the direction gates + integration proof.

## Artifacts
- `lib/server/study.ts` — `RecordReviewParams.optionCount?`; `recordReview` threads `optionCount` into
  `deriveGrade`, and routes wrong-answer-with-history state through `slipAdjustedLapse(prior, pi, now)`
  where `pi = gradePosterior({correct:false, priorKnow, optionCount})`. logOnly/new-card/correct → `schedule` (unchanged).
- `lib/server/test-engine.ts` — `submitAnswer` passes `optionCount: question.options.length` (zero extra reads).
- `lib/fsrs/constants.ts` — `REVIEW_ENGINE_VERSION = "fsrs6-bkt2"`.
- `lib/server/srs-review.integration.test.ts` — engine pin → `"fsrs6-bkt2"`; fixture now 4-option.
- `lib/server/wave11-review-fixes.integration.test.ts` — fixture now 4-option (guess floor g=0.25).

## Log
- 2026-07-14 laptop: planned by the wave20 planner.
- 2026-07-14 ClPcs-Mac-mini: wired the pure layer into the production write path. Added `optionCount?`
  to `RecordReviewParams`; `submitAnswer` passes `question.options.length`; `recordReview` threads it
  into `deriveGrade`/`gradePosterior` and routes WRONG-on-card-with-history state through
  `slipAdjustedLapse` (logged grade stays true Again(1); new-card/correct/log-only keep `schedule`).
  Bumped `REVIEW_ENGINE_VERSION`→"fsrs6-bkt2" + the integration pin. Threading the REAL optionCount
  broke two integration tests that asserted a fresh-correct = Good(3) on the createOfficialQuestion
  2-option default (g=0.45 → π=0.6667 → Hard(2)); fixed by making both fixtures 4-option (real ПДР,
  g=0.25 → Good(3)) — the tests' documented intent, NOT an oracle edit. Green: typecheck 0, `npm test`
  743, db:seed + full `test:integration` 275/275.

## Verify
**Last verify:** PASS (2026-07-13T23:02:29Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T23:09:16Z)
