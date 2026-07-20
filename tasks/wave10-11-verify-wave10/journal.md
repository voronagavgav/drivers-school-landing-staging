# Task: wave10-11-verify-wave10

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Spec §H — Wave-10 acceptance gate. VERIFY-ONLY: writes NO feature code. On any failure, record it and reopen
the failing upstream task (set that task's Status back to `active`). PASS = ALL true:

1. `npm run typecheck` exits 0.
2. `npm test` exits 0 with ZERO failures AND the unit suite includes the `lib/fsrs/*`,
   `lib/test-engine/queue.test.ts`, and `lib/readiness-model.test.ts` tests (prove via `npx vitest list`).
3. `npm run db:seed` exits 0, then `npm run test:integration` exits 0 with ZERO failures AND includes
   `srs-review.integration.test.ts` (prove via `npx vitest list --config vitest.integration.config.ts`).
4. `npm run build` exits 0.
5. The 9 learning-state tables (`ReviewState`, `ReviewLog`, `TopicMastery`, `UserStudyProfile`, `StudyDay`,
   `ReadinessSnapshot`, `UserSettings`, `PushSubscription`, `NotificationLog`) and `TestAnswer.confidence`
   exist in the DB, and `git diff <wave base> -- prisma/schema.prisma` is ADDITIVE-only (no removed/changed
   existing scalar lines).
6. STATIC purity + contract: every non-test file in `lib/fsrs/`, plus `lib/test-engine/queue.ts` and
   `lib/readiness-model.ts`, contains none of `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`, and
   no `Math.random`/`Date.now`/`new Date` EXCEPT the single scoped `rng = Math.random` default in `queue.ts`;
   `submitAnswer` still returns the `recorded`/`correctOptionId`/`explanation` feedback shape; re-running
   `importOfficial` changes 0 question/option ids (covered by the green `content-upsert` +
   `srs-review` integration tests, which this gate runs).

## Constraints / decisions
- NO new feature code — this is the wave close. If a check fails, the fix belongs to the OWNING task
  (02 schema, 03/04 fsrs, 05 queue, 06 readiness, 07 mode, 08 recordReview, 09 submitAnswer, 10 test) —
  reopen it; do not patch in-place here.
- Runs against the seeded dev DB; the migration (02) must already be applied. The gate is the real acceptance
  test — do not weaken a check to make it pass.
- Non-Goal: any Wave 11+ scope (adaptive session, readiness snapshot, notifications, PWA, Postgres).

## Plan
- [x] Run typecheck, unit suite (+inclusion), seed, integration suite (+inclusion), build.
- [x] Assert the 9 tables + confidence column exist; assert additive-only schema diff.
- [x] Run the static purity/contract greps.
- [x] If anything fails: log it + set the owning task Status back to `active`. (Nothing failed — no reopen needed.)

## Next
- [x] Run `bash tasks/wave10-11-verify-wave10/verify.sh` and triage any failure to its owning task. — GREEN, all §H-1..6 passed; Wave-10 accepted.

## Log
- 2026-07-01 planner: task authored from specs/wave10-srs-foundation.md §H (final acceptance gate).
- 2026-07-01T20:50Z ClPcs-Mac-mini: Ran `bash tasks/wave10-11-verify-wave10/verify.sh` — ALL GREEN.
  §H-1 typecheck exit 0. §H-2 unit: 31 files / 324 tests passed, `npx vitest list` includes lib/fsrs, queue.test.ts,
  readiness-model.test.ts. §H-3 seed exit 0 (2322 official questions), integration: 20 files / 67 passed + 2 skipped,
  list includes srs-review.integration.test.ts. §H-4 build exit 0. §H-5 all 9 learning-state tables + TestAnswer.confidence
  present in prisma/dev.db, schema.prisma diff vs db1deac additive-only (no removed/changed lines). §H-6 purity/contract greps
  clean; submitAnswer feedback shape (correctOptionId/explanation) intact. Final: "PASS: wave10-11 … acceptance gate GREEN".
  No upstream task reopened. Wave 10 (SRS foundation) accepted. Status → done.

## Verify
**Last verify:** PASS (2026-07-01T17:51:24Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T17:53:26Z)
