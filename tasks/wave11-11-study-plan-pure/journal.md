# Task: wave11-11-study-plan-pure

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
PURE finite study-plan math `lib/study-plan.ts` — from exam date + due/unseen counts → an honest
daily quota with a feasibility flag. Behaviour is pinned by a FROZEN oracle. DONE when (verify.sh
exits 0):

1. Exports `computeStudyPlan(input)` where
   `input: { examDate: string | null; todayKey: string; dueCount: number; unseenCount: number;
   defaultGoal: number }` → `{ daysLeft: number | null; dailyQuota: number; feasible: boolean;
   message: string }`. Also exports `MAX_DAILY_QUOTA = 40` (sustainable daily ceiling).
2. Contract (`workRemaining = unseenCount + dueCount`; day keys parsed to UTC day indices):
   - `examDate === null` → `{ daysLeft: null, dailyQuota: defaultGoal, feasible: true, message }`;
   - `examDate` present, `daysLeft = max(0, idx(examDate) − idx(today))`:
     - `workRemaining === 0` → maintenance: `dailyQuota = defaultGoal`, `feasible = true`;
     - else `daysLeft === 0` → `dailyQuota = workRemaining`, `feasible = workRemaining <= defaultGoal`;
     - else → `dailyQuota = ceil(workRemaining / daysLeft)`, `feasible = dailyQuota <= MAX_DAILY_QUOTA`.
   - `message` is a NON-EMPTY Ukrainian string that branches on `feasible` (honest "не встигнете за N
     днів" style when infeasible).
3. FROZEN ORACLE (assert `daysLeft`, `dailyQuota`, `feasible`; `message` must be non-empty):
   - `{null, "2026-07-02", due:10, unseen:100, goal:15}`        → daysLeft null, quota 15, feasible true
   - `{"2026-07-12","2026-07-02", due:20, unseen:100, goal:15}` → daysLeft 10, quota 12, feasible true
   - `{"2026-07-04","2026-07-02", due:10, unseen:190, goal:15}` → daysLeft 2,  quota 100, feasible false
   - `{"2026-07-12","2026-07-02", due:0,  unseen:0,   goal:15}` → daysLeft 10, quota 15, feasible true (done→maintenance)
   - `{"2026-07-02","2026-07-02", due:10, unseen:20,  goal:15}` → daysLeft 0,  quota 30, feasible false
   - `{"2026-07-02","2026-07-02", due:5,  unseen:5,   goal:15}` → daysLeft 0,  quota 10, feasible true
4. `lib/study-plan.test.ts` covers no-date / tight-date / done-user / daysLeft-0 boundary; `npm test`
   exits 0; `npm run typecheck` exits 0.

## Constraints / decisions
- PURE: no clock/DB/randomness/JSX; NO `@/…` imports (self-contained) so the oracle smoke resolves via
   a relative import. Day-key parse is deterministic (not a `now` read).
- `MAX_DAILY_QUOTA = 40` is the honesty ceiling — above it the plan flags infeasible rather than lying.

## Plan
- [x] Implement computeStudyPlan + MAX_DAILY_QUOTA.
- [x] Unit cases; run oracle.

## Next
- [ ] Done — verify.sh green (oracle + typecheck). No further increment.

## Artifacts
- lib/study-plan.ts — computeStudyPlan + MAX_DAILY_QUOTA (pure, self-contained).
- lib/study-plan.test.ts — 6 unit cases (no-date / comfortable / tight / done-user / daysLeft-0 boundaries).

## Log
- 2026-07-02 planner: task authored; plan oracle frozen.
- 2026-07-02T00:00Z ClPcs-Mac-mini: wrote lib/study-plan.ts (pure math: no-date maintenance, workRemaining=0 maintenance, daysLeft=0 all-on-one-day, else ceil/daysLeft with MAX_DAILY_QUOTA=40 honesty ceiling; UTC dayIndex via Date.UTC, Ukrainian messages branching on feasible) + lib/study-plan.test.ts (mirrors login-throttle.test.ts style). verify.sh green: frozen oracle OK, npx vitest list finds suite, typecheck clean. Status → done.

## Verify
**Last verify:** PASS (2026-07-01T23:29:38Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T23:30:22Z)
