# Task: readiness-trend-02-add-trend-threshold-constant

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-16
**Last compute:** cloud-agent

## Goal
Add the configurable trend threshold as a named constant, honoring the project rule
that tuning assumptions live in `lib/constants.ts`, not buried in code.

1. `lib/constants.ts` exports a numeric constant named `READINESS_TREND_THRESHOLD`
   with value `5`.
2. The constant is placed under the existing "Readiness / progress tuning" section
   and has a one-line comment explaining it is the point-difference threshold above
   which a readiness trend counts as IMPROVING / DECLINING (otherwise STABLE).
3. `npm run typecheck` exits 0.
4. `npm test` exits 0 (still 29 passing — no behavior change yet).

## Constraints / decisions
- ONLY edit `lib/constants.ts`. Do NOT touch `lib/progress.ts` or any test file in
  this task (the function consumes this constant in task 03).
- Value is `5` points, matching the spec's "small threshold (e.g. 5 points)".
- Use `export const` and the file's existing style (no default export, plain number).
- Non-Goal: implementing the trend function or its tests.

## Plan
- [x] Add `export const READINESS_TREND_THRESHOLD = 5;` with a comment under
      "Readiness / progress tuning" in `lib/constants.ts`.
- [x] Run `npm run typecheck` and `npm test`.

## Done
- [x] Added `READINESS_TREND_THRESHOLD = 5` with explanatory comment under the
      "Readiness / progress tuning" section of `lib/constants.ts`.
- [x] `npm run typecheck` exits 0; `npm test` exits 0 (29 passing, no behavior change).

## Next
- [ ] (none — goal met; constant consumed by task 03 readinessTrend).

## Artifacts
- tasks/readiness-trend-02-add-trend-threshold-constant/verify.sh — checks export + typecheck + tests
- lib/constants.ts — added `READINESS_TREND_THRESHOLD = 5` (lines 75-77)

## Log
- 2026-06-16 cloud-agent: scaffolded by planner.
- 2026-06-16 20:38 UTC ClPcs-Mac-mini: added READINESS_TREND_THRESHOLD = 5 + comment under "Readiness / progress tuning" in lib/constants.ts; npm run typecheck and npm test both exit 0 (29 passing). Goal met → Status: done.

## Verify
**Last verify:** PASS (2026-06-16T20:38:49Z)

## Evaluation
**Last evaluation:** PASS (2026-06-16T20:39:09Z)
