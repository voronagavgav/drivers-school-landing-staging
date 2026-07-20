# Task: mvp-finish-06-add-recent-readiness-scores-helper

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add the server query that loads a user's recent readiness scores (oldest→newest) so the dashboard
(task 07) can pass them to the existing pure `readinessTrend()`.

1. `lib/server/progress.ts` exports an async function (name `getRecentReadinessScores`) with
   signature `(userId: string, categoryId?: string | null) => Promise<number[]>`.
2. It queries `prisma.progressSnapshot` for the given `userId`, scoped by `categoryId` when one is
   provided (mirroring how `computeProgress` scopes by category), and returns the `readinessScore`
   values as a `number[]` ordered OLDEST→NEWEST.
3. It limits to the most recent N snapshots using a module-local window constant (e.g.
   `RECENT_READINESS_WINDOW`, value ~5–10), mirroring the existing `RECENT_EXAM_WINDOW` const pattern
   in the same file. (Query with `orderBy createdAt desc, take N` then reverse, OR `orderBy asc` over
   the last N — the RETURNED array must be oldest→newest.)
4. The file keeps `import "server-only";`; existing exports (`computeProgress`, `computeWeakTopicIds`,
   `snapshotProgress`) are unchanged.
5. `npm run typecheck` exits 0; `npm test` still passes.

## Constraints / decisions
- Edit ONLY `lib/server/progress.ts` (add the new export + window const). Do NOT touch the dashboard
  page (task 07), `lib/progress.ts`, `lib/constants.ts`, or `prisma/schema.prisma`.
- Use a module-local const for the window (consistent with the existing `RECENT_EXAM_WINDOW = 5` in
  this file) rather than adding to `lib/constants.ts` — keeps scope minimal and matches local style.
- `select: { readinessScore: true }` only (do not over-fetch). Return raw numbers; do NOT call
  `readinessTrend` here (that is the dashboard's job in task 07) — this task only supplies the data.
- Non-Goal: classification, labels, UI, category-picker logic. Just the ordered score array.

## Plan
- [x] Add `RECENT_READINESS_WINDOW` const + `getRecentReadinessScores(userId, categoryId?)` to
      `lib/server/progress.ts`.
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] Added `RECENT_READINESS_WINDOW = 8` + `getRecentReadinessScores(userId, categoryId?)` to
      `lib/server/progress.ts`: queries `prisma.progressSnapshot` (category-scoped like
      `computeProgress`), `select: { readinessScore: true }`, `orderBy createdAt desc` `take N`
      then `.reverse()` → oldest→newest `number[]`. server-only + existing exports untouched.
      typecheck 0, npm test 38 passed, verify.sh PASS.

## Next
- [ ] None — task complete (verify.sh PASS). Next backlog task: mvp-finish-07 wires the trend into
      the dashboard readiness card using this helper.

## Artifacts
- tasks/mvp-finish-06-add-recent-readiness-scores-helper/verify.sh — export + oldest→newest + typecheck/test
- lib/server/progress.ts — `getRecentReadinessScores`

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T09:25Z ClPcs-Mac-mini: implemented `getRecentReadinessScores` + `RECENT_READINESS_WINDOW = 8`
  in lib/server/progress.ts (category-scoped query, oldest→newest reverse). typecheck 0, npm test 38
  passed, verify.sh PASS. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T06:25:13Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T06:25:48Z)
