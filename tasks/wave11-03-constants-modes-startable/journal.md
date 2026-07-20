# Task: wave11-03-constants-modes-startable

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
Add the Wave-11 constants + the `SPACED_REVIEW` mode, and make `ADAPTIVE_REVIEW` + `SPACED_REVIEW`
STARTABLE. Pure constants/typing only — no server/UI logic. DONE when (verify.sh exits 0):
1. `lib/constants.ts` adds and exports numeric constants: `ADAPTIVE_REVIEW_SIZE = 15`,
   `READINESS_MIN_SEEN = 20`, `READINESS_MOCK_WINDOW = 10`.
2. `TEST_MODES` includes `"SPACED_REVIEW"`; `MODE_LABEL` has a Ukrainian label for it
   (e.g. `SPACED_REVIEW: "Інтервальне повторення"`).
3. `STARTABLE_MODES` now INCLUDES both `ADAPTIVE_REVIEW` and `SPACED_REVIEW` (the previous
   `.filter(m !== "ADAPTIVE_REVIEW")` exclusion is removed / both are startable). `StartableMode`
   type still resolves.
4. `lib/validation.ts` `startTestSchema.mode` = `z.enum(STARTABLE_MODES, …)` still compiles and now
   accepts `"ADAPTIVE_REVIEW"` and `"SPACED_REVIEW"` (assert: `startTestSchema.safeParse({mode:
   "ADAPTIVE_REVIEW"}).success === true` and same for `SPACED_REVIEW`). Add this assertion to
   `lib/validation.test.ts` (or a new `constants.test.ts`) — a real parse, not a grep.
5. `npm run typecheck` exits 0; `npm test` exits 0.

## Artifacts
- lib/constants.ts (constants + SPACED_REVIEW mode + STARTABLE flip)
- lib/validation.test.ts (real-parse accepts for both adaptive modes)

## Constraints / decisions
- This is the FOUNDATION for wave11-05 (queue-driven sessions). Flipping STARTABLE here is safe ONLY
  because startSession will branch on these modes in wave11-05; until then a real start would fail —
  acceptable in the backlog because 05 depends on 03. Do NOT ship 03 to prod alone.
- `EMPTY_NOTICE` copy for SPACED_REVIEW's "nothing due" is a DASHBOARD concern; the spec says W12
  owns the redirect target UI. Do NOT add a learner-facing dashboard notice here beyond what already
  exists — the action-level typed signal is wave11-05.
- No new mode LABEL should claim official-exam status (legal positioning).

## Plan
- [x] Add constants + SPACED_REVIEW to TEST_MODES/MODE_LABEL.
- [x] Remove the ADAPTIVE_REVIEW exclusion from STARTABLE_MODES.
- [x] Add a real parse assertion to a unit test; typecheck + test.

## Next
- [ ] (none — Goal met; verify.sh exits 0)

## Log
- 2026-07-02 planner: task authored.
- 2026-07-02T01:47Z ClPcs-Mac-mini: Added ADAPTIVE_REVIEW_SIZE=15, READINESS_MIN_SEEN=20,
  READINESS_MOCK_WINDOW=10 to lib/constants.ts; added "SPACED_REVIEW" to TEST_MODES + MODE_LABEL
  ("Інтервальне повторення"); flipped STARTABLE_MODES to TEST_MODES (both adaptive modes now
  startable). Updated lib/validation.test.ts: replaced the ADAPTIVE_REVIEW-rejects case with two
  real-parse accepts (ADAPTIVE_REVIEW + SPACED_REVIEW). typecheck 0, validation.test.ts 43 passed,
  verify.sh exits 0. Status → done.

## Verify
**Last verify:** PASS (2026-07-01T22:47:49Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T22:48:25Z)
