# Task: wave10f-09-queue-newitemshare-cap

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Artifacts:** lib/test-engine/queue.ts, lib/test-engine/queue.test.ts
**Last compute:** laptop

## Goal
Make `newItemShare` a CAP, not a fill target, in `lib/test-engine/queue.ts` `selectReviewQueue` (D2). Today
when seen cards run short the queue backfills to `size` with new items; the spec wants `newCount =
min(newTarget, unseen.length)` and the queue to return FEWER than `size` (short queues are by-design),
with an explicit opt-in `backfillWithNew` for modes that still want fill.

Boolean acceptance criteria:
1. `QueueOptions` gains `backfillWithNew?: boolean` (default `false`).
2. With `backfillWithNew` false (default): the number of NEW items chosen is `min(round(size × share),
   unseen.length)` and the queue does NOT top up with extra new items to reach `size` when seen cards are
   short. The queue length may be `< size`.
3. Unit tests:
   - `share=0` + 2 seen + 10 unseen + `size=10` → EXACTLY the 2 seen (length 2, zero new).
   - `share=0.2` + `size=10` → `≤ 2` new items.
   - `backfillWithNew: true` → restores the old fill-to-size behaviour (uses extra unseen to reach `size`).
4. Tests collected by `npx vitest list`; `npm test` exits 0; `npm run typecheck` exits 0.
5. `queue.ts` stays pure + deterministic.

## Constraints / decisions
- The current code computes `seenCount = min(rankedSeen.length, size - newTarget)` then `newCount =
  min(unseen.length, size - seenCount)` — that second line is the backfill that must become opt-in. Under
  the default, `newCount = min(newTarget, unseen.length)` (independent of the seen shortfall).
- Existing callers keep working: default false = short queues. Any mode that relied on fill must pass
  `backfillWithNew: true` explicitly (do not silently change caller behaviour — leave callers on the new
  default unless a caller is documented to need fill).
- Non-Goal: scoring change (wave10f-08).

## Plan
- [x] Add `backfillWithNew` to `QueueOptions`; compute `newCount = min(newTarget, unseen.length)` by default.
- [x] Under `backfillWithNew`, restore the `size - seenCount` top-up.
- [x] Add the three unit tests.
- [x] `npm test` + `npm run typecheck` 0.

## Next
- [ ] (none — Goal met; awaiting driver verify re-run)

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01 ClPcs-Mac-mini: Made `newItemShare` a CAP in `selectReviewQueue`. Added `backfillWithNew?: boolean` (default false) to `QueueOptions`; default now sets `newCount = newTarget` (= min(round(size×share), unseen.length)) with NO top-up, so short queues return < size by design. `backfillWithNew:true` restores the old `min(unseen.length, size - seenCount)` fill. No production callers of `selectReviewQueue` exist yet, so no caller behaviour changed. Added 3 unit tests (share=0→exactly 2 seen; share=0.2→≤2 new & length<10; backfill:true→length 10, 8 new). queue.test.ts: 9 passed; `npm test` 344 passed; `npm run typecheck` 0; `npx vitest list` collects queue.test.ts. Status → done.

## Verify
**Last verify:** PASS (2026-07-01T20:45:26Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:46:15Z)
