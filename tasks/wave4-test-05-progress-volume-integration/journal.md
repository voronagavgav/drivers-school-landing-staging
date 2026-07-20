# Task: wave4-test-05-progress-volume-integration

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Spec B: seed MANY answers across topics/sessions for one user and assert `computeProgress` totals,
per-topic accuracy, weak-topic detection, and readiness are correct AND stable. Real-DB integration
test. Depends on task 01 Findings (thresholds: `WEAK_TOPIC_MIN_ANSWERS`=4,
`WEAK_TOPIC_ACCURACY_THRESHOLD`=0.6, `READINESS_MIN_ANSWERS`=20).

1. New file `lib/server/progress-volume.integration.test.ts` exists, imports `computeProgress` from
   `@/lib/server/progress` and `prisma` from `@/lib/db`.
2. `beforeAll` creates a dedicated throwaway `Category`, ≥3 throwaway `Topic`s, and published
   questions, then seeds a KNOWN distribution of answers for one throwaway `User` across MULTIPLE
   completed `TestSession`s — enough that `uniqueAnswered >= READINESS_MIN_ANSWERS` (≥20 distinct
   questions) and at least one topic is deliberately weak (≥4 answers, accuracy < 0.6) and at least one
   topic is deliberately strong (≥4 answers, accuracy ≥ 0.6). The exact correct/total per topic is
   hard-coded in the test so expected values are computable.
3. The test calls `computeProgress(userId, categoryId)` and asserts, against the hard-coded
   distribution: `totalAnswered` equals the total answer count; `correct`/`wrong` match; `accuracy`
   equals `correct/totalAnswered` (within a small epsilon); `uniqueAnswered` equals the distinct
   question count; `completedSessions` equals the number of completed sessions seeded.
4. It asserts `topicStats` contains one entry per seeded topic with the EXACT `answered`/`correct`
   counts and `accuracy` matching the hard-coded numbers, and that `weakTopics` contains the
   deliberately-weak topic id and NOT the deliberately-strong topic id.
5. It asserts `readiness.level` is NOT `"NOT_ENOUGH_DATA"` (because `uniqueAnswered >= 20`) and
   `readiness.score` is an integer in `0..100`.
6. STABILITY: it calls `computeProgress` a SECOND time with the same args and asserts the result deep-
   equals the first call (totals, topicStats, weakTopics, readiness all identical) — proving the
   aggregation is a pure, deterministic read.
7. `afterAll` deletes the throwaway User FIRST, then questions/options/topics/category — seeded DB
   unchanged. Running the suite twice in a row passes.
8. `npm run test:integration` exits 0 and includes `progress-volume.integration.test.ts`;
   `npm run typecheck` exits 0.

## Constraints / decisions
- Use a DEDICATED throwaway category so seeded content does not perturb the totals/weak-topic math —
  expected values must be exactly computable from what this test seeds.
- Seed answers by creating `TestSession` (status COMPLETED) + `TestAnswer` rows directly via prisma (or
  by driving `startSession`/`submitAnswer`/`finishSession`); whichever task 01 Findings show is
  simplest. `TestAnswer.isCorrect` must match the intended per-topic accuracy. Ensure ≥20 DISTINCT
  questions are answered so readiness is estimated.
- Test only — do NOT modify `lib/server/progress.ts`, `lib/progress.ts`, or the schema. If a computed
  value disagrees with the hard-coded expectation because the AGGREGATION is wrong, set this task
  `blocked` with a note. HIGH-STAKES (`Evaluate: yes`): the whole point is catching aggregation drift,
  so a green-but-wrong test is worse than none.
- Non-Goal: testing the dashboard rendering, the sparkline/trend, or snapshot persistence.

## Plan
- [x] Seed throwaway category/topics/questions + a known answer distribution across ≥2 sessions.
- [x] Assert totals/accuracy/uniqueAnswered/completedSessions/topicStats/weakTopics/readiness.
- [x] Call `computeProgress` twice; assert identical (stability).
- [x] Tear down (User first); run integration + typecheck; run verify.sh.

## Done
- [x] Authored `lib/server/progress-volume.integration.test.ts`: dedicated throwaway Category + 3
  Topics (WEAK/STRONG/MID) + 21 published questions; seeded a hard-coded answer distribution across
  3 COMPLETED sessions (+1 IN_PROGRESS, no answers) directly via `TestSession`+`TestAnswer` rows.
  Asserts literal totals (22 answered / 16 correct / 6 wrong / 21 unique / 3 completed), exact
  per-topic `topicStats`, `weakTopics` = {WEAK only}, readiness estimated (not NOT_ENOUGH_DATA,
  integer score 0..100), and stability (two calls deep-equal). verify.sh PASS (typecheck 0,
  18 integration tests pass, file runs under the integration config).

## Next
- [ ] (none — Goal met; verify.sh PASS.)

## Artifacts
- lib/server/progress-volume.integration.test.ts — progress-at-volume correctness + stability proof.
- tasks/wave4-test-05-progress-volume-integration/verify.sh — integration run + inclusion + typecheck.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T19:14Z ClPcs-Mac-mini: authored `lib/server/progress-volume.integration.test.ts`
  (mirrors `mixed-weak-topics.integration.test.ts` style). Seeded answers directly as
  `TestSession`(COMPLETED)+`TestAnswer` rows for exact control of isCorrect; repeated WEAK q0 in a
  second session so totalAnswered(22) > uniqueAnswered(21); added an IN_PROGRESS session to prove
  `completedSessions` counts COMPLETED only. Hard-coded all expected literals (no derive-from-seed)
  per the high-stakes constraint. Ran verify.sh → PASS (typecheck clean; 8 files / 18 tests pass;
  file included under vitest.integration.config.ts). Status → done.

## Verify
**Last verify:** PASS (2026-06-17T16:15:26Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T16:17:12Z)
