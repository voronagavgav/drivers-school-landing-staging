# Task: wave5-03-due-count-server-helper

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-22
**Last compute:** cloud-agent

## Goal
Spec A (server wiring). Add a `lib/server/*` helper that counts the current user's mistakes that are
DUE for review now, reusing the pure `dueMistakes` (wave5-02). DB orchestration only — no UI here
(task 04), no pure-logic changes. Depends on wave5-02.

1. `lib/server/mistakes.ts` exports an async helper `countDueMistakes(userId: string, now?: number):
   Promise<number>` (default `now = Date.now()`) that:
   a. fetches the user's ACTIVE mistakes via `prisma.userMistake.findMany({ where: { userId,
      status: "ACTIVE" } })`,
   b. maps each row to the `EngineMistake` shape (`lastMistakeAt: row.lastMistakeAt.getTime()`,
      `mistakeCount`, `correctRepeatCount`, `questionId`, `topicId`),
   c. returns `dueMistakes(mapped, now).length`.
2. The helper imports `dueMistakes` from `@/lib/test-engine/selection` (the pure layer) — it does NOT
   re-implement the due predicate or the interval ladder.
3. `now` is injectable (a param with a `Date.now()` default) so the integration test (wave5-05) can
   pass a fixed clock; the only clock read is the default-arg `Date.now()`.
4. `npm run typecheck` exits 0.
5. `npm run test:integration` exits 0 with ZERO failures (no regression; this task does not require its
   own integration test — that is wave5-05).

## Constraints / decisions
- Put the helper in the EXISTING `lib/server/mistakes.ts` (home of `listMistakes` /
  `recordMistakeOutcome`) — do not create a new server file.
- Reuse the exact active-mistake query + EngineMistake mapping already used in
  `lib/server/test-engine.ts` for the MISTAKE_PRACTICE pool; do not change that pool.
- This file is a SERVER module (`lib/server/*`) and may import prisma/`@/lib/db` — that is correct here;
  purity rules apply only to `lib/test-engine/*` and `lib/*.ts` pure helpers.
- Non-Goal: dashboard rendering, ordering the due set, any change to `recordMistakeOutcome` /
  resolution thresholds / other modes.

## Plan
- [x] Add `countDueMistakes` to `lib/server/mistakes.ts` importing `dueMistakes`.
- [x] `npm run typecheck`; run verify.sh.

## Done
- [x] Added `countDueMistakes(userId, now = Date.now())` to `lib/server/mistakes.ts` — fetches
      ACTIVE userMistakes, maps to EngineMistake shape, returns `dueMistakes(mapped, now).length`.
      Reuses the pure predicate (imports from `@/lib/test-engine/selection`); typecheck 0;
      integration suite 58 passed / 2 skipped (no regression).

## Next
- [ ] (none — goal met; verify.sh should pass)

## Artifacts
- lib/server/mistakes.ts — adds `countDueMistakes`.
- tasks/wave5-03-due-count-server-helper/verify.sh — export + reuse + typecheck gate.

## Log
- 2026-06-22 cloud-agent: scaffolded by planner.
- 2026-06-22T22:08Z ClPcs-Mac-mini: added `countDueMistakes` to lib/server/mistakes.ts (mirrors the
  MISTAKE_PRACTICE query+mapping in lib/server/test-engine.ts, reuses pure `dueMistakes`). typecheck 0;
  integration 58 passed / 2 skipped. Status → done.

## Verify
**Last verify:** PASS (2026-06-22T19:08:59Z)

## Evaluation
**Last evaluation:** PASS (2026-06-22T19:09:33Z)
