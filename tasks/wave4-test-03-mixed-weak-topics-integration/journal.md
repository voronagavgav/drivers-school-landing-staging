# Task: wave4-test-03-mixed-weak-topics-integration

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Spec A, case 2: `MIXED_PRACTICE` prioritises WEAK topics — weak-topic questions are selected ahead of
strong-topic ones. Real-DB integration test. Depends on task 01 Findings (the deterministic band
guarantee in `prioritizeWeakTopics`).

1. New file `lib/server/mixed-weak-topics.integration.test.ts` exists, imports `startSession`,
   `submitAnswer`, `finishSession` from `@/lib/server/test-engine`, `computeWeakTopicIds` from
   `@/lib/server/progress`, and `prisma` from `@/lib/db`.
2. `beforeAll` creates a dedicated throwaway `Category`, two throwaway `Topic`s (WEAK and STRONG), and
   published questions under each (each `isActive/isPublished`, `archivedAt: null`, ≥2 options exactly
   one correct): at least `WEAK_TOPIC_MIN_ANSWERS` (=4) questions in WEAK and ≥4 in STRONG. Keep the
   TOTAL published count ≤ `DEFAULT_PRACTICE_QUESTION_COUNT` so the MIXED selection slices nothing.
   Creates a throwaway `User` (`Date.now()` email, `selectedCategoryId` = the throwaway category).
3. The test first makes the WEAK topic actually weak for this user: it drives ≥4 answered questions in
   WEAK at accuracy `< WEAK_TOPIC_ACCURACY_THRESHOLD` (=0.6) and ≥4 in STRONG at high accuracy
   (e.g. all correct) via real sessions (`startSession`→`submitAnswer`→`finishSession`), scoped to the
   throwaway category. It then asserts `computeWeakTopicIds(userId, categoryId)` INCLUDES the WEAK
   topic id and EXCLUDES the STRONG topic id.
4. The test starts a fresh `MIXED_PRACTICE` session on the throwaway category, reads its
   `testSessionQuestion` rows joined to each question's `topicId`, and asserts the WEAK band leads:
   every WEAK-topic question has a strictly smaller `displayOrder` than every STRONG-topic question
   (i.e. `max(displayOrder of WEAK) < min(displayOrder of STRONG)`). (Order WITHIN a band is shuffled;
   do NOT assert exact positions.)
5. `afterAll` deletes the throwaway User FIRST, then questions/options/topics/category — seeded DB
   unchanged. Running the suite twice in a row passes.
6. `npm run test:integration` exits 0 and includes `mixed-weak-topics.integration.test.ts`.
7. `npm run typecheck` exits 0.

## Constraints / decisions
- Use a DEDICATED throwaway category so only the two throwaway topics are in the pool — keeps the band
  assertion deterministic regardless of seeded content.
- Assert by BAND (all weak before all strong), never exact order — `prioritizeWeakTopics` shuffles
  within each band using real `Math.random` at the DB layer (no injectable rng in `startSession`). Keep
  the pool ≤ count so the slice can't drop weak questions.
- Test only — do NOT modify the engine, selection, or schema. If MIXED does NOT front-load weak topics,
  set this task `blocked` with a note (do not weaken the assertion). HIGH-STAKES (`Evaluate: yes`)
  because a green-but-wrong test here would hide a real selection regression.
- Non-Goal: testing TOPIC_PRACTICE/EXAM ordering or the readiness number — only the weak-first ordering.

## Plan
- [x] Seed throwaway category + WEAK/STRONG topics + questions + user in `beforeAll`.
- [x] Make WEAK weak via real answered sessions; assert `computeWeakTopicIds` returns it (not STRONG).
- [x] Start MIXED_PRACTICE; assert weak band fully precedes strong band by `displayOrder`.
- [x] Tear down (User first); run integration + typecheck; run verify.sh.

## Done
- [x] Authored `lib/server/mixed-weak-topics.integration.test.ts`: throwaway category + WEAK/STRONG
  topics (5 published questions each, total 10 ≤ DEFAULT_PRACTICE_QUESTION_COUNT) + throwaway user.
  Drives a TOPIC_PRACTICE session per topic (WEAK all-wrong, STRONG all-correct), asserts
  `computeWeakTopicIds` includes WEAK / excludes STRONG, then starts a MIXED_PRACTICE session and
  asserts the weak band fully precedes the strong band (`max(weak displayOrder) < min(strong)`).
  verify.sh PASS (typecheck + integration: 6 files / 15 tests); re-running the file alone passes too.

## Next
- [ ] (none — Goal met; verify.sh passes.)

## Artifacts
- lib/server/mixed-weak-topics.integration.test.ts — MIXED weak-topic prioritisation proof.
- tasks/wave4-test-03-mixed-weak-topics-integration/verify.sh — integration run + inclusion + typecheck.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T19:05Z ClPcs-Mac-mini: authored `lib/server/mixed-weak-topics.integration.test.ts`
  (modeled on `exam-short-pool.integration.test.ts`). Dedicated throwaway Category whose whole
  published pool is exactly 5 WEAK + 5 STRONG questions; `practiceTopic` helper drives a real
  TOPIC_PRACTICE session per topic (WEAK all-wrong → 0% < 0.6, STRONG all-correct → 100%) via
  startSession→submitAnswer→finishSession. Asserts `computeWeakTopicIds` includes WEAK / excludes
  STRONG, then a fresh MIXED_PRACTICE session has all 10 questions (no slice) with the weak band
  strictly ahead of the strong band by `displayOrder`. Teardown deletes User first, then
  questions/topics/category. verify.sh PASS (typecheck clean; integration 6 files / 15 tests).
  Status → done.

## Verify
**Last verify:** PASS (2026-06-17T16:06:50Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T16:07:40Z)
