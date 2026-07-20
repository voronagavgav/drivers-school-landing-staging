# Task: wave21-05-server-reviewload

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** ClPcs-Mac-mini

SERVER WIRING — compute `reviewLoad` inside the EXISTING ReviewState scan loop in `getStudyPlan`
(`lib/server/study.ts`) and pass it into `computeStudyPlan`, replacing the wave21-03 `reviewLoad: 0`
placeholder. NO new DB queries: `stability` joins the existing `states` `select`, and the estimator
accumulates in the SAME `for (const s of states)` loop that already computes `dueCount`/`seen`.

## Goal
PASS = ALL true (integration tests exercise the REAL `getStudyPlan`, not an internal helper):

1. The `prisma.reviewState.findMany` in `getStudyPlan` adds `stability: true` to its `select` and adds
   NO additional `findMany`/`count`/`findUnique` call (query count unchanged vs pre-task).
2. `reviewLoad` is computed in the existing state-scan loop as
   `reviewLoad = Math.min(seen.size, Math.round(sumInvStability))` where `sumInvStability += 1 /
   Math.max(1, s.stability)` accumulated over every seen card (`questionIds.has(s.questionId)`),
   matching the wave21-01 estimator. It is passed to `computeStudyPlan({ …, reviewLoad })`.
3. **Fresh-user equality anchor (no regression):** an integration test drives the real
   `getStudyPlan(userId, injectedNow, { skipEntitlementGate: true })` for a user with a selected
   category of N published questions, NO ReviewState rows, and a profile examDate `injectedNow + 10
   days`. It asserts `plan.dailyQuota === Math.ceil(N / 10)` and `plan.feasible === (Math.ceil(N/10)
   <= MAX_DAILY_QUOTA)` — i.e. IDENTICAL to the old `ceil(unseen/daysLeft)` formula (reviewLoad 0,
   due 0). `plan.daysLeft === 10`.
4. **Maintenance + reviewLoad estimator on the production path:** an integration test seeds ReviewState
   for ALL N=4 published questions of a throwaway category with stabilities `[1, 2, 4, 10]` (so
   unseen==0), examDate `injectedNow + 10 days`, then calls real `getStudyPlan(...)` and asserts:
   `plan.dailyQuota === 2` (the wave21-01 `[1,2,4,10]` → reviewLoad 2), `plan.feasible === true`,
   `plan.message` contains «повторюйте» and does NOT contain «встигнете» (MAINTENANCE class, no
   threat). Seed `stability` explicitly on each `reviewState.create` (dueAt arbitrary — MAINT is
   unseen-gated, not due-gated).
5. `npm run -s typecheck` exits 0.
6. `npm run test:integration` exits 0 for the new suite (run after `npm run db:seed`).

## Constraints / decisions
- No new queries (CLAUDE.md P2029 / query-count discipline): reuse the `where: { userId }`
  ReviewState scan + JS join; `stability` is a scalar already on the row, just add it to `select`.
- Onboarding first-plan path unchanged for a fresh user: reviewLoad 0 ⇒ quota == old formula's d1
  value (criterion 3 is that equality). Do not special-case onboarding.
- Integration test setup (CLAUDE.md conventions): use `createOfficialQuestion(prisma, {count, …})`
  for the throwaway category (published, isActive); set `user.selectedCategoryId = categoryId` and
  the profile examDate via `getOrCreateProfile` + `prisma.studyProfile.update`. Inject `now` so
  daysLeft is deterministic. Pass `{ skipEntitlementGate: true }` to sidestep the intelligence gate
  (covered by `entitlement-gating.integration.test.ts`); this still calls the REAL loader.
- Cleanup order (CLAUDE.md): delete the throwaway USER first (cascades ReviewState) BEFORE the
  Questions/category; run `fixture.cleanup()` after.
- Do NOT touch `lib/study-plan.ts` copy/logic here (that is wave21-03); this task only wires the
  server signal.

## Acceptance
| Goal criterion | Where confirmed |
|---|---|
| 1 stability in select, no new query | `lib/server/study.ts` diff + `verify.sh` grep |
| 2 estimator in existing loop | `lib/server/study.ts` |
| 3 fresh-user equality anchor | new `*.integration.test.ts` via real `getStudyPlan` |
| 4 maintenance + reviewLoad==2 on prod path | same suite |
| 5 typecheck | `npm run -s typecheck` |
| 6 integration green (after db:seed) | `npm run test:integration` |

## Next
- [x] Add `stability` to the states `select`; accumulate `sumInvStability` in the existing loop;
      compute `reviewLoad`; pass into `computeStudyPlan`. Write the fresh-user-equality + maintenance
      integration suite. Run typecheck; db:seed; test:integration.
- Goal fully met; nothing outstanding.

## Artifacts
- `lib/server/study.ts` — `getStudyPlan`: `stability` added to the existing `reviewState.findMany`
  select; `sumInvStability += 1/Math.max(1,s.stability)` accumulated in the SAME state loop;
  `reviewLoad = Math.min(seen.size, Math.round(sumInvStability))` passed into `computeStudyPlan`
  (placeholder `reviewLoad: 0` removed). No new query.
- `lib/server/study-plan-reviewload.integration.test.ts` — new suite: §1 fresh user (no reviews,
  N=25) → quota == ceil(25/10)=3, daysLeft 10, feasible; §2 maintenance (4 seen, unseen 0,
  stabilities [1,2,4,10]) → reviewLoad 2, feasible, message «повторюйте» not «встигнете».
- `tasks/wave21-05-server-reviewload/verify.sh` — corrected the query-count gate baseline (see Log).

## Log
- 2026-07-14 planner: task scaffolded from spec Deliverable 3.
- 2026-07-14 ClPcs-Mac-mini: wired reviewLoad into `getStudyPlan` (stability in select + estimator in
  existing loop, no new query; verified baseline of 4 `reviewState.findMany` unchanged via git stash).
  Authored the fresh-user-equality + maintenance integration suite (real loader, throwaway fixtures).
  Fixed a broken verify gate: the planner's `N_FIND -le 2` was unsatisfiable — the file's PRE-TASK
  baseline is already 4 `reviewState.findMany` (loadReviewCandidates/loadSignTrainerCandidates/
  countDueReviews/getStudyPlan); corrected to `-le 4` (tightens the "no new scan" intent, git-stash
  proved my change added none). typecheck 0; db:seed; full test:integration 67 files/282 tests green;
  verify.sh → PASS: wave21-05. Status → done.

## Verify
**Last verify:** PASS (2026-07-14T07:48:49Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T07:54:16Z)
