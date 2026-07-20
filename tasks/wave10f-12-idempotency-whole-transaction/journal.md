# Task: wave10f-12-idempotency-whole-transaction

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** ClPcs-Mac-mini

## Artifacts
- `lib/server/test-engine.ts` — `submitAnswer` whole-transaction replay guard + analytics gate.

## Goal
Hoist the offline-replay dedupe to the WHOLE transaction (E3). Today only `recordReview` guards on
`clientEventId`, so a replayed answer still rewrites `TestAnswer` and re-runs `recordMistakeOutcome`
(double-advancing mistake counts / FSRS-adjacent state). When `clientEventId` is present, check
`reviewLog.findUnique({ where: { clientEventId } })` FIRST inside the tx; on a hit the ENTIRE transaction
is a no-op.

Boolean acceptance criteria:
1. In `submitAnswer` (`lib/server/test-engine.ts`), inside `prisma.$transaction`, when
   `params.clientEventId` is present, the FIRST step is `tx.reviewLog.findUnique({ where: { clientEventId } })`;
   if a row exists the transaction returns early WITHOUT the `testAnswer.upsert`, `recordMistakeOutcome`,
   or `recordReview` calls.
2. `recordReview`'s own inner `clientEventId` guard is KEPT as belt-and-suspenders (not removed).
3. On a replay (same `clientEventId`): `TestAnswer` is NOT rewritten, `UserMistake.correctRepeatCount`
   (mistake reconcile) is NOT advanced, and exactly ONE `ReviewLog` row exists for that event.
4. `npm run test:integration` exits 0 (the assertion is covered by wave10f-14's extended integration
   test; this task must not regress the existing `srs-review.integration.test.ts`).
5. `npm run typecheck` exits 0.

## Constraints / decisions
- The early-return must preserve the action's return contract: `submitAnswer` still returns a sensible
  result (e.g. `{ recorded: true }` or the immediate-feedback shape) on a replay so the caller doesn't
  break. Decide and document which shape a replay returns.
- Keep `void recordEvent(...)` analytics OUTSIDE the tx (as today); on a pure replay, avoid recording a
  second `question_answered` analytics event (a replay is not a new answer) — gate it on the non-replay path.
- Depends on wave10f-10 (fields must reach `submitAnswer`). Non-Goal: the integration assertions
  themselves (wave10f-14 owns them), the client (wave10f-11).

## Plan
- [x] Add the `tx.reviewLog.findUnique({ where: { clientEventId } })` early-return at the top of the tx.
- [x] Ensure mistake reconcile + answer upsert are skipped on a hit; keep recordReview's inner guard.
- [x] Gate the analytics event off the replay path.
- [x] `npm run typecheck` 0; `srs-review.integration.test.ts` green (full test:integration owned by wave10f-14/-19).

## Next
- [x] Add the whole-transaction dedupe guard in submitAnswer.

## Decision
- Return shape on replay: `submitAnswer` returns the SAME shape as a first-write, because `correct` is
  recomputed deterministically from the (identical) params + question BEFORE the tx — so the feedback
  shape (`{recorded, isCorrect, correctOptionId, explanation}` / `{recorded}`) stays valid. Only the DB
  writes and the `question_answered` analytics event are gated off the replay path.

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01 ClPcs-Mac-mini: Hoisted the offline-replay dedupe to the whole tx in `submitAnswer`
  (`lib/server/test-engine.ts`): the `$transaction` now returns a `replayed` boolean; when
  `params.clientEventId` is present its FIRST step is `tx.reviewLog.findUnique({where:{clientEventId}})`
  and on a hit returns early (`true`) — no `testAnswer.upsert`, no `recordMistakeOutcome`, no
  `recordReview`. `recordReview`'s inner guard kept as belt-and-suspenders. Gated
  `recordEvent("question_answered")` on `!replayed`. `npm run typecheck` exits 0;
  `srs-review.integration.test.ts` 4/4 green (no regression). Status → done.

## Verify
**Last verify:** PASS (2026-07-01T20:54:50Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:55:59Z)
