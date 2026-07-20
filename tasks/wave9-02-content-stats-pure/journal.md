# Task: wave9-02-content-stats-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §A — PURE per-question rich stats. Add `lib/content-stats.ts` + `lib/content-stats.test.ts`.
PASS = ALL true:

1. `lib/content-stats.ts` exists and exports `summarizeQuestion` (a function) that takes ONE question's
   answer rows `{ optionKey: string; isCorrect: boolean; timeSpentSeconds: number | null }[]` and returns
   `{ timesAnswered: number; correct: number; accuracy: number; avgTimeSeconds: number;
   options: { optionKey: string; picks: number; isCorrect: boolean; pickRate: number }[] }`.
2. PURITY: `lib/content-stats.ts` contains NONE of these tokens anywhere (incl. comments):
   `server-only`, `@/lib/db`, `@prisma/client`, `lib/generated`, `Math.random`, `Date.now`, `new Date`.
   (Importing the already-pure `./question-stats` is allowed and expected — reuse
   `summarizeQuestionPerformance` for accuracy where natural; do not re-derive accuracy logic.)
3. SHAPE/DETERMINISM (provable via the unit test + a tsx smoke):
   - empty rows → `{ timesAnswered: 0, correct: 0, accuracy: 0, avgTimeSeconds: 0, options: [] }`;
   - `accuracy = correct / timesAnswered` (0 when none answered);
   - `avgTimeSeconds` = mean of the present (non-null) `timeSpentSeconds` samples, and `0` when there are
     no samples (0-sample → 0);
   - each option's `picks` = number of rows that picked that `optionKey`; `pickRate = picks/timesAnswered`;
     the `pickRate` values SUM to 1 (±1e-9) whenever `timesAnswered > 0`;
   - an option's `isCorrect` is derived from the rows (a picked option is keyed-correct iff a pick of it
     has `isCorrect: true`).
4. `lib/content-stats.test.ts` exists, is INCLUDED in the unit suite (`npx vitest list` shows it), and
   asserts all of: counts, accuracy, `avgTimeSeconds` 0-sample→0, and pick-rates summing to 1.
5. `npm run typecheck` exits 0.
6. `npm test` exits 0 with ZERO failures.

## Constraints / decisions
- PURE module only — no DB, no React. The DB join (full option set incl. never-picked options) is task
  04's job; this function summarizes whatever rows it is GIVEN.
- Reuse `summarizeQuestionPerformance` from `@/lib/question-stats` for the accuracy/counts spine rather
  than duplicating it (spec: "do not duplicate accuracy logic"). Accuracy must match its semantics.
- `avgTimeSeconds` averages ONLY rows with a non-null `timeSpentSeconds`; with no such rows → 0. Rounding
  is the implementer's choice (a plain mean is fine) but must be deterministic.
- Options are derived from the rows present (an option never picked simply does not appear here).
- Non-Goal: flags (task 03), any DB read, sorting/ordering of the question list (task 04).

## Plan
- [x] Write `lib/content-stats.ts`: types + `summarizeQuestion`, composing `summarizeQuestionPerformance`.
- [x] Write `lib/content-stats.test.ts` covering the four cases in Goal items 3/4.
- [x] `npm run typecheck` && `npm test`; confirm inclusion via `npx vitest list`.

## Done
- [x] Implemented pure `summarizeQuestion` (+ `QuestionAnswerRow`/`OptionStat`/`QuestionSummary` types),
      reusing `summarizeQuestionPerformance` for the accuracy/counts spine; added avg-time + per-option
      pick breakdown (first-seen order, keyed-correctness, pickRate).
- [x] Wrote `lib/content-stats.test.ts` (empty→zeros, counts/accuracy/avgTime/pickRate sum-to-1,
      0-sample avgTime→0, no-mutation) — in the unit suite.
- [x] verify.sh GREEN: purity smoke OK, typecheck 0, `npm test` 25 files / 287 tests pass.

## Next
- [ ] (none — Goal met, verify.sh passes)

## Artifacts
- `lib/content-stats.ts` — pure per-question summarizer.
- `lib/content-stats.test.ts` — unit tests.
- `tasks/wave9-02-content-stats-pure/verify.sh` — executable gate.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 ClPcs-Mac-mini: implemented `lib/content-stats.ts` (pure `summarizeQuestion` composing
  `summarizeQuestionPerformance` for accuracy/counts; avg-time over non-null samples → 0 when none;
  per-option picks/isCorrect/pickRate in first-seen order). Added `lib/content-stats.test.ts` mirroring
  `question-stats.test.ts` style. verify.sh fully green (smoke OK, typecheck 0, 287 unit tests pass).
  Status → done.

## Verify
**Last verify:** PASS (2026-06-23T20:55:29Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T20:56:37Z)
