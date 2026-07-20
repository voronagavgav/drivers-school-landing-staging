# Task: wave10-08-study-record-review

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Spec §F (part 1) — the DB orchestration helper `lib/server/study.ts` `recordReview`. Depends on wave10-02
(schema/client), wave10-03 + wave10-04 (`deriveGrade`/`schedule`). PASS = ALL true:

1. `lib/server/study.ts` exports `recordReview(tx, params, now)` where `tx` is a Prisma interactive
   transaction client (`Prisma.TransactionClient`), `now: Date`, and `params = { userId, questionId, topicId,
   correct, latencyMs?, confidence?, mode, testSessionId?, clientEventId? }`.
2. It LAZILY reads the existing `ReviewState` for `userId × questionId` (via the `@@unique([userId,questionId])`)
   and, when absent, starts from a fresh `new` default state — NO bulk backfill / no scan of all questions.
3. It computes the grade via the pure `deriveGrade({ correct, latencyMs, confidence })` and the next state via
   the pure `schedule(state, grade, now)` (imports from `lib/fsrs`), then UPSERTS the `ReviewState` row
   (create-or-update on the unique key) with the new `stability/difficulty/state/dueAt/lastReviewedAt/reps/
   lapses/lastGrade/lastConfidence/lastLatencyMs`.
4. It APPENDS one `ReviewLog` row (grade, elapsedDays, priorStability/priorDifficulty, scheduledDays,
   confidence, latencyMs, mode, testSessionId, clientEventId). IDEMPOTENT: when `clientEventId` is provided
   AND a `ReviewLog` with that `clientEventId` already exists, it appends NOTHING and does not double-apply
   the state update (the `@unique` on `ReviewLog.clientEventId` is the guard).
5. All reads/writes go through the passed `tx` (so the caller can compose it inside one `$transaction`), not a
   module-level client — i.e. `recordReview` never opens its own transaction.
6. `npm run typecheck` exits 0.
7. `npm test` exits 0 (ZERO failures) — this task adds no unit-suite behaviour; the behavioural proof
   (ReviewState/ReviewLog created, idempotent replay, lapse) is wave10-10's integration test.

## Constraints / decisions
- This is a `lib/server/*` DB module (NOT pure) — it MAY import Prisma types (`Prisma.TransactionClient`) and
  the generated client types; it MUST import the FSRS math from `lib/fsrs` rather than re-deriving it.
- IDEMPOTENCY is the load-bearing property (offline replay, §3.4): a repeated `clientEventId` is a no-op —
  exactly one `ReviewLog`, state applied once. Prefer a guard read on `clientEventId` before the append AND
  rely on the DB `@unique` so a race still can't double-insert.
- `topicId` is denormalised onto `ReviewLog` (nullable) for the mistake/optimizer feed; do not require it.
- Non-Goal: wiring into `submitAnswer` (task 09), the integration test (task 10), `TopicMastery`/`StudyDay`/
  streak/readiness recompute (Wave 11). `recordReview` writes ONLY `ReviewState` + `ReviewLog`.
- High-stakes (learning-state write + idempotency correctness) → **Evaluate: yes**.

## Plan
- [x] Write `lib/server/study.ts`: default-new `ReviewState`, `deriveGrade`→`schedule`, upsert + `ReviewLog` append.
- [x] Add the `clientEventId` idempotency guard (existence check + rely on `@unique`).
- [x] `npm run typecheck` && `npm test`.

## Next
- [x] All Goal items met — `recordReview` written, verify.sh green. Behaviour proof is wave10-10's integration test.

## Artifacts
- `lib/server/study.ts` — `recordReview(tx, params, now)` + `RecordReviewParams` (the deliverable).

## Log
- 2026-07-01 planner: task authored from specs/wave10-srs-foundation.md §F (recordReview helper).
- 2026-07-01T17:24:22Z ClPcs-Mac-mini: wrote `lib/server/study.ts` — `recordReview(tx, params, now)`: offline-replay
  guard reads `ReviewLog` by `clientEventId` (no-op on hit), LAZY `ReviewState` read on `userId_questionId`
  (fresh `new` default when absent), `deriveGrade({correct,latencyMs,confidence})` → `schedule(prior,grade,now)`,
  UPSERT `ReviewState` (S/D/state/dueAt/lastReviewedAt/reps/lapses/lastGrade/lastConfidence/lastLatencyMs) +
  APPEND `ReviewLog` (grade/elapsedDays/prior S+D/scheduledDays/confidence/latency/mode/testSessionId/clientEventId),
  all through the passed `tx` (no self-opened txn). typecheck 0, `npm test` 324 pass, verify.sh → PASS. Status → done.
  Gotcha: the `$transaction`-negation gate greps the WHOLE file incl. comments — reworded the doc comment to
  drop the literal `$transaction` token.

## Verify
**Last verify:** PASS (2026-07-01T17:25:19Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T17:26:33Z)
