# Task: wave10-09-submit-answer-dual-write

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Spec §F (part 2) — wire `recordReview` into `submitAnswer` (lazy, additive, transactional). Depends on
wave10-08. PASS = ALL true:

1. `submitAnswer` (`lib/server/test-engine.ts`) accepts the OPTIONAL extra params `{ latencyMs?: number;
   confidence?: number; clientEventId?: string }` in addition to its existing params (all optional →
   existing callers unchanged).
2. The `TestAnswer` write, the existing `UserMistake` reconcile (`recordMistakeOutcome`), and the new
   `recordReview(tx, …, now)` all run inside ONE `prisma.$transaction`, with `recordReview` receiving that
   transaction client. (Per wave10-01, `recordMistakeOutcome` gains an optional trailing `tx` param
   defaulting to the module `prisma`, OR is otherwise made tx-aware — existing non-tx callers keep working.)
3. The RETURNED feedback shape is UNCHANGED: `{ recorded: true }` for non-feedback modes, and
   `{ recorded: true, isCorrect, correctOptionId, explanation }` for immediate-feedback modes — so
   `app/(app)/test/[id]/test-runner.tsx` needs NO change.
4. When `confidence` is provided it is persisted onto `TestAnswer.confidence`; when omitted the column stays
   null. Existing analytics event (`question_answered`/`recordEvent`) still fires.
5. `npm run typecheck` exits 0 and `npm run build` exits 0.
6. The existing integration suites `engine.integration.test.ts`, `finish-idempotency.integration.test.ts`,
   and `access-control.integration.test.ts` still pass (ZERO failures) against the seeded DB.
7. `npm test` exits 0 (ZERO failures).

## Constraints / decisions
- ADDITIVE + lazy: new params are optional; behaviour for callers that don't pass them is byte-identical
  except that a `ReviewState`/`ReviewLog` is now recorded (the whole point). Do NOT change the feedback
  contract or `getSessionState`.
- ONE transaction: the mistake reconcile MOVES inside the `$transaction` alongside `TestAnswer` +
  `recordReview` (spec §F: "together with the existing TestAnswer / mistake writes"). Keep `recordEvent`
  analytics fire-and-forget OUTSIDE the transaction (it's `void recordEvent(...)` today — do not block the tx
  on analytics).
- `recordReview` needs `topicId` (from the loaded question) and `mode` (from the session); pass them through.
  `now` is resolved by the caller (`submitAnswer` is a server module — it may create the Date there).
- Non-Goal: `startAdaptiveReview`/the queue-driven session (Wave 11), confidence capture in the UI
  (`test-runner.tsx` stays untouched — the param just flows through if a future caller sends it), any
  `TopicMastery`/`StudyDay`/readiness recompute on finish.
- High-stakes (core answer hot path + transaction correctness + must not regress existing suites) →
  **Evaluate: yes**.

## Plan
- [x] Extend `submitAnswer` params with `latencyMs?/confidence?/clientEventId?`.
- [x] Wrap `TestAnswer` upsert + mistake reconcile + `recordReview` in one `prisma.$transaction`; pass tx.
- [x] Persist `confidence` on `TestAnswer`; keep the feedback return shape identical.
- [x] Make `recordMistakeOutcome` tx-aware (optional trailing `tx`, default module prisma).
- [x] `npm run typecheck` && `npm run build`; run engine/finish-idempotency/access-control integration suites.

## Next
- [ ] (none — Goal met; verify re-runs the gates)

## Log
- 2026-07-01 planner: task authored from specs/wave10-srs-foundation.md §F (submitAnswer dual-write).
- 2026-07-01 ClPcs-Mac-mini: wired the dual-write. Made `recordMistakeOutcome` tx-aware (optional
  trailing `tx: Prisma.TransactionClient = prisma`, all delegate calls now via `tx`). Extended
  `submitAnswer` params with `latencyMs?/confidence?/clientEventId?`; moved the `TestAnswer` upsert +
  `recordMistakeOutcome` + new `recordReview(tx, …, now)` into one `prisma.$transaction`; persist
  `confidence` on the answer row (`?? undefined`); kept `recordEvent` fire-and-forget outside the tx
  and the feedback return shape identical (`test-runner.tsx` untouched). typecheck/test/build/3 named
  integration suites all green → Status: done. Artifacts: lib/server/test-engine.ts, lib/server/mistakes.ts.

## Verify
**Last verify:** PASS (2026-07-01T17:29:48Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T17:32:45Z)
