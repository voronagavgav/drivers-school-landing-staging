# Task: wave15-09-diagnostic-withhold-reveal

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-03T10:07Z
**Last compute:** mac-mini

## Goal
DIAGNOSTIC withholds per-item correctness until finish, exam-style (spec §D / 03-learning-regimes §6:
"exam/diagnostic withhold until finish") — SERVER side only (runner presentation is wave15-12).
PASS = ALL true:

1. `showsImmediateFeedback` (lib/server/test-engine.ts) returns false for BOTH "EXAM_SIMULATION" and
   "DIAGNOSTIC" (grep DIAGNOSTIC inside/adjacent to that fn); the DIAGNOSTIC response path is the
   SAME code path the exam uses (shared helper/branch), not a parallel copy.
2. Integration proof — `lib/server/diagnostic-withhold.integration.test.ts`;
   `npx vitest run --config vitest.integration.config.ts lib/server/diagnostic-withhold.integration.test.ts`
   exits 0, proving via the REAL server fns:
   a. Start DIAGNOSTIC (fixture, FRESH user) → `submitAnswer` response has NO `isCorrect` key and NO
      `correctOptionId` key (assert `"isCorrect" in res === false`), i.e. `{ recorded: true }` only.
   b. First-seed: the user had ZERO ReviewState rows before; after answering ≥3 questions,
      ReviewState rows exist for exactly the answered questionIds (normal submitAnswer path — spec §D
      "DIAGNOSTIC answers seed ReviewState").
   c. ReviewLog has exactly one row per answer (no duplicated/forked FSRS write).
   d. `finishSession` on the diagnostic returns totals and the session is COMPLETED (result
      computation works for the new mode).
   e. Contrast guard: a QUICK session's submitAnswer response DOES contain `isCorrect` (immediate
      reveal for the other new modes unchanged).
3. No pre-finish leak via page data: getSessionState (or whatever the /test/[id] page passes the
   runner) exposes NO per-option correctness for an IN_PROGRESS DIAGNOSTIC — assert in the
   integration test on the actual state object (per wave15-01 finding (d); if the payload is already
   correctness-free for ALL modes, assert that fact for a diagnostic session and record it in the Log).
4. `npm test` exits 0; `npx tsc --noEmit` exits 0; both frozen-oracle sha checks pass.

## Constraints / decisions
- Do NOT fork the write path: recordReview, bumpStudyDay, mistake dual-write all stay single-path —
  ONLY the RESPONSE shape gates on mode (spec §B: "FSRS recordReview on submitAnswer already fires
  for every mode — do not duplicate or fork").
- Existing exam behavior byte-identical (its tests/audit asserts must not move).
- High stakes: an answer-key leak pre-finish silently invalidates the diagnostic — hence Evaluate: yes.

## Next
- [x] Read wave15-01 finding (d); flip showsImmediateFeedback for DIAGNOSTIC; write the integration file.
- Goal met — verify.sh green. Nothing further unless Evaluation rejects.

## Artifacts
- lib/server/test-engine.ts · lib/server/diagnostic-withhold.integration.test.ts

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T10:07Z ClPcs-Mac-mini: Flipped `showsImmediateFeedback` (lib/server/test-engine.ts:254) to
  `mode !== "EXAM_SIMULATION" && mode !== "DIAGNOSTIC"` — DIAGNOSTIC now rides the SAME withheld
  `{ recorded: true }` branch the exam uses (submitAnswer:467), no forked write path. Wrote
  lib/server/diagnostic-withhold.integration.test.ts (4 tests, all via real server fns): (a) DIAGNOSTIC
  submitAnswer returns `{recorded:true}` only — no isCorrect/correctOptionId/explanation keys; (b) fresh
  fixture user had 0 ReviewState → after 3 answers, ReviewState exists for exactly those questionIds;
  (c) exactly one ReviewLog per answer; (d) finishSession returns totals + COMPLETED; (e) contrast QUICK
  submitAnswer DOES carry isCorrect. Req 3: getSessionState already withholds per-option isCorrect
  (undefined) + explanation (null) for ANY IN_PROGRESS mode (reveal = COMPLETED only) — asserted on the
  live diagnostic state object; no payload change needed. verify.sh GREEN (both frozen oracles intact,
  tsc 0, integration 4/4, unit 571/571).

## Verify
**Last verify:** PASS (2026-07-03T07:07:34Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T07:08:53Z)
