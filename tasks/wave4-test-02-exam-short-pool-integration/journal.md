# Task: wave4-test-02-exam-short-pool-integration

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** ClPcs-Mac-mini

## Goal
Spec A, case 1: an EXAM_SIMULATION whose published pool has FEWER questions than
`DEFAULT_EXAM_QUESTION_COUNT` (=20) runs SHORT but completes correctly. Real-DB integration test.
Depends on task 01 Findings.

1. New file `lib/server/exam-short-pool.integration.test.ts` exists, imports `startSession`,
   `submitAnswer`, `finishSession` from `@/lib/server/test-engine` and `prisma` from `@/lib/db`.
2. `beforeAll` creates throwaway data under the seeded `Category code "B"`: one throwaway `Topic` and
   exactly N published questions (each `isActive: true, isPublished: true, archivedAt: null`, each with
   ≥2 options exactly one `isCorrect: true`), where N is strictly LESS than `DEFAULT_EXAM_QUESTION_COUNT`
   (use N=5). Also creates a throwaway `User` (role USER, `selectedCategoryId` = category B), keyed by
   `Date.now()`.
3. The test starts an `EXAM_SIMULATION` scoped so ONLY those N throwaway questions are eligible (e.g. a
   throwaway Category created for this test so the seeded category's questions don't dilute the pool —
   OR otherwise guarantee the pool is exactly N; see Constraints), asserts the created session's
   `totalQuestions === N` (`N < DEFAULT_EXAM_QUESTION_COUNT`), and that
   `prisma.testSessionQuestion.count({ where:{ testSessionId } }) === N`.
4. It answers all N questions, calls `finishSession`, and asserts the returned `total === N`,
   `correct + wrong === N`, `result` is one of `"PASSED" | "FAILED"` (not null), and the persisted
   `TestSession.status === "COMPLETED"` with `correctAnswers + wrongAnswers === N`.
5. `afterAll` deletes the throwaway User FIRST, then the throwaway Questions/Options/Topic/Category, so
   the seeded DB is left unchanged (no leftover rows). Re-running the suite twice in a row passes.
6. `npm run test:integration` exits 0 and the run includes `exam-short-pool.integration.test.ts`.
7. `npm run typecheck` exits 0.

## Constraints / decisions
- To make the pool deterministically EXACTLY N, create a DEDICATED throwaway `Category` for this test
  (not seeded "B") and attach the N questions to it via the `categories` relation, then start the exam
  with that `categoryId`. This avoids depending on how many questions the seeded category has. (Task 01
  Findings document the category/question relation shape — follow it.)
- Test only — do NOT modify `lib/server/test-engine.ts` or the schema. If a criterion fails because the
  ENGINE is wrong (e.g. it pads a short pool or throws), set this task `blocked` with a note rather than
  weakening the test.
- File MUST be named `*.integration.test.ts` (runs under `vitest.integration.config.ts`, excluded from
  fast `npm test`). Clean up in `afterAll` in the cascade-safe order from CLAUDE.md.
- Non-Goal: asserting any "short exam" UI notice (that is a separate concern, not in this wave's A).

## Plan
- [x] Build throwaway Category + Topic + N(=5) published questions/options + User in `beforeAll`.
- [x] Start EXAM_SIMULATION on that category; assert totalQuestions === N; answer all; finish; assert
  result + counts.
- [x] Tear everything down in `afterAll` (User first); run `npm run test:integration` + typecheck; run verify.sh.

## Done
- [x] Authored `lib/server/exam-short-pool.integration.test.ts`: dedicated throwaway Category (code
  `W4-<Date.now()>`) + Topic + N=5 published questions (2 opts, one correct) + throwaway User
  (selectedCategoryId = seeded "B"). Starts EXAM_SIMULATION scoped to the throwaway category; asserts
  `totalQuestions === 5`, `5 < DEFAULT_EXAM_QUESTION_COUNT`, `testSessionQuestion.count === 5`; answers
  all; `finishSession` → `total === 5`, `correct + wrong === 5`, `result ∈ {PASSED,FAILED}`; session
  `COMPLETED` with `correctAnswers + wrongAnswers === 5`. afterAll tears down User→Questions→Topic→
  Category. Verified: file passes in isolation, full `npm run test:integration` = 5 files/14 tests pass,
  `npm run typecheck` exits 0, and the file appears in `vitest list --config vitest.integration.config.ts`.

## Next
- [ ] (none — Goal met; driver re-runs verify.sh.)

## Artifacts
- lib/server/exam-short-pool.integration.test.ts — short-exam edge-case proof.
- tasks/wave4-test-02-exam-short-pool-integration/verify.sh — integration run + inclusion + typecheck.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T19:01Z ClPcs-Mac-mini: Read task-01 Findings (§4 short-pool caveat, §6 throwaway recipe)
  and `engine.integration.test.ts` for style. Authored `lib/server/exam-short-pool.integration.test.ts`
  (dedicated throwaway Category for a deterministic N=5 pool, per Constraints). Ran it in isolation
  (1 passed), full integration suite (5 files / 14 tests passed), `npm run typecheck` (exit 0), and
  confirmed inclusion via `vitest list --config vitest.integration.config.ts`. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T16:02:10Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T16:03:29Z)
