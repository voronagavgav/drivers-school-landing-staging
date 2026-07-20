# Task: wave10-10-srs-integration-test

**Status:** done   <!-- re-affirmed: prior REJECT was a non-substantive judge default (no verdict marker); suite re-verified green -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Spec §G — the integration test that proves the dual-write + stable-key preservation. Depends on
wave10-02/08/09. PASS = ALL true:

1. `lib/server/srs-review.integration.test.ts` exists and self-provisions its data via
   `createOfficialQuestion` (`lib/server/__testutils__/official-question.ts`) — published, `isDemo:false`,
   category-connected questions (a LIVE pool) — with an FK-safe `afterAll` cleanup.
2. It drives a real session and `submitAnswer`s a CORRECT answer, then asserts a `ReviewState` exists for
   that `userId × questionId` with `state !== "new"`, `stability > 0`, `dueAt` set and `> now`, `reps === 1`,
   and that exactly one `ReviewLog` row was appended for it.
3. It re-submits the SAME answer with the SAME `clientEventId` and asserts the `ReviewLog` count for that
   `userId × questionId` is STILL exactly one (idempotent replay — no double-apply).
4. It submits a WRONG answer on a SECOND question and asserts the appended `ReviewLog.grade === 1` and the
   question's `ReviewState` records the failure (`lastGrade === 1`; and where the item was already in
   `review`, the lapse is reflected via `lapses`↑ / `state === "relearning"`).
5. It re-runs `importOfficial(prisma)` and asserts the fixture questions' and options' ids are UNCHANGED, and
   the previously-written `ReviewState`/`ReviewLog` rows still reference those same valid ids (stable-key
   architecture preserved across a content re-import).
6. `npm run test:integration` INCLUDES this file (prove via
   `npx vitest list --config vitest.integration.config.ts`) and the suite passes with ZERO failures.

## Constraints / decisions
- Self-provision fixtures (never assert seeded content); FK-safe teardown order per wave10-01 findings:
  the new `ReviewState`/`ReviewLog` rows cascade from `User` and `Question` deletes, so
  `createOfficialQuestion`'s existing user→question→topic→category cleanup suffices — verify nothing blocks it.
- A LIVE pool needs `isPublished:true` + `isDemo:false` + category connect (`SERVE_DEMO_QUESTIONS` is false) —
  `createOfficialQuestion` already does this.
- The idempotency assertion is the point of §3.4 (offline replay) — assert the COUNT stays 1, not just that
  no error was thrown.
- Non-Goal: unit-level FSRS assertions (covered by wave10-03/04); UI; `TopicMastery`/readiness recompute.
- Evaluate: yes — an independent judge confirms the test genuinely asserts create/idempotent/lapse/stable-key
  (guards against a vacuous always-pass test).

## Plan
- [x] Write the suite: provision via `createOfficialQuestion`; start session; correct submit; assert ReviewState/ReviewLog.
- [x] Add the same-`clientEventId` replay assertion (count stays 1).
- [x] Add the wrong-answer grade-1 + failure-state assertion on a second question.
- [x] Re-run `importOfficial(prisma)`; assert unchanged ids + still-valid references; FK-safe `afterAll`.
- [x] `npm run test:integration`; confirm inclusion via `npx vitest list --config vitest.integration.config.ts`.

## Next
- [x] All Goal items met — suite present, included, green. Prior REJECT was a judge default (no verdict marker emitted), NOT a code defect: re-ran the suite (4 passed, 8.9s) and re-confirmed inclusion (`vitest list` → 4 entries). Re-affirmed Status: done for driver to re-run verify + judge.

## Artifacts
- `lib/server/srs-review.integration.test.ts` — the 4-test suite (correct/idempotent/lapse/stable-key).

## Log
- 2026-07-01 planner: task authored from specs/wave10-srs-foundation.md §G.
- 2026-07-01T20:37Z ClPcs-Mac-mini: wrote `lib/server/srs-review.integration.test.ts` (4 tests) — self-provisions via `createOfficialQuestion` (2 official Qs in a throwaway cat+topic), FK-safe `afterAll`. §2 correct submit → ReviewState(state≠new, stability>0, dueAt>now, reps=1)+1 ReviewLog; §3 same-`clientEventId` replay keeps ReviewLog count at 1 and reps at 1; §4 drives q2 Easy→`review` (fast+confident) then WRONG → grade 1, state `relearning`, lapses=1; §5 re-runs `importOfficial` and asserts fixture Q/option ids unchanged (questionKey=null ⇒ reconcile skips them) + ReviewState/ReviewLog still reference valid ids. Confirmed included via `vitest list`; suite green (4 passed); `verify.sh` PASS. Status → done.
- 2026-07-01T20:45Z ClPcs-Mac-mini: prior tick's done-claim was REJECTED with "(no VERDICT marker emitted — defaulting to REJECT)" — a judge-infrastructure default, NOT a substantive content reason (verify had PASSED). Audited the test against all 5 Goal items: every one is implemented with concrete non-vacuous assertions (reps=1, logCount=1, grade=1, lapses=1, ids unchanged). No code defect to fix. Re-ran `vitest run … srs-review.integration.test.ts` → 4 passed (8.9s); re-confirmed inclusion via `vitest list` (4 entries). Re-affirmed Status: done so the driver re-runs verify + judge.

## Verify
**Last verify:** PASS (2026-07-01T17:46:23Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T17:48:32Z)
