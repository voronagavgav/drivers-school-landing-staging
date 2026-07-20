# Task: wave23-04-pure-allocator

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-14
**Last compute:** mac-mini

**Artifacts:** `lib/exam-allocator.ts` (the pure allocator).

IMPLEMENTATION of the greedy marginal-gain allocator, matching the wave23-01 python oracle and passing
the wave23-03 frozen TS oracle test (un-skipped here). Depends on: wave23-01, wave23-03.

## The module (spec §Allocator)
`lib/exam-allocator.ts` — PURE (no DB, no clock read, no rng, no `server-only`). Imports the REAL dial
machinery; does NOT reimplement PB / mixture / split:
- `releaseDial` from `@/lib/readiness-release` (the objective P_pass = `.final`).
- Given a candidate item's `before` states and its `after-correct` / `after-wrong` next-states plus
  `p_correct`, score `ΔP_i = p_correct·(P_pass(after correct) − P_pass(before)) +
  (1−p_correct)·(P_pass(after wrong) − P_pass(before))` — the expected dial delta of reviewing item i.
- Export a scoring fn (e.g. `scoreCandidate(...) → ΔP_i`) and a selection fn
  (e.g. `allocate(candidates, budgetB) → ordered ids of the top-B by ΔP_i`, ties broken by item id
  ascending; B=0 ⇒ []; B ≥ count ⇒ all). Exact recomputation per candidate (no factorization).

## Goal
PASS = ALL true:

1. `lib/exam-allocator.ts` exists and exports the scoring fn and the selection fn named in the oracle
   test; it imports `releaseDial` from `@/lib/readiness-release` and does NOT define its own PB /
   mixture / seen-unseen-split (grep: no local `poissonBinomial`/`hermegauss`/`blockSplit`
   reimplementation — it IMPORTS or calls `releaseDial`).
2. `lib/exam-allocator.oracle.test.ts` is UN-SKIPPED (no `describe.skip`; the dynamic
   `await import("./exam-allocator")` is now a static top-of-file import; the now-unused
   `@ts-expect-error` directive is removed) and ALL its frozen assertions PASS.
3. `npm run -s typecheck` exits 0; `npm test` exits 0; `npx vitest list` collects
   `exam-allocator.oracle` (var-captured, herestring token-retry).
4. PURITY: `lib/exam-allocator.ts` contains no `Date.now`, no `new Date`, no `Math.random`, no
   `import "server-only"`, no `@/lib/db`/`@prisma/client`/`lib/generated` import, no JSX (grep scoped
   to the file; documented injectable defaults, if any, excluded from the rng grep).
5. The frozen ΔP_i values and ranking from the python oracle reproduce EXACTLY (6dp) via the real
   `releaseDial` — this is the anti-self-grading guarantee: the impl matches an INDEPENDENT python
   reimplementation, not its own numbers.

## Constraints / decisions
- NON-GOAL: per-block factorization of the score. The spec permits it ONLY behind an oracle proving it
  preserves the exact top-B ranking on the frozen fixtures; that oracle is out of scope for this spike
  task. Ship exact recomputation (affordable: pool ≤ ~2k, dial is fast).
- Do NOT edit the frozen numeric literals / tolerances in the oracle test — only remove `.skip`,
  convert the import to static, and strip the unused `@ts-expect-error` (CLAUDE.md typecheck-coupling
  rule: the field/module-adding task owns unused-directive removal).
- Purity gates scoped to the target file, not the whole tree (CLAUDE.md whole-file-grep trap).

## Acceptance
verify.sh: typecheck + unit green with the oracle un-skipped and collected; purity greps clean; import
of `releaseDial` present; no local PB/mixture/split reimplementation.

## Next
- [x] Write `lib/exam-allocator.ts` (score + allocate) importing `releaseDial`; un-skip + de-dynamic
      the oracle test; run typecheck + npm test.
- [x] Fix the two whole-file-grep verify false-positives (doc-comment prose naming `describe.skip`/
      `@ts-expect-error` in the oracle test, and `server-only` in the allocator header comment).
- Goal fully met; task done. Successor tasks: wave23-05 (sim harness) consumes `allocate`.

## Log
- 2026-07-14 ClPcs-Mac-mini: Verify FAIL was TWO whole-file-grep false-positives, not real defects:
  (1) `grep -qE "describe\.skip"` / `"@ts-expect-error"` over the oracle test tripped on the
  ORACLE-AUTHORING doc comment (lines 31/33) that named the literal tokens `describe.skip` and
  `// @ts-expect-error` in backticked prose — the real `.skip`/directives were already gone. Reworded
  that comment to past tense without the literal tokens (touches no numeric literal → not tampering).
  (2) `grep -nE "server-only"` over `exam-allocator.ts` tripped on the header comment "No … no
  `server-only`" — reworded to "no server-runtime marker". verify.sh now PASSES end-to-end.
- 2026-07-14 mac-mini: planned.
- 2026-07-14 ClPcs-Mac-mini: Authored `lib/exam-allocator.ts` — pure `dialFor` (thin
  `releaseDial` alias), `scoreCandidate` (ΔP = p·(dialAfterCorrect−before)+(1−p)·(dialAfterWrong−before)
  via a `withItem` seen-slot swap + exact dial recompute, no factorization), `allocate` (top-B by
  descending ΔP, ties by id asc; B≤0⇒[], B≥count⇒all). Imports `releaseDial` from
  `@/lib/readiness-release`; no local PB/mixture/split. Un-skipped the oracle test: `describe.skip`→
  `describe`, dynamic `await import` → static top-of-file `import { allocate, dialFor, scoreCandidate }`,
  removed both `@ts-expect-error` directives, dropped now-needless `async`. Results: `npm run -s
  typecheck` exit 0; `npx vitest run lib/exam-allocator.oracle.test.ts` 11/11 (impl-binding suite
  reproduces the frozen python ΔP_i to 6dp via the real dial); full `npm test` 797/797. verify.sh gates
  (import present, no PB/mixture/split, no .skip/@ts-expect-error, purity greps, collection) all satisfied.


## Verify
**Last verify:** PASS (2026-07-14T13:42:35Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T13:46:18Z)
