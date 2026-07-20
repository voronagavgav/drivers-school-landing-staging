# Task: wave3-feat-03-wire-mistake-spacing

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Wire the pure `spacedMistakeOrder` (task 02) into the `MISTAKE_PRACTICE` selection path WITHOUT changing
the behaviour of any other mode. Spec A: "Wire it into `MISTAKE_PRACTICE` selection without changing
behaviour of other modes." (Depends on task 02.)

1. `lib/server/test-engine.ts` imports `spacedMistakeOrder` from `@/lib/test-engine/selection`.
2. Inside `startSession`, the `MISTAKE_PRACTICE` branch (where `mode === "MISTAKE_PRACTICE"`) orders the
   user's active mistakes with `spacedMistakeOrder(...)` (passing `Date.now()` as `now`) instead of
   `orderMistakesByPriority(...)`. The mapped `EngineMistake` shape (`questionId`, `topicId`,
   `mistakeCount`, `correctRepeatCount`, `lastMistakeAt: m.lastMistakeAt.getTime()`) is preserved.
3. No other branch of `startSession` changes: the `EXAM_SIMULATION`, `TOPIC_PRACTICE`, `MIXED_PRACTICE`,
   and `SAVED_QUESTIONS` paths and their calls to `selectQuestions` / `computeWeakTopicIds` are byte-for-byte
   unchanged (the diff touches only the MISTAKE branch + the import line).
4. `npm run typecheck` exits 0.
5. `npm test` exits 0 (zero failures).
6. `npm run test:integration` exits 0 — the existing engine + access-control + finish-idempotency suites
   still pass (MISTAKE_PRACTICE still selects only active, published, non-archived mistake questions).

## Constraints / decisions
- Minimal wiring: change ONLY the `MISTAKE_PRACTICE` ordering call + add the import. Do not refactor the
  surrounding query, the `selectQuestions` call, or any other mode.
- `selectQuestions` already treats `MISTAKE_PRACTICE` as caller-pre-ordered (`[...pool]`), so the
  pre-ordering swap fully determines mistake order — no change to `selection.ts`'s `selectQuestions` needed.
- It is acceptable for `orderMistakesByPriority` to become unused by `test-engine.ts` after this swap; do
  NOT delete it (its unit tests in `selection.test.ts` still exercise it).
- Non-Goal: changing how many mistake questions are selected (`DEFAULT_PRACTICE_QUESTION_COUNT`), the
  active/published filter, analytics events, or any UI.

## Plan
- [x] Add the `spacedMistakeOrder` import; swap the call in the MISTAKE branch; pass `Date.now()`.
- [x] `npm run typecheck`, `npm test`, `npm run test:integration`; run verify.sh.

## Done
- [x] Imported `spacedMistakeOrder` from `@/lib/test-engine/selection` (dropped the now-unused
      `orderMistakesByPriority` import); MISTAKE branch maps mistakes → `mapped`, then
      `spacedMistakeOrder(mapped, Date.now())`. Other modes byte-for-byte unchanged.
- [x] typecheck 0, unit 101/101, integration 11/11, verify.sh → PASS.

## Next
- [ ] (none — goal met; verify.sh passes)

## Artifacts
- lib/server/test-engine.ts — MISTAKE_PRACTICE now ordered by `spacedMistakeOrder`.
- tasks/wave3-feat-03-wire-mistake-spacing/verify.sh — import/usage + typecheck + unit + integration gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T15:25Z ClPcs-Mac-mini: wired `spacedMistakeOrder(mapped, Date.now())` into the
  MISTAKE_PRACTICE branch of `startSession`; swapped the import (removed unused
  `orderMistakesByPriority`). typecheck 0, unit 101/101, integration 11/11, verify.sh PASS. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T12:25:20Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T12:26:19Z)
