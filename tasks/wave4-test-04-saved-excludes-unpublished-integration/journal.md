# Task: wave4-test-04-saved-excludes-unpublished-integration

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Spec A, case 3: `SAVED_QUESTIONS` excludes questions that were later UNPUBLISHED or ARCHIVED. Real-DB
integration test. Depends on task 01 Findings (the `isActive && isPublished && archivedAt === null`
filter in `startSession`'s SAVED branch).

1. New file `lib/server/saved-excludes-unpublished.integration.test.ts` exists, imports `startSession`
   from `@/lib/server/test-engine` and `prisma` from `@/lib/db`.
2. `beforeAll` creates a throwaway `User` (`Date.now()` email, category B) and THREE throwaway
   published questions (each ≥2 options exactly one correct) under the seeded `Category code "B"`:
   Q_OK (stays published/active/un-archived), Q_UNPUB, Q_ARCH. It creates a `SavedQuestion` row linking
   the user to ALL THREE.
3. The test then UNPUBLISHES Q_UNPUB (`isPublished: false`) and ARCHIVES Q_ARCH
   (`archivedAt: new Date()`), leaving Q_OK intact.
4. It starts a `SAVED_QUESTIONS` session for the user, reads the session's `testSessionQuestion` rows
   (joined to `questionId`), and asserts: Q_OK's id IS present, while Q_UNPUB's and Q_ARCH's ids are
   NOT present. (`session.totalQuestions` counts only the surviving saved questions.)
5. As a guard against the test passing for the wrong reason, it also asserts there are exactly 3
   `SavedQuestion` rows for the user (the unpublish/archive did NOT delete the save rows — they are just
   filtered out of the pool).
6. `afterAll` deletes the throwaway User FIRST, then the three throwaway Questions/Options — seeded DB
   unchanged. Running the suite twice in a row passes.
7. `npm run test:integration` exits 0 and includes `saved-excludes-unpublished.integration.test.ts`.
8. `npm run typecheck` exits 0.

## Constraints / decisions
- The three questions can live under the seeded category "B" (the SAVED pool is keyed by the user's
  `SavedQuestion` rows, not by category — task 01 Findings confirm SAVED is not category-scoped), so no
  throwaway category is required here.
- If `startSession("SAVED_QUESTIONS")` would throw `NoQuestionsError` when the surviving pool is
  non-empty (it shouldn't, Q_OK survives), treat that as a real failure → set task `blocked`.
- Test only — do NOT modify the engine or schema. Clean up in `afterAll` in the cascade-safe order.
- File MUST be `*.integration.test.ts`. Non-Goal: testing the save/unsave toggle action or its UI.

## Plan
- [x] Create user + 3 published questions; save all 3.
- [x] Unpublish one, archive another; start SAVED_QUESTIONS; assert only Q_OK is in the session and the
  3 save rows still exist.
- [x] Tear down (User first); run integration + typecheck; run verify.sh.

## Done
- [x] Authored `lib/server/saved-excludes-unpublished.integration.test.ts`: beforeAll creates a
  throwaway Topic + 3 published questions (Q_OK/Q_UNPUB/Q_ARCH) under seeded Category "B", a
  `Date.now()`-keyed user, and `SavedQuestion` rows for all three. The test unpublishes Q_UNPUB and
  archives Q_ARCH, starts a `SAVED_QUESTIONS` session, and asserts `totalQuestions === 1`, Q_OK is in
  the pool while Q_UNPUB/Q_ARCH are not, and exactly 3 `SavedQuestion` rows survive. afterAll deletes
  User → Questions → Topic. verify.sh PASSES (typecheck clean, 7 files/16 tests pass, file included);
  running the new file twice in a row passes (clean idempotent teardown).

## Next
- [ ] (none — Goal met; verify.sh passes.)

## Artifacts
- lib/server/saved-excludes-unpublished.integration.test.ts — SAVED exclusion proof.
- tasks/wave4-test-04-saved-excludes-unpublished-integration/verify.sh — integration run + inclusion + typecheck.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T19:09Z ClPcs-Mac-mini: authored `lib/server/saved-excludes-unpublished.integration.test.ts`
  (mirrors `exam-short-pool.integration.test.ts` style). verify.sh PASS — typecheck clean, integration
  suite 7 files/16 tests pass, file runs under the integration config. New file passes twice in a row
  (idempotent teardown: User→Questions→Topic). Status → done.

## Verify
**Last verify:** PASS (2026-06-17T16:09:35Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T16:11:03Z)
