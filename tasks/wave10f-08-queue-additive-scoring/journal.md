# Task: wave10f-08-queue-additive-scoring

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Replace the multiplicative `overdueness × (1 − R) × topicWeakness` score in `lib/test-engine/queue.ts`
(`scoreCandidate`, D1) with the spec §4.1 additive weighted sum. The multiplicative form lets any zero
factor annihilate the score — a year-overdue R≈0 card ranks BELOW a fresh one when `topicWeakness = 0`.

Boolean acceptance criteria:
1. `scoreCandidate` computes an ADDITIVE weighted sum with documented weights: overdueness and `(1 − R)`
   are the dominant terms, `topicWeakness` is a smaller boost, plus a small deterministic tiebreak. No
   term multiplies another such that a zero factor zeroes the whole score.
2. Unit test: an overdue, low-R card with `topicWeakness = 0` has a STRICTLY POSITIVE score and ranks
   ABOVE a fresh high-R card (topicWeakness=0 does NOT zero it).
3. Unit test: an all-mastered user (all topicWeakness=0) still gets a sensible due-order queue — cards are
   ordered by overdueness/(1−R), not all tied at 0.
4. The weights are named constants (in `queue.ts` or `lib/constants.ts`) with a comment, not magic numbers
   inline.
5. `lib/test-engine/queue.test.ts` (or the queue's test file) updated; collected by `npx vitest list`.
6. `npm test` exits 0; `npm run typecheck` exits 0.
7. `queue.ts` stays pure + deterministic (injected `now`/`rng`; no DB/clock/RNG reads, no JSX).

## Constraints / decisions
- Keep `retrievability` reused from `@/lib/fsrs` (never re-derived) and `overdueness` semantics as-is; only
  the COMBINATION changes from product to weighted sum.
- Determinism: the tiebreak must stay deterministic (e.g. questionId order) so ordering is stable under a
  seeded rng — the existing sort tiebreak on `questionId` can remain.
- Non-Goal: newItemShare cap (wave10f-09). Change scoring only.

## Plan
- [x] Define weight constants; rewrite `scoreCandidate` as `wOverdue·f(overdueness) + wForget·(1−R) +
      wWeak·topicWeakness + tiebreak`.
- [x] Add the two unit tests (topicWeakness=0 non-zero score & rank; all-mastered due-order).
- [x] `npm test` + `npm run typecheck` 0.

## Next
- [x] Rewrite scoreCandidate as an additive weighted sum with named weights.
(Goal fully met — Status: done.)

## Artifacts
- `lib/test-engine/queue.ts` — new `SCORE_WEIGHTS` const + `overdueSaturation` helper; `scoreCandidate`
  rewritten as additive weighted sum (overdue-saturation + (1−R) + weakness boost + 1/(1+stability) tiebreak).
- `lib/test-engine/queue.test.ts` — two new scoreCandidate unit tests (topicWeakness=0 positive+rank; all-mastered due-order).

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01 ClPcs-Mac-mini: Rewrote `scoreCandidate` as spec §4.1 additive weighted sum. Added named
  `SCORE_WEIGHTS` (overdue=1, forget=1, weakness=0.3, tiebreak=0.01) with doc comments and a saturating
  `overdueSaturation(x)=x/(1+x)` so overdueness stays on the same [0,1) scale as (1−R). Terms ADD, so a
  topicWeakness=0 overdue/low-R card is strictly positive and outranks a fresh high-R card. Added two unit
  tests. `npx vitest run queue.test.ts` 6/6, full `npm test` 341/341, `npm run typecheck` clean, queue.test.ts
  collected by `npx vitest list`. Status → done.

## Verify
**Last verify:** PASS (2026-07-01T20:42:55Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:43:51Z)
