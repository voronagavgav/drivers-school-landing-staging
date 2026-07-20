# Task: wave3-feat-05-dashboard-streak-goal

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Surface the current study streak and a simple daily-goal indicator on the dashboard, deriving everything
from existing answer data (NO schema change). Spec B (the wiring half). Depends on task 04.

1. `lib/server/progress.ts` exports an async helper (e.g. `getStudyActivity(userId, categoryId?)`) that
   returns `{ activityDates: number[]; answeredToday: number }`, computed from the user's `TestAnswer`
   rows (use `answeredAt`), scoped by category when given. `answeredToday` counts answers whose UTC
   calendar day equals the current UTC day; `activityDates` are epoch-ms timestamps the pure
   `studyStreak` can bucket. The module keeps its `import "server-only"` + `@/lib/db` usage.
2. `app/(app)/dashboard/page.tsx` imports `studyStreak` from `@/lib/streak` and `DAILY_GOAL_ANSWERS` from
   `@/lib/constants`, calls the new server helper, and renders BOTH: (a) the current streak number with
   Ukrainian label text, and (b) a daily-goal indicator that shows answered-today against
   `DAILY_GOAL_ANSWERS` (e.g. «N / GOAL»).
3. The streak/goal block uses the existing design-system primitives (`Card`/`Stat`/`Badge`/`RoadProgress`
   from `@/components/ui`) — no raw unstyled markup, no new CSS framework.
4. `npm run typecheck` exits 0.
5. `npm test` exits 0 (zero failures).
6. `npm run build` exits 0 (the dashboard server component compiles).

## Constraints / decisions
- Derive from existing tables only — `TestAnswer.answeredAt` for activity/streak, no new Prisma model or
  migration. Confirm `prisma/schema.prisma` is NOT modified by this task.
- The page (server component) calls the pure `studyStreak(activity.activityDates)`; the DB helper only
  aggregates rows. Keep the pure/DB/UI split the repo already uses.
- "Today" for `answeredToday` is the current UTC day, matching the pure streak's UTC bucketing (documented
  in task 04) so the two indicators agree.
- Ukrainian copy only; reuse tone of existing dashboard strings.
- Non-Goal: a calendar/heatmap, configurable per-user goals, persisting streaks, or notifications. Just the
  current-streak number + a single daily-goal indicator.

## Plan
- [x] Add `getStudyActivity` to `lib/server/progress.ts`.
- [x] Render the streak + daily-goal block in the dashboard using `studyStreak` + `DAILY_GOAL_ANSWERS`.
- [x] `npm run typecheck`, `npm test`, `npm run build`; run verify.sh.

## Done
- [x] Implemented `getStudyActivity(userId, categoryId?)` in `lib/server/progress.ts`: aggregates
      `TestAnswer.answeredAt` (scoped by category via `testSession`) → `{ activityDates: number[];
      answeredToday: number }`, with "today" bucketed in UTC to match the pure `studyStreak`. typecheck green.
- [x] Wired `app/(app)/dashboard/page.tsx`: imports `studyStreak` from `@/lib/streak`, `DAILY_GOAL_ANSWERS`
      (already present, =20) from `@/lib/constants`, and `getStudyActivity` from `@/lib/server/progress`.
      Renders a 2-card block: streak number (label «Серія днів поспіль», `sub` = longest run) and daily-goal
      «N / GOAL» `Stat` + `RoadProgress` bar + a `Badge tone="go"` «Ціль виконано» when goal met.
      typecheck/​npm test (108 passed)/​npm build all exit 0; schema untouched.

## Next
- [ ] Goal met — nothing outstanding. (If the driver's verify.sh re-run flags anything, fix that.)

## Artifacts
- lib/server/progress.ts — adds `getStudyActivity`.
- app/(app)/dashboard/page.tsx — renders streak + daily-goal indicator.
- tasks/wave3-feat-05-dashboard-streak-goal/verify.sh — static wiring + typecheck + unit + build (+ optional browser) gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17 ClPcs-Mac-mini: added `getStudyActivity` + `StudyActivity` interface to lib/server/progress.ts
  (TestAnswer.answeredAt aggregation, category-scoped, UTC `answeredToday`). `npm run typecheck` exits 0.
- 2026-06-17 ClPcs-Mac-mini: wired the dashboard (fixing the prior FAIL "does not import from @/lib/streak").
  Added imports (`studyStreak`, `DAILY_GOAL_ANSWERS`, `getStudyActivity`), computed `streak`/`goalReached`,
  rendered the streak + daily-goal block (Card/Stat/Badge/RoadProgress, UA copy) before the Recommended-action
  card. Locally: typecheck 0, `npm test` 108 passed, `npm run build` compiled OK, schema clean. Status → done.


## Verify
**Last verify:** PASS (2026-06-17T12:33:11Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T12:35:16Z)
