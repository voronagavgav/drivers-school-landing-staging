# Task: wave23-03-ts-oracle-test

**Status:** done
**Driver:** auto
**Updated:** 2026-07-14
**Last compute:** mac-mini

**Artifacts:** `lib/exam-allocator.oracle.test.ts` (frozen golden vectors from the python oracle,
SUSPENDED until wave23-04 lands the impl).

ORACLE-AUTHORING #2 — freeze the python oracle's (wave23-01) golden vectors as a TypeScript test that
the not-yet-written `lib/exam-allocator.ts` (wave23-04) must satisfy. Written BEFORE the impl so it
cannot be gamed. This task authors the assertions; it does NOT write the allocator.

Depends on: wave23-01 (its `PREVERIFY-OUTPUT.txt` supplies the literal numbers to freeze).

## Goal
PASS = ALL true:

1. `lib/exam-allocator.oracle.test.ts` exists. Its expected VALUES are copied verbatim from
   `tasks/wave23-01-python-oracle/PREVERIFY-OUTPUT.txt` (the ΔP_i 6dp values, the exact ranking order,
   the blend arithmetic, the budget-boundary selections, the baseline order) — as hard-coded literals,
   NOT computed in the test. A header comment names `scripts/oracles/gen-wave23-oracles.py` as the
   source and states "frozen from the python oracle; regenerate only from the python, never from TS".
2. The suite is SUSPENDED (`describe.skip(...)`) and pulls the future module via a guarded dynamic
   `await import("./exam-allocator")` (with a `// @ts-expect-error` on the line above — the module
   does not exist yet), so `npm run -s typecheck` stays 0 and `npm test` stays green.
3. At least ONE NON-skipped test lives in the file — an impl-independent self-consistency check of the
   FROZEN oracle numbers themselves (e.g. the blend identity `dP == p·dCorrect + (1−p)·dWrong` holds on
   the frozen literals to 6dp, and the frozen ranking is a permutation of the 6 item ids) — so
   `npx vitest list` COLLECTS the file (a fully-skipped file is not listed; CLAUDE.md). This test grades
   the frozen vectors, not the impl, so it is not self-grading.
4. `npm run -s typecheck` exits 0; `npm test` exits 0; `npx vitest list` collects
   `exam-allocator.oracle` (var-captured, herestring token-retry per CLAUDE.md).
5. The frozen literals in the file MATCH the python `PREVERIFY-OUTPUT.txt` byte-for-byte on the ΔP_i
   values and ranking (verify.sh cross-greps at least the ranking line + each ΔP value string).

## Constraints / decisions
- The dynamic-import + `@ts-expect-error` + `describe.skip` scaffolding is the CLAUDE.md pattern for a
  tests-only oracle whose impl module does not exist yet. wave23-04 removes the `.skip`, converts the
  dynamic import to static, and strips the now-unused `@ts-expect-error`.
- Do NOT recompute any expected value in TS — copy the python's printed numbers. The whole anti-gaming
  guarantee is that these literals predate the impl and come from an independent implementation.
- Non-skipped self-consistency test must NOT import `./exam-allocator` (keeps the file green pre-impl).

## Acceptance
verify.sh: file exists, is collected by `vitest list`, typecheck+test green, and the frozen ranking +
ΔP literals appear in BOTH the test file and the python PREVERIFY output.

## Next
- [x] Read `tasks/wave23-01-python-oracle/PREVERIFY-OUTPUT.txt`; author
      `lib/exam-allocator.oracle.test.ts` with frozen literals, a `describe.skip` block importing the
      future module dynamically, and one non-skipped frozen-vector self-consistency test.
- (wave23-04 owns): un-skip, convert the dynamic `await import("./exam-allocator")` to a static top
      import, and strip the now-unused `@ts-expect-error` lines when the impl lands.

## API contract this oracle pins for wave23-04
`lib/exam-allocator.ts` must export (called from the suspended suite):
- `dialFor(input)` → `ReleaseResult` (thin wrapper over `releaseDial`; `.final` is P_pass).
- `scoreCandidate(input, candidate)` → ΔP_i number.
- `allocate(input, candidates, budget)` → ordered ids (desc ΔP, ties by id asc; B=0⇒[], B≥count⇒all).
`input = { blocks:[{quota, seenR:number[], nUnseen}], reviewMass, slope? }` (the `releaseDial` shape);
`candidate = { id, blockIndex, seenIndex, afterCorrect, afterWrong, pCorrect }` — `before` is read from
`input.blocks[blockIndex].seenR[seenIndex]`; scoring swaps that slot to after-correct/after-wrong and
recomputes `releaseDial(...).final`.

## Log
- 2026-07-14 mac-mini: planned.
- 2026-07-14 ClPcs-Mac-mini: authored `lib/exam-allocator.oracle.test.ts` — froze the wave23-01 python
      values verbatim (dial_before 0.624559, six ΔP_i @6dp, ranking i4,i1,i2,i5,i3,i6, i1 blend, budget
      boundaries, baseline scores/order, mono pair) as hard-coded literals; header names
      gen-wave23-oracles.py + "frozen from the python oracle; regenerate only from the python, never
      from TS". Impl-binding suite is `describe.skip` reaching `./exam-allocator` via guarded dynamic
      `await import` (`// @ts-expect-error` per call). Five non-skipped self-consistency tests grade the
      frozen vectors only (blend identity, ranking = sorted-by-ΔP permutation, baseline permutation ≠
      allocator ranking, budget boundaries, mono) so `vitest list` collects the file. typecheck 0,
      `npm test` 792 passed | 5 skipped, file collected, verify.sh → PASS wave23-03. Status: done.

## Verify
**Last verify:** PASS (2026-07-14T13:35:26Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T13:37:25Z)
