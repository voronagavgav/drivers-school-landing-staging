# Task: wave1-sec-12-finish-session-idempotent

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Make `finishSession` idempotent and prove it with an integration test (spec section F, AUDIT High item).
Finishing an already-COMPLETED session must NOT duplicate the ProgressSnapshot or re-fire analytics.

1. `finishSession` (`lib/server/test-engine.ts`) acts ONLY when the session is `IN_PROGRESS`: when the
   re-fetched session's `status !== "IN_PROGRESS"` it returns early (a no-op summary built from the
   already-stored `totalQuestions`/`correctAnswers`/`wrongAnswers`/`result`/`mode`) WITHOUT calling
   `snapshotProgress` again and WITHOUT re-firing `recordEvent("test_completed", …)` or the
   `exam_simulation_*` events.
2. The ownership guard is preserved: a session not owned by `userId` still throws `INVALID_SESSION`
   (the `findFirst({ where: { id, userId } })` stays).
3. A NEW integration test `lib/server/finish-idempotency.integration.test.ts` proves: after finishing a
   session once, calling `finishSession` again (a) leaves the user's `ProgressSnapshot` row COUNT
   unchanged, and (b) leaves the session's `correctAnswers`/`wrongAnswers`/`result` unchanged.
4. `npm run test:integration` exits 0 (the new test + existing engine integration test pass).
5. `npm test` exits 0 and `npm run typecheck` exits 0 (no behaviour regression for the normal first
   finish; the existing `engine.integration.test.ts` still passes).

## Constraints / decisions
- Edit `lib/server/test-engine.ts` (`finishSession` only) and add the new integration test file.
- Preferred implementation: early-return on non-`IN_PROGRESS` status; OPTIONALLY also make the status
  flip a conditional `updateMany({ where: { id, status: "IN_PROGRESS" } })` and only snapshot/emit when
  a row was actually transitioned (hardens against the concurrent race too). Either satisfies the test.
- Do NOT change the normal first-finish behaviour (totals, result, snapshot, analytics fire exactly
  once). Keep the `evaluateExam`/`DEFAULT_EXAM_MAX_ERRORS` logic intact.
- The deterministic assertion is the `ProgressSnapshot` count (it is `await`ed via `snapshotProgress`);
  analytics events are `void`-fired and need not be counted — the status guard prevents their re-fire.
- Integration test hygiene: create a throwaway user (mirror `engine.integration.test.ts`) and delete it
  in `afterAll` so the seeded DB stays clean.
- Non-Goal: the client double-fire guard (task 13); the "exam runs short" UX item (Wave 2).
- HANDOFF: this task blocks the Wave 1 acceptance gate `wave1-sec-15-verify-wave1-security` (currently
  `blocked`). When this task is set `done`, flip wave1-sec-15's Status back to `active` so its next tick
  re-runs the full A–F gate.

## Plan
- [x] Add the `status !== "IN_PROGRESS"` early-return (or conditional `updateMany`) to `finishSession`.
- [x] Write `lib/server/finish-idempotency.integration.test.ts`: finish once, snapshot count + counts,
      finish again, assert unchanged.
- [x] `npm run typecheck` && `npm test` && `npm run test:integration`.

## Done
- [x] Added `status !== "IN_PROGRESS"` early-return guard to `finishSession` (lib/server/test-engine.ts):
      returns the stored summary (totalQuestions/correctAnswers/wrongAnswers/result/mode) without
      re-calling `snapshotProgress` or re-firing `recordEvent`. Ownership `findFirst` guard preserved.
      `npm run typecheck` passes.
- [x] Wrote `lib/server/finish-idempotency.integration.test.ts` (mirrors `engine.integration.test.ts`):
      throwaway user; finish an EXAM_SIMULATION session once, capture `ProgressSnapshot` count + the
      stored correct/wrong/result, finish again, assert snapshot count + counts unchanged; plus a
      non-owner finish still throws `INVALID_SESSION`. typecheck + `npm test` (91) + integration (11)
      all green; task `verify.sh` exits 0 (PASS).

## Next
- [x] Goal met — finishSession idempotent + integration test green. Nothing outstanding for this task.
      HANDOFF done: flipped `wave1-sec-15-verify-wave1-security` Status `blocked → active` so its next
      tick re-runs the full A–F Wave 1 gate.

## Artifacts
- lib/server/test-engine.ts — idempotent finishSession
- lib/server/finish-idempotency.integration.test.ts — finish-twice → one snapshot, counts unchanged
- tasks/wave1-sec-12-finish-session-idempotent/verify.sh — guard + integration test + suites green

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: REOPENED (blocked → active) by wave1-sec-15 acceptance gate. The
  gate fails at criterion F because `finishSession` in `lib/server/test-engine.ts` still flips
  `status: "COMPLETED"` and calls `snapshotProgress`/`recordEvent` unconditionally — no
  `status !== "IN_PROGRESS"` early-return (verify.sh greps the finishSession body for `IN_PROGRESS`).
  Implement the guard (Plan above) + add `lib/server/finish-idempotency.integration.test.ts` to unblock
  Wave 1.
- 2026-06-17T09:01:50Z ClPcs-Mac-mini: wave1-sec-15 gate re-checked — guard still absent (0 `IN_PROGRESS`
  refs in finishSession; integration test file missing). wave1-sec-15 parked `blocked` pending this task.
  On completion, reopen wave1-sec-15 (see HANDOFF note under Constraints).
- 2026-06-17T09:18:00Z ClPcs-Mac-mini: Implemented the idempotency guard in `finishSession`
  (lib/server/test-engine.ts): early-return on `session.status !== "IN_PROGRESS"` with the stored
  summary, skipping `snapshotProgress`/`recordEvent`. Ownership `findFirst` guard intact.
  `npm run typecheck` exits 0. Next increment: add the finish-idempotency integration test.
- 2026-06-17T12:16:00Z ClPcs-Mac-mini: Added `lib/server/finish-idempotency.integration.test.ts`
  (mirrors engine.integration.test.ts): finish-twice on a COMPLETED EXAM_SIMULATION session asserts
  `progressSnapshot.count` unchanged and stored correct/wrong/result unchanged; second test asserts a
  non-owner finish throws `INVALID_SESSION`. `npm run typecheck` (0), `npm test` (8 files/91 pass),
  `npm run test:integration` (3 files/11 pass), and `verify.sh` all green → Status: done. Reopened
  wave1-sec-15 (blocked → active) per HANDOFF.


## Verify
**Last verify:** PASS (2026-06-17T09:16:42Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T09:17:26Z)
