# Task: wave3-feat-04-study-streak-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add a PURE `studyStreak` function (consecutive active days) with colocated unit tests, plus a configurable
daily-goal constant. Spec B (the pure-helper half). No DB and no dashboard rendering here (task 05 wires it).

1. New file `lib/streak.ts` exports a pure function
   `studyStreak(activityDates: Date[] | number[]): { current: number; longest: number }`.
2. The function buckets timestamps into CALENDAR DAYS in a single documented timezone (UTC), and a doc
   comment at the top of the function states the timezone explicitly (e.g. "days bucketed in UTC").
   `current` = length of the consecutive-day run ending at the most recent activity day; `longest` = the
   longest consecutive-day run anywhere in the input. Multiple activities on the same day count once.
3. Edge cases hold: empty input → `{ current: 0, longest: 0 }`; a single day → `{ current: 1, longest: 1 }`;
   duplicate timestamps within one day do not inflate the count; both `Date[]` and `number[]` (epoch ms)
   inputs are accepted and produce identical results.
4. `lib/streak.ts` is PURE: it does NOT contain any of the tokens `server-only`, `@/lib/db`,
   `@prisma/client`, or `lib/generated`, AND it does NOT call `Date.now()` / `new Date()` with no argument
   (it must be deterministic — "today" is not read from the clock; `current` is anchored at the most recent
   activity day in the input).
5. `lib/constants.ts` exports a numeric constant `DAILY_GOAL_ANSWERS` (a positive integer, the configurable
   daily answer goal) with a short comment marking it CONFIGURABLE.
6. `lib/streak.test.ts` imports `studyStreak` from `@/lib/streak` and covers: empty, single day, a
   consecutive run, a broken run (gap resets `current` but `longest` remembers the earlier run),
   same-day duplicates, and Date-vs-epoch equivalence.
7. `npm test` exits 0 (zero failures) and includes `lib/streak.test.ts`; `npm run typecheck` exits 0.

## Constraints / decisions
- Pure module only — mirror the style of `lib/session-resume.ts` / `lib/mistakes.ts`. No React, no DB.
- Bucket by UTC day via `Math.floor(ms / 86_400_000)` (or equivalent) so day boundaries are deterministic
  and timezone-documented; do NOT use locale/`toLocaleDateString`.
- `current` is the run ending at the LATEST day present in the input (not "today"), keeping the function a
  pure transform of its argument. The server layer (task 05) decides whether the latest day is "today".
- Put `DAILY_GOAL_ANSWERS` in `lib/constants.ts` (pure, already imported widely) — not buried in the page.
- Non-Goal: any DB aggregation, "answered today" counting, or dashboard rendering (task 05).

## Plan
- [x] Write `lib/streak.ts` (`studyStreak`, UTC day-bucketing, doc comment).
- [x] Add `DAILY_GOAL_ANSWERS` to `lib/constants.ts`.
- [x] Write `lib/streak.test.ts` (cases above); `npm test` + `npm run typecheck`; run verify.sh.

## Done
- [x] `lib/streak.ts`: pure `studyStreak` — unique UTC day indices via `Math.floor(ms/86_400_000)`,
  `longest` scan + `current` walk-back from latest day. Accepts `Date[]`/`number[]`, never reads the clock.
- [x] `lib/constants.ts`: `DAILY_GOAL_ANSWERS = 20` (CONFIGURABLE).
- [x] `lib/streak.test.ts`: empty / single / run / gap / same-day dup / Date-vs-epoch / order-insensitive.
- [x] verify.sh PASS — typecheck clean, 108 unit tests pass (streak.test.ts included).

## Next
- [ ] (none — Goal met, verify.sh green)

## Artifacts
- lib/streak.ts — pure consecutive-active-days streak.
- lib/streak.test.ts — unit tests.
- lib/constants.ts — adds `DAILY_GOAL_ANSWERS`.
- tasks/wave3-feat-04-study-streak-pure/verify.sh — purity + export + constant + tests gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17 12:27 UTC ClPcs-Mac-mini: implemented pure `studyStreak` (UTC day-index bucketing, dedup,
  `longest` scan + `current` walk-back from latest day) in `lib/streak.ts`; added `DAILY_GOAL_ANSWERS`
  to `lib/constants.ts`; wrote 7 colocated tests in `lib/streak.test.ts` (mirrors session-resume.test.ts
  style). verify.sh PASS — typecheck clean, 108/108 unit tests pass. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T12:28:31Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T12:29:32Z)
