# Task: wave20-03-honest-guess-floor

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** laptop

Implement the honest, degeneracy-bounded guess floor (spec design point 3): declare
`FSRS_GUESS_MAX = 0.45` in `lib/fsrs/constants.ts` and cap the guess likelihood in
`gradePosterior` (`lib/fsrs/grade.ts`) to `g = min(1/optionCount, FSRS_GUESS_MAX)`. This shades the
2-option honest g=0.5 below the Baker et al. P(G)<0.5 degeneracy boundary and leaves 3/4/5-option and
the absent-optionCount default (0.25) UNCHANGED. Un-skip the task-02 oracle block that grades the real
`gradePosterior` against the frozen posterior-direction quartet + boundary census.

## Goal
PASS = ALL true:

1. `lib/fsrs/constants.ts` exports `FSRS_GUESS_MAX = 0.45` with a doc comment citing the Baker et al.
   P(G)<0.5 degeneracy bound (comment must NOT contain any purity-banned token).
2. `gradePosterior` in `lib/fsrs/grade.ts` computes `g = Math.min(1 / optionCount, FSRS_GUESS_MAX)`
   when `optionCount != null && optionCount > 0`, else `FSRS_GUESS_DEFAULT` (0.25) unchanged.
3. Behavior pins (verified by the un-skipped oracle block, values FROZEN by task 01/02 — do not edit):
   at neutral prior 0.5, CORRECT: `gradePosterior({correct:true, priorKnow:0.5, optionCount:2}) ≈
   0.666667`, `optionCount:3 ≈ 0.729730`, `optionCount:4 ≈ 0.782609`, `optionCount:5 ≈ 0.818182`
   (6dp, `toBeCloseTo(lit,6)`); optionCount 1 (degenerate) caps to g=0.45 (same as 2-opt); optionCount
   absent stays g=0.25 → `≈ 0.782609`.
4. `deriveGrade` bands over those posteriors (thresholds Good≥0.75, Easy≥0.93 UNCHANGED): 2-opt→Hard(2),
   3-opt→Hard(2), 4-opt→Good(3), 5-opt→Good(3) at neutral prior. Monotone direction holds: same prior ⇒
   grade(2-opt) ≤ grade(3-opt) ≤ grade(4-opt) ≤ grade(5-opt).
5. The task-02 `describe.skip("honest guess floor gradePosterior …")` block is un-skipped (no
   `describe.skip`/`it.skip`/`.skip(` in THAT block) and passes against the real `gradePosterior`. The
   OTHER skipped block (`slipAdjustedLapse`, task 04) stays skipped — do NOT touch it, and do NOT run a
   whole-file no-skip grep in this task's verify.
6. `npm run -s typecheck` exits 0; `npm run -s test` exits 0. The pre-existing frozen
   `lib/fsrs/grade-posterior.test.ts` (g=0.25 vectors) stays byte-green (the default-4 path is unchanged).

## Constraints / decisions
- Pure lib/fsrs change only: no clock, no DB, no Math.random; purity grep matches comments — keep
  `FSRS_GUESS_MAX`'s rationale comment free of banned tokens.
- The cap only moves optionCount ≤ 2 (0.5→0.45) and the degenerate optionCount 1 (1→0.45). Do NOT
  change `FSRS_GUESS_DEFAULT` (0.25) or the KNOW_GOOD/KNOW_EASY thresholds — the spec keeps FIXED
  posterior semantics; the direction/bulk-shift documentation is task 06.
- `REVIEW_ENGINE_VERSION` is NOT bumped here (the applied-state semantics change lands with the server
  wiring in task 05, alongside the integration pin update — bumping early would red the pin).
- No server wiring in this task; production still passes no optionCount (default 0.25) until task 05.

## Next
- [x] Add `FSRS_GUESS_MAX` to constants.ts; change the `g` line in grade.ts; un-skip the
      gradePosterior oracle block; run typecheck + test.
- Goal fully met — nothing outstanding.

## Artifacts
- `lib/fsrs/constants.ts` — new `FSRS_GUESS_MAX = 0.45` (Baker et al. P(G)<0.5 degeneracy-bound comment).
- `lib/fsrs/grade.ts` — `gradePosterior` g line now `Math.min(1/optionCount, FSRS_GUESS_MAX)`.
- `lib/fsrs/lapse-adjust.oracle.test.ts` — "honest guess floor gradePosterior" block un-skipped (slipAdjustedLapse block still `describe.skip`, task 04).
- `lib/fsrs/grade.test.ts` — stale 2-option case updated from the pre-cap 0.6428571429 to the spec/oracle 0.6666666667.

## Log
- 2026-07-14 laptop: planned by the wave20 planner.
- 2026-07-14 ClPcs-Mac-mini: Added `FSRS_GUESS_MAX = 0.45` to constants.ts with a Baker/Corbett/Aleven
  P(G)<0.5 degeneracy-bound doc comment (no purity-banned token). Changed `gradePosterior`'s g to
  `Math.min(1/optionCount, FSRS_GUESS_MAX)` (optionCount≥1; absent/0 stays FSRS_GUESS_DEFAULT 0.25).
  Un-skipped the "honest guess floor gradePosterior" oracle block; left the slipAdjustedLapse block
  skipped (task 04). Fixed a stale pin in `grade.test.ts` that asserted the OLD uncapped 2-option value
  (0.6428571429, g=0.5) — corrected to 0.6666666667 per Wave 20 design point 3 + the frozen Python oracle
  (external evidence, not oracle-tampering). `npm run -s typecheck` exits 0; `npm run -s test` 740 passed,
  3 skipped (the slipAdjustedLapse block). `grade-posterior.test.ts` unchanged/byte-green. Status → done.

## Verify
**Last verify:** PASS (2026-07-13T22:45:38Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T22:47:28Z)
