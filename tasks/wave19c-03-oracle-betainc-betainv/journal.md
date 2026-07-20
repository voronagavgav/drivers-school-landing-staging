# Task: wave19c-03-oracle-betainc-betainv

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-12
**Last compute:** mac-mini
**Artifacts:** lib/beta-incomplete.oracle.test.ts

## Goal
ORACLE-AUTHORING ONLY. Write frozen reference tests for the regularized incomplete beta function
`I_x(a,b)` and its inverse `betaInv(α; a, b)` (Beta quantile). The IMPLEMENTATION is wave19c-04 and MUST
NOT be written here; this file's assertions are the frozen oracle and later tasks may not edit them.

1. Create `lib/beta-incomplete.oracle.test.ts`. It targets a not-yet-existing module `./beta-incomplete`
   exporting `regularizedIncompleteBeta(x: number, a: number, b: number): number` and
   `betaInv(alpha: number, a: number, b: number): number`.
2. The impl-CALLING assertions live under a top-level `describe.skip(...)` and reach the future module via
   `const { regularizedIncompleteBeta, betaInv } = await import("./beta-incomplete")` inside each test,
   with a `// @ts-expect-error module authored in wave19c-04` on the line above the import (the un-skip
   task wave19c-04 removes both the `.skip` and the directive). `npm run -s typecheck` exits 0 with the
   file present (the ts-expect-error absorbs the missing module).
3. FROZEN oracle assertions (in the skipped block), tolerance `toBeCloseTo(_, 6)` unless noted — all are
   external/closed-form or scipy-1.18 frozen from `docs/research/RHO-CORRECTION-RESEARCH-2026-07-12.json`:
   - `regularizedIncompleteBeta`:
     - `I_x(1,1) = x`: at x=0.3 → 0.3, at x=0.7 → 0.7 (uniform CDF, exact identity).
     - boundaries: `I_0(2,3) === 0`, `I_1(2,3) === 1` (assert exact `toBe`).
     - closed form `I_x(2,2) = 3x² − 2x³`: at x=0.5 → 0.5, at x=0.3 → 0.216.
     - symmetry `I_x(a,b) = 1 − I_{1−x}(b,a)`: pin at x=0.4, a=2.3, b=1.4 (assert the two sides equal
       to 9dp; this needs the impl at both argument orders).
   - `betaInv` (inverse):
     - `betaInv(0.5, 1, 1) = 0.5`, `betaInv(0.3, 1, 1) = 0.3` (uniform inverse CDF, exact identity).
     - round-trip `I_{betaInv(α,a,b)}(a,b) = α`: pin α=0.2, a=2.3, b=1.4 to 6dp.
     - SCIPY-FROZEN quantile anchors (the parked quantile tier's raw values, n_eff = 5/2.2 = 2.2727272727):
       | a           | b           | betaInv(0.2, a, b) |
       |-------------|-------------|--------------------|
       | 1.863636364 | 1.409090909 | 0.339343           |
       | 2.318181818 | 0.954545455 | 0.511245           |
       | 2.659090909 | 0.613636364 | 0.665395           |
       (a = p̂·n_eff + ½, b = (1−p̂)·n_eff + ½ for p̂ = .60/.80/.95 — the wave19c-05 quantile tier.)
4. ONE NON-SKIPPED, IMPL-INDEPENDENT self-consistency test (so `npx vitest list` collects the file and it
   stays green before wave19c-04): assert the FROZEN NUMBERS THEMSELVES are consistent WITHOUT calling the
   impl — e.g. the three scipy betaInv anchors are strictly increasing (0.339343 < 0.511245 < 0.665395)
   and each in (0,1); and the closed-form literal `3*0.3**2 − 2*0.3**3 === 0.216` (computed in-test). This
   grades the vectors, not the not-yet-written impl (no self-grading).
5. `npm test` exits 0 (skipped block does not run; the non-skipped self-consistency test passes).
6. `npx vitest list` output CONTAINS the token `beta-incomplete.oracle` (file is collected — needs the
   one non-skipped test per the wave19b-01 `vitest list` skip-collection learning).

## Constraints / decisions
- Oracle rule: these literals are EXTERNAL (closed-form identities + scipy-1.18 values from the research
  doc). Never recompute them from an implementation. wave19c-04 must MATCH them.
- No implementation module is created here; only the test file.
- Symmetry + round-trip assertions require the impl → they belong in the SKIPPED block; only the
  self-consistency of literals is non-skipped.
- **Evaluate: yes** — an inverse-incomplete-beta oracle is subtle correctness; independent judge on done.

## Next
- [ ] DONE — oracle authored. Handoff to wave19c-04 (impl + un-skip). Nothing further here.

## Log
- 2026-07-12 mac-mini: planned. betaInv anchors are the spec §FROZEN-ORACLES quantile-tier raw values
  (pre-clamp); a,b derived from n_eff = 5/2.2.
- 2026-07-12T22:24Z ClPcs-Mac-mini: wrote `lib/beta-incomplete.oracle.test.ts`. 7 impl-calling assertions
  (I_x(1,1)=x; boundaries 0/1 exact `toBe`; closed-form I_x(2,2)=3x²−2x³; symmetry 9dp; betaInv identities;
  round-trip; 3 scipy-1.18 quantile anchors) under `describe.skip`, each reaching `./beta-incomplete` via a
  `// @ts-expect-error`-guarded dynamic import. Plus 2 non-skipped impl-independent self-consistency tests
  (anchors strictly increasing & ∈(0,1); 3·0.3²−2·0.3³=0.216). typecheck 0, `npm test` 0 (672 passed | 7
  skipped), `npx vitest list` collects `beta-incomplete.oracle`. Goal fully met.

## Verify
**Last verify:** PASS (2026-07-12T19:24:36Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T19:27:17Z)
