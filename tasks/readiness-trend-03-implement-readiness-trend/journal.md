# Task: readiness-trend-03-implement-readiness-trend

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-16
**Last compute:** cloud-agent

## Goal
Implement the pure trend-classification function in `lib/progress.ts`.

1. `lib/progress.ts` exports a function `readinessTrend` whose signature is
   `readinessTrend(scores: number[]): "IMPROVING" | "DECLINING" | "STABLE"`.
2. `scores` are treated as ordered oldest→newest. With `scores.length < 2`
   the function returns `"STABLE"`.
3. The function compares the most recent score (`scores[last]`) against the mean of
   the earlier scores (`scores[0..last-1]`): if `(latest - earlierMean) > THRESHOLD`
   → `"IMPROVING"`; if `(latest - earlierMean) < -THRESHOLD` → `"DECLINING"`;
   otherwise `"STABLE"`. THRESHOLD is `READINESS_TREND_THRESHOLD` imported from
   `@/lib/constants` (no magic number in `progress.ts`).
4. The function is PURE: no DB import, no I/O, no mutation of the input array.
   `lib/progress.ts` still imports only from `@/lib/constants` (plus types).
5. `npm run typecheck` exits 0.
6. `npm test` exits 0 (still 29 passing — tests for this function arrive in task 04).

## Constraints / decisions
- ONLY edit `lib/progress.ts`. Do NOT add/modify tests here (task 04). Do NOT touch
  `lib/constants.ts` (constant added in task 02 — depends on task 02 being done).
- Match existing style: named `export function`, JSDoc comment above it consistent
  with the other functions in the file.
- Use the imported `READINESS_TREND_THRESHOLD`, not a literal `5`.
- "Earlier scores" for the 2-element case `[a, b]` = `[a]`, so mean = `a`, compared
  against `b`. Keep the comparison strictly `>` / `<` against the threshold (a diff
  exactly equal to the threshold is STABLE).
- Non-Goal: UI wiring, DB reads, or wiring into `estimateReadiness`.

## Plan
- [x] Add `READINESS_TREND_THRESHOLD` to the existing `@/lib/constants` import in `lib/progress.ts`.
- [x] Implement + export `readinessTrend` with JSDoc, using mean-of-earlier vs latest.
- [x] Run `npm run typecheck` and `npm test`.

## Done
- [x] Implemented and exported `readinessTrend(scores: number[])` in `lib/progress.ts` using `READINESS_TREND_THRESHOLD`.

## Next
- [ ] (none — goal met; unit tests for the function land in task 04)

## Artifacts
- tasks/readiness-trend-03-implement-readiness-trend/verify.sh — export + purity + behavior smoke + typecheck
- lib/progress.ts — `readinessTrend` function + constant import

## Log
- 2026-06-16 cloud-agent: scaffolded by planner.
- 2026-06-16T23:39Z ClPcs-Mac-mini: implemented + exported pure `readinessTrend` (mean-of-earlier vs latest, strict `>`/`<` against `READINESS_TREND_THRESHOLD`, <2 scores → STABLE, no mutation via slice). `npm run typecheck` exits 0; `npm test` 29 passing.

## Verify
**Last verify:** PASS (2026-06-16T20:40:22Z)

## Evaluation
**Last evaluation:** PASS (2026-06-16T20:41:54Z)
