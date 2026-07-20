# Task: wave10-05-queue-picker

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Spec §C — pure `lib/test-engine/queue.ts` (`now` + `rng` injected, scoped exactly like `selection.ts`).
PASS = ALL true:

1. `lib/test-engine/queue.ts` exports:
   - `scoreCandidate(state, now, topicWeakness)` implementing `overdueness × (1 − R) × topicWeakness`
     (uses the pure `retrievability` from `lib/fsrs`), returning a number.
   - `selectReviewQueue(candidates, { now, rng, size, newItemShare })` → an ordered array of `questionId`s.
     `rng` defaults to `Math.random` (the injectable default, scoped to the parameter — the ONLY place the
     token may appear, exactly as `selection.ts`).
2. RANKING: an OVERDUE, low-R, weak-topic candidate scores strictly higher than a FRESH, high-R,
   strong-topic candidate: `scoreCandidate(overdueWeak, now, 0.9) > scoreCandidate(freshStrong, now, 0.1)`.
3. INTERLEAVING: given candidates spanning ≥3 distinct topics with enough alternatives, `selectReviewQueue`'s
   output has NO 3 consecutive items from the same `topicId` (adjacent-but-different where alternatives exist).
4. NEW-ITEM SHARE: given unseen ("new") candidates available, the output contains a bounded share of new
   items ≈ `round(size × newItemShare)` (never wildly exceeding it), so coverage grows without swamping review.
5. DETERMINISM: `selectReviewQueue` called twice with the SAME injected `rng` (a seeded closure) and inputs
   returns an identical ordering.
6. PURITY: `lib/test-engine/queue.ts` contains NONE of `server-only`, `@/lib/db`, `@prisma/client`,
   `lib/generated`, `Date.now`, `new Date`, and NO `Math.random` EXCEPT the single injectable
   `rng = Math.random` default parameter (no other occurrence). No JSX.
7. `lib/test-engine/queue.test.ts` (included per `npx vitest list`) asserts Goal 2–5. `npm run typecheck` 0
   and `npm test` 0 (ZERO failures).

## Constraints / decisions
- PURE, clock + rng injected — mirror `lib/test-engine/selection.ts` exactly (the determinism grep is scoped
  to the `rng = Math.random` default; do not write `Math.random` elsewhere; never `Date.now`/`new Date`).
- Candidate shape is the implementer's but must carry at least `{ questionId, topicId, topicWeakness }` and an
  optional FSRS memory `state` (null/absent ⇒ a "new"/unseen item eligible for the new-item share).
- Target the desirable-difficulty band (prefer items whose `R ≈ 0.70–0.85`) as a tie-break/weighting layered
  on the score — but the hard, testable behaviours are Goal 2–5.
- Reuse `retrievability` from `lib/fsrs` (do NOT re-derive R). Import type-only where possible.
- Non-Goal: `startAdaptiveReview`, building the session, any DB read/write (Wave 11); blueprint weighting is a
  later refinement.

## Plan
- [x] Write `scoreCandidate` composing `retrievability` (overdueness × (1−R) × topicWeakness).
- [x] Write `selectReviewQueue` with score-rank → topic-interleave → bounded new-item injection (rng-shuffled).
- [x] Write `lib/test-engine/queue.test.ts` covering ranking, interleaving, new-share, determinism.
- [x] `npm run typecheck` && `npm test`; confirm inclusion via `npx vitest list`.

## Next
- (none — Goal fully met, verify green.)

## Artifacts
- `lib/test-engine/queue.ts` — `scoreCandidate(state, now, topicWeakness)` (+ `ScoredState` type,
  `overdueness` helper) AND `selectReviewQueue(candidates, { now, rng, size, newItemShare })` (+
  `QueueCandidate`/`QueueOptions` types, `DEFAULT_NEW_ITEM_SHARE`, `interleave` helper). Reuses
  `retrievability` from `@/lib/fsrs` and `shuffle` from `./selection`. Pure (rng/clock injected).
- `lib/test-engine/queue.test.ts` — asserts ranking (Goal 2), interleaving (Goal 3), bounded
  new-share (Goal 4), determinism (Goal 5). In the unit suite (`npx vitest list`).

## Log
- 2026-07-01 planner: task authored from specs/wave10-srs-foundation.md §C.
- 2026-07-01T00:00Z ClPcs-Mac-mini: wrote `scoreCandidate` in `lib/test-engine/queue.ts` — pure
  `overdueness × (1−R) × topicWeakness`, R reused from `@/lib/fsrs` (`retrievability`, type-only
  `ReviewMemoryState`), `now` injected. Verified ranking (overdue-weak 0.676 > fresh-strong 0) and
  `npm run typecheck` clean. `selectReviewQueue` + test are the remaining increments.
- 2026-07-01T20:08Z ClPcs-Mac-mini: wrote `selectReviewQueue` + `QueueCandidate`/`QueueOptions`/
  `DEFAULT_NEW_ITEM_SHARE` + `interleave` helper (reuses `shuffle` from `./selection`): rank seen
  cards by `scoreCandidate` desc (questionId tie-break), reserve bounded `round(size×share)` unseen
  items (rng-shuffled), proportional-interleave the two streams, then greedy pick-smallest-order-
  avoiding-3-in-a-row for topic variety. Added `queue.test.ts` (ranking/interleaving/new-share/
  determinism). Verify GREEN: smoke `newItems=3/target 3`, typecheck clean, 316/316 unit tests
  pass. Trap hit: the doc comment "defaults to `Math.random`" tripped the `grep -c 'Math.random' ≤ 1`
  purity gate (counts comments) — reworded to "the global PRNG". Goal fully met → Status: done.


## Verify
**Last verify:** PASS (2026-07-01T17:09:29Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T17:10:52Z)
