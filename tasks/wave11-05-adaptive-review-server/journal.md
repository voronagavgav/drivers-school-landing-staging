# Task: wave11-05-adaptive-review-server

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop
**Evaluate:** yes

## Goal
Make `ADAPTIVE_REVIEW` and `SPACED_REVIEW` real, queue-driven sessions via the pure
`selectReviewQueue` (lib/test-engine/queue.ts, unchanged), wired through the generic start path so the
action starts them. Depends on wave11-03 (STARTABLE flip). DONE when (verify.sh exits 0):

1. `lib/server/study.ts` exports `startAdaptiveReview(userId, categoryId)`:
   - loads the user's `ReviewState` rows for the category + `TopicMastery` weakness (0..1, from band),
     builds `QueueCandidate[]` (seen = has ReviewState; unseen = published-but-no-state);
   - calls `selectReviewQueue(candidates, { now, size, newItemShare: DEFAULT_NEW_ITEM_SHARE,
     backfillWithNew: true })` where `size = profile.dailyGoal || ADAPTIVE_REVIEW_SIZE`, `now` injected
     (a `now = new Date()` default param so it's test-overridable);
   - creates a `TestSession(mode="ADAPTIVE_REVIEW")` + ordered `TestSessionQuestion` rows in queue
     order; returns the session id.
   - EMPTY queue (nothing due, no new) → fall back to unseen-first (published, not-yet-seen) selection;
     NEVER throws for a category that HAS published questions.
2. `lib/server/study.ts` exports `startSpacedReview(userId, categoryId)`: same machinery but
   `{ newItemShare: 0, backfillWithNew: false }` (due-only, no new items). Empty due queue → throws a
   typed `NothingDueError` (exported; distinct from a real config error).
3. `startSession` (lib/server/test-engine.ts) branches BEFORE its `baseWhere`: `ADAPTIVE_REVIEW` →
   `startAdaptiveReview`, `SPACED_REVIEW` → `startSpacedReview`; all other modes unchanged.
4. `app/actions/test.ts` `startTestAction` maps `NothingDueError` → `redirect('/dashboard?empty=SPACED_REVIEW')`
   (reusing the existing empty-mode redirect pattern); `NoQuestionsError` mapping unchanged.
5. FROZEN pure oracle — a new `lib/test-engine/queue-overrides.test.ts` pins the two parameterizations
   against the REAL `selectReviewQueue` (3 seen S1..S3, 5 unseen U1..U5, all `now`-injected):
   - SPACED `{size:6, newItemShare:0, backfillWithNew:false}` → result length **3**, set === {S1,S2,S3},
     ZERO ids starting "U" (due/seen-only, never injects new).
   - ADAPTIVE `{size:6, newItemShare:0.2, backfillWithNew:true}` → result length **6**, contains
     S1,S2,S3 AND exactly **3** ids starting "U" (backfills to size with new items).
   `npx vitest list` includes `queue-overrides.test.ts`; `npm test` exits 0.
6. `npm run typecheck` exits 0.

## Constraints / decisions
- `queue.ts` is NOT modified — it already supports these params (wave10f). This task only PARAMETERIZES
   and wires it; the oracle in §5 guards the parameterization, not the (already-tested) scoring math.
- No id-list `{ in: [...] }` reads over large id sets; prefer `where: { userId, ... }` scans + JS join.
  If any `in`-list over question ids is used, chunk ≤200 (P2029, CLAUDE.md).
- `now` is an injected default param on both start fns (deterministic tests).
- No learner UI. SPACED empty copy/redirect UI is W12 — only the action-level typed signal here.
- `startAdaptiveReview`/`startSpacedReview` live in study.ts (test-engine already imports study →
  no cycle; study must NOT import test-engine).

## Plan
- [x] Author queue-overrides.test.ts (frozen oracle) first.
- [x] Implement the two start fns + NothingDueError in study.ts.
- [x] Branch startSession; map NothingDueError in the action.

## Next
- [ ] (none — Goal met, verify.sh exits 0). Follow-on: wave11-06 integration test exercises these fns.

## Log
- 2026-07-02 planner: task authored; composition oracle frozen.
- 2026-07-02T01:52Z ClPcs-Mac-mini: wrote lib/test-engine/queue-overrides.test.ts — frozen oracle
  pinning both parameterizations against the REAL selectReviewQueue (3 seen S1..S3, 5 unseen U1..U5,
  now-injected). SPACED {size:6,share:0,backfill:false}→len 3 set {S1,S2,S3}, zero U; ADAPTIVE
  {size:6,share:0.2,backfill:true}→len 6, contains S1..S3 + exactly 3 U. `vitest run` 2/2 green;
  `npx vitest list` includes queue-overrides.test.ts.
- 2026-07-02T02:30Z ClPcs-Mac-mini: implemented startAdaptiveReview + startSpacedReview + typed
  NothingDueError in lib/server/study.ts. Shared loadReviewCandidates (published questions in cat +
  ReviewState via `where:{userId}` scan + JS join, TopicMastery band→weakness map weak/learning/
  strong = 1/0.5/0, default 0.5; NO id-list `in` reads), resolveReviewSize (profile.dailyGoal ||
  ADAPTIVE_REVIEW_SIZE), createReviewSession (TestSession + ordered TestSessionQuestion, fires
  test_started). Adaptive = {share:DEFAULT_NEW_ITEM_SHARE, backfill:true} + unseen-first fallback
  (never throws w/ published content); spaced = {share:0, backfill:false}, empty→NothingDueError.
  Branched startSession (test-engine.ts) on both modes BEFORE baseWhere; mapped NothingDueError →
  redirect('/dashboard?empty=SPACED_REVIEW') in app/actions/test.ts (before NoQuestionsError).
  verify.sh green: oracle OK + typecheck 0 + PASS.

## Artifacts
- lib/server/study.ts — startAdaptiveReview / startSpacedReview / NothingDueError + helpers.
- lib/server/test-engine.ts — startSession branches on ADAPTIVE_REVIEW / SPACED_REVIEW.
- app/actions/test.ts — startTestAction maps NothingDueError → /dashboard?empty=SPACED_REVIEW.
- lib/test-engine/queue-overrides.test.ts — frozen composition oracle (prior tick).


## Verify
**Last verify:** PASS (2026-07-01T22:56:17Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T22:57:21Z)
