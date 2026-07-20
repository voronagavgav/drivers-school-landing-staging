# Task: wave15-06-diagnostic-select-pure

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T09:44Z
**Last compute:** mac-mini

## Goal
Implement `selectDiagnostic` in `lib/test-engine/diagnostic.ts` (replace the wave15-05 stub),
following the normative algorithm frozen in that file's doc comment. PASS = ALL true:

1. `npx vitest run lib/test-engine/diagnostic.test.ts` exits 0.
2. Oracle untouched: `shasum -a 256 -c tasks/wave15-05-diagnostic-oracle/oracle.sha256` passes.
3. diagnostic.ts imports `groupCandidatesByBlock` from the exam-blueprint module (grep) — the
   §↔displayOrder mapping is REUSED, never reimplemented (spec §B "reuse the existing blueprint
   machinery").
4. Purity: diagnostic.ts contains NO `Math.random`, `Date.now`, `new Date(`, `server-only`,
   `@/lib/db`, `lib/generated` tokens anywhere (comments included). rng is injected;
   `count` defaults to `DIAGNOSTIC_COUNT` from constants (grep DIAGNOSTIC_COUNT).
5. `npm test` exits 0 (unit board fully green).
6. `npx tsc --noEmit` exits 0.
7. `lib/exam-blueprint.ts` and `lib/test-engine/queue.ts` unchanged (git diff --name-only lists neither).

## Constraints / decisions
- Do NOT edit diagnostic.test.ts. If a vector seems wrong, STOP, mark blocked, and dispute it in the
  wave15-05 journal — never make the oracle fit the code.
- Deterministic under injected rng; ranged blocks at MIN; Hamilton largest-remainder with
  earlier-block tie-break; underfill redistributes by cycling block order (exactly the frozen algorithm).

## Next
- [x] Implement per the normative comment; iterate until the oracle file is green.
- Goal fully met — all 7 gates green. No further increment.

## Artifacts
- lib/test-engine/diagnostic.ts

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T09:44Z ClPcs-Mac-mini: Implemented `selectDiagnostic` per the frozen normative comment —
  groupCandidatesByBlock reuse → nominal counts (fixed/ranged-MIN/remainder) → Hamilton
  largest-remainder scale to `count` (ties → earlier block) → round-robin underfill redistribution
  (skip exhausted, one seat per block visit) → per-block Fisher-Yates(rng)+stable difficulty sort →
  global stable difficulty sort. rng defaults to a pure `() => 0.5` (no Math.random/clock). ALL 7
  gates green: oracle 6/6 pass, sha256 intact, groupCandidatesByBlock imported, purity clean,
  DIAGNOSTIC_COUNT default, `npm test` 571/571, `tsc --noEmit` exit 0, blueprint/queue unchanged.
  Status → done.

## Verify
**Last verify:** PASS (2026-07-03T06:43:51Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T06:44:52Z)
