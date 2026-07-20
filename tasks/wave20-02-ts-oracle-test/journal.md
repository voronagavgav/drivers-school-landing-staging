# Task: wave20-02-ts-oracle-test

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** ClPcs-Mac-mini

TESTS-ONLY (oracle freeze) — transcribe the 6dp literals printed by
`scripts/oracles/gen-wave20-oracles.py` (task 01) into a frozen TS oracle test file
`lib/fsrs/lapse-adjust.oracle.test.ts` BEFORE the `slipAdjustedLapse` module or the g-cap exist, so
the implementation cannot be tuned to a self-consistent test. Follows the wave19b-01 house pattern:
a NON-skipped local-helper self-consistency subset (grades the FROZEN VECTORS against the closed-form
math, no impl import) keeps `vitest list` collecting the file; a `describe.skip` block dynamic-imports
the unbuilt `./lapse-adjust` module (un-skipped by task 04); a SECOND `describe.skip` block imports the
capped `gradePosterior` and asserts the honest-guess-floor direction (un-skipped by task 03).

## Goal
PASS = ALL true:

1. `lib/fsrs/lapse-adjust.oracle.test.ts` exists; its header NAMES `scripts/oracles/gen-wave20-oracles.py`
   as the source and states "expected values from the Python oracle — never regenerate from the TS impl".
2. It defines LOCAL pure closed-form helpers (`bktPosterior`, `cappedGuess`, `logBlend`) and asserts,
   NON-skipped, the frozen literals from the Python `PREVERIFY-OUTPUT.txt` against those helpers:
   - the (a) blend fixtures (s=50→S'_log≈38.x, s=100→≈70.x, s=5→≈2.8x) to the 6dp literals from task 01;
   - the (g) posterior-direction quartet 0.666667 / 0.729730 / 0.782609 / 0.818182 (correct, prior 0.5,
     capped g for optionCount 2/3/4/5), asserted with `toBeCloseTo(lit, 6)` AND present verbatim as
     source literals so a `grep -Fq` on the exact string succeeds (per the wave19b-04 frozen-literal-grep
     learning: write trailing digits exactly as the Python prints them);
   - the (b) never-grow invariant (`logBlend` ≤ prior S) across the grid; (c) crush-on-weak bound;
     (d) monotone-in-π sequence; (e) repeated-wrong decreasing sequence; (f) boundary-census rows.
3. A `describe.skip("slipAdjustedLapse (impl — task 04 un-skips)", …)` block dynamic-imports the
   not-yet-written module via `const { slipAdjustedLapse } = await import("./lapse-adjust")` guarded by
   a `// @ts-expect-error` on the import line, and asserts the real fn reproduces the (a)/(b)/(e)
   frozen stabilities. Skipped so typecheck + `npm test` stay green now.
4. A `describe.skip("honest guess floor gradePosterior (impl — task 03 un-skips)", …)` block imports
   the REAL `gradePosterior` from `./grade` and asserts the (g) quartet + boundary census against it.
   Skipped now (current `gradePosterior` does not cap g, so 2-opt would give 0.5 not 0.45).
5. `npx vitest list` (default config; capture to a var, herestring-grep, retry until the token appears)
   lists `lapse-adjust.oracle` — proving the non-skipped subset keeps the file collected.
6. `npm run -s typecheck` exits 0 and `npm run -s test` exits 0 (the two skipped blocks do not run;
   the non-skipped self-consistency subset passes).

## Constraints / decisions
- Oracle integrity: literals come ONLY from task 01's `PREVERIFY-OUTPUT.txt`. Do NOT compute expected
  values by calling `schedule()`, `gradePosterior`, or the new module — that would self-grade.
- At least one NON-skipped test (the self-consistency subset) so `vitest list` collects the file
  (wave19b-01 corollary: an all-`.skip` file is NOT listed).
- Pure-tree hygiene: the file lives under `lib/fsrs/` so the purity grep scans it — build any fixed
  clock via a `mkDate = (...a: number[]) => Reflect.construct(Date, a) as Date` helper, never the
  literal `new Date`, and keep that phrase out of comments (wave19a-02 learning).
- Tests-only: no non-test file changes in this task.

## Next
- [x] Read task 01's `PREVERIFY-OUTPUT.txt`, transcribe the 6dp literals, write the oracle file with the
      non-skipped self-consistency subset + the two dynamic-import `describe.skip` blocks.
- Goal fully met — nothing further. Task 03 un-skips the gradePosterior block (cap g at 0.45);
  task 04 un-skips the slipAdjustedLapse block (writes `./lapse-adjust`, removes the
  `// @ts-expect-error` on the three dynamic-import lines).

## Log
- 2026-07-14 laptop: planned by the wave20 planner.
- 2026-07-14 ClPcs-Mac-mini: wrote `lib/fsrs/lapse-adjust.oracle.test.ts` — header names
  `gen-wave20-oracles.py` + "never regenerate from TS impl". NON-skipped self-consistency block (10
  its) grades the frozen 6dp literals (a blend fixtures, b never-grow, c crush≤2.30, d monotone-π, e
  repeated-wrong 38.237590→14.928157→6.831944, f boundary g-floors, g posterior quartet
  0.666667/0.729730/0.782609/0.818182 verbatim) against LOCAL pure closed-form helpers
  (bktPosterior/cappedGuess/logBlend/forget+recallStability, re-encoded FSRS-6 weights — not the impl).
  Two `describe.skip` blocks: slipAdjustedLapse (`await import("./lapse-adjust")` guarded by
  `// @ts-expect-error`, task 04) + real gradePosterior from `./grade` (task 03). Fixed clocks via a
  `mkDate = Reflect.construct(Date, …)` helper (no banned clock phrase). Cleaned stale `.next/types`
  (deleted `app/lp/*` routes broke `tsc`). verify.sh green: typecheck 0, vitest list collects the file,
  738 passed / 5 skipped.

## Artifacts
- `lib/fsrs/lapse-adjust.oracle.test.ts` — the frozen TS oracle (10 non-skipped self-consistency its +
  5 skipped impl-binding its for tasks 03/04).

## Verify
**Last verify:** PASS (2026-07-13T22:41:13Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T22:42:53Z)
