# Task: wave10f-02-fsrs-prior-difficulty-fix

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** ClPcs-Mac-mini

## Artifacts
- `lib/fsrs/schedule.ts` — subsequent-review branch reordered (stability from prior difficulty).

## Goal
Fix the MAJOR prior-difficulty bug in `lib/fsrs/schedule.ts`: the recall/lapse stability update currently
feeds the ALREADY-UPDATED difficulty. Reference FSRS-5 computes next stability from the PRE-review
difficulty. Compute `stability` from `state.difficulty` (prior) FIRST, THEN `difficulty = nextDifficulty(...)`.
This is the fix that turns wave10f-01's `reference-vectors.test.ts` from RED to GREEN.

Boolean acceptance criteria:
1. In `schedule()`'s subsequent-review branch, `recallStability`/`forgetStability` are called with the
   PRIOR difficulty (`state.difficulty`), not the newly-computed one; `difficulty = nextDifficulty(...)`
   is computed AFTER (or independently of) the stability call.
2. `npx vitest run lib/fsrs/reference-vectors.test.ts` exits 0 (the external golden vectors now pass).
3. `npm test` exits 0 with `reference-vectors` now part of the green gate — no test excluded/skipped.
4. `npm run typecheck` exits 0.
5. The whole `lib/fsrs/` purity gate still holds (no `Math.random`/`Date.now`/`new Date`/`server-only`/
   `@/lib/db`/`@prisma/client`/`lib/generated` tokens introduced, comments included).

## Constraints / decisions
- Depends on wave10f-01 (the reference test must exist). This task flips the two-step guard to green.
- Do NOT alter tolerances or vendored numbers in `reference-vectors.test.ts` to force a pass — the fix is
  in `schedule.ts` only. Existing `schedule.test.ts` assertions that encode the OLD (buggy) ordering must
  be corrected to the reference behaviour, not the other way round.
- Non-Goal: curve-constant decoupling (wave10f-03), grade logic (wave10f-04). Touch `schedule.ts` (and
  minimally its own `schedule.test.ts`) only.

## Plan
- [x] Reorder the DSR update: `stability = recall/forget(state.difficulty, state.stability, r, grade)`
      then `difficulty = nextDifficulty(state.difficulty, grade)`.
- [x] Run `reference-vectors.test.ts`; fix any residual formula-ordering mismatch until it passes.
- [x] Correct any self-referential assertions in `schedule.test.ts` that pinned the buggy ordering.
      (None needed — `schedule.test.ts` did not encode the buggy ordering; all 328 tests green.)
- [x] `npm test` + `npm run typecheck` both 0.

## Next
- [ ] Done — no further increments. (Goal met; verify re-run by driver.)

## Log
- 2026-07-01 laptop: Planned. Greens the wave10f-01 external gate.
- 2026-07-01 ClPcs-Mac-mini: Reordered `schedule()`'s subsequent-review branch to compute
  `stability` from the PRIOR difficulty (`state.difficulty`) FIRST, then `difficulty = nextDifficulty(...)`.
  `npx vitest run lib/fsrs/reference-vectors.test.ts` → 4 passed. `npm test` → 32 files / 328 tests
  passed (reference-vectors now in the green gate, none skipped). `npm run typecheck` → 0. Purity grep
  on schedule.ts → no banned tokens. All 5 acceptance criteria met → Status: done.

## Verify
**Last verify:** PASS (2026-07-01T20:21:43Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:22:51Z)
