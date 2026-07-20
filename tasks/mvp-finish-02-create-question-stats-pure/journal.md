# Task: mvp-finish-02-create-question-stats-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Create the PURE per-question performance summarizer (Part A core logic). No DB, no tests here
(tests land in task 03).

1. A NEW file `lib/question-stats.ts` exists and exports a function
   `summarizeQuestionPerformance` whose primary signature accepts
   `rows: { questionId: string; isCorrect: boolean }[]` and returns an array of
   `{ questionId: string; timesAnswered: number; correct: number; accuracy: number }`.
2. For each distinct `questionId` in `rows`, `timesAnswered` = number of rows for it,
   `correct` = rows where `isCorrect === true`, `accuracy` = `correct / timesAnswered` in 0..1.
   When `timesAnswered === 0` the accuracy is `0` (NO divide-by-zero / no NaN).
3. The result is sorted HARDEST-FIRST: ascending by `accuracy`; ties broken by `timesAnswered`
   DESCENDING (more-answered first). Sort is deterministic.
4. Never-answered questions are supported via an OPTIONAL second parameter
   `questionIds?: string[]` (the universe of question ids to report on): any id present in
   `questionIds` but absent from `rows` is emitted with `timesAnswered: 0, correct: 0, accuracy: 0`.
   When `questionIds` is omitted, only questions appearing in `rows` are returned.
5. The function is PURE: it MUST NOT mutate its input (`rows` or `questionIds`), performs no I/O,
   and `lib/question-stats.ts` imports NO DB/server module (no `@/lib/db`, `server-only`,
   `@prisma/client`, or `lib/generated`). A type-only import from `@/lib/constants` is allowed but
   not required.
6. An exported TypeScript interface (e.g. `QuestionPerformance`) describes the returned entry shape.
7. `npm run typecheck` exits 0. `npm test` still passes (count unchanged from baseline — no new
   tests in this task).

## Constraints / decisions
- ONLY create `lib/question-stats.ts`. Do NOT add tests (task 03), do NOT touch the DB/server layer
  (task 04), the admin UI (task 05), or `prisma/schema.prisma`.
- Match the existing pure-lib style of `lib/progress.ts`: named `export function`, a `/** */` JSDoc
  one-liner, an exported `interface` for the row/result shapes. Mirror `accuracyOf`'s guard
  (`total <= 0 ? 0 : correct / total`) for the divide-by-zero rule.
- Compute on COPIES (e.g. build a `Map`, then `[...map.values()].sort(...)`); do not `.sort()` the
  caller's `rows` array in place.
- Tie-break is by `timesAnswered` descending only (the spec's "most-answered"); leave `questionId`
  order otherwise unspecified — do not invent extra ordering keys.
- Non-Goal: any aggregation from real DB rows, joining question text/topic, or UI. The optional
  `questionIds` arg exists so the admin helper CAN include never-answered questions and so task 03
  can test the 0-answers case — task 04 decides whether to pass it.

## Plan
- [x] Write `lib/question-stats.ts`: `QuestionPerformance` interface + `summarizeQuestionPerformance`.
- [x] Reduce rows into a `Map<questionId,{timesAnswered,correct}>`; seed map from `questionIds` (if given).
- [x] Map to entries with guarded accuracy; sort accuracy asc, then timesAnswered desc.
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] Created `lib/question-stats.ts` with `QuestionPerformance` interface + pure `summarizeQuestionPerformance`
      (Map seeded from optional `questionIds`, guarded accuracy, sort accuracy asc / timesAnswered desc).
- [x] Fixed verify.sh smoke (wrote tsx file to repo root, not /tmp, so `./lib/...` import resolves).
- [x] verify.sh PASSes: SMOKE OK, typecheck exit 0, 33 tests / 4 files green.

## Next
- [ ] None — goal met. Follow-up handled by task mvp-finish-03 (add `lib/question-stats.test.ts`).

## Artifacts
- tasks/mvp-finish-02-create-question-stats-pure/verify.sh — export + purity + behavior smoke + typecheck/test
- lib/question-stats.ts — pure summarizer

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T09:13Z ClPcs-Mac-mini: wrote `lib/question-stats.ts` (`QuestionPerformance` + pure
  `summarizeQuestionPerformance`); matched `lib/progress.ts` style and `accuracyOf`'s divide-by-zero
  guard. Fixed verify.sh smoke import bug (/tmp file imported `./lib/...` → unresolvable; now writes
  the smoke at repo-root cwd). Ran verify.sh: PASS (SMOKE OK, typecheck 0, 33 tests/4 files). Status→done.

## Verify
**Last verify:** PASS (2026-06-17T06:14:31Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T06:15:57Z)
