# Task: wave19b-01-betabinom-oracle-vectors

**Status:** done
**Driver:** auto
**Updated:** 2026-07-12
**Last compute:** laptop

ORACLE-AUTHORING (anti self-grading). Write the FROZEN, EXTERNALLY-computed reference vectors for the
beta-binomial variance-inflation correction (Wave 19b deliverable #1) as a unit-test file. This task writes
TESTS ONLY (no implementation) — the numbers below are hand-derived from closed-form Beta-function identities
and cross-checkable against `scipy.stats.betabinom`; they are frozen here BEFORE the implementation (task 02)
exists so the implementation cannot be tuned to pass a self-consistent test. The test file starts
`describe.skip(...)` (or a guarded import) and task 02 un-skips it against the real implementation.

## Goal
PASS = ALL true:

1. A new test file `lib/readiness-correlation.test.ts` exists and is collected by `npm test` (assert via
   `npx vitest list` captured to a var, then `grep -q readiness-correlation`).
2. The file encodes ALL of these FROZEN oracle literals as `expect(...).toBeCloseTo(literal, 10)` (or exact
   `toEqual` for rationals rendered to ≥10 dp), each with a comment naming its external source
   (Beta-binomial pmf `P(X=k;n,α,β)=C(n,k)·B(k+α,n−k+β)/B(α,β)`; the `Beta(1,1)`→discrete-uniform identity;
   `scipy.stats.betabinom` as the named cross-check):
   - **Uniform identity** `betaBinomialPmf(n, α=1, β=1)` = discrete-uniform on `{0..n}` (each `1/(n+1)`):
     - n=2 → `[0.3333333333, 0.3333333333, 0.3333333333]`
     - n=3 → `[0.25, 0.25, 0.25, 0.25]`
     - n=4 → `[0.2, 0.2, 0.2, 0.2, 0.2]`
   - **Asymmetric closed form** `betaBinomialPmf(n=2, α=2, β=1)` = `[0.1666666667, 0.3333333333, 0.5]`
     (hand-derived: `[1/6, 1/3, 1/2]`; mean `= 2·(2/3) = 4/3`).
   - **ρ→0 limit reproduces the Binomial**: `betaBinomialPmf` matched to `(p=0.5, ρ→0)` for n=2 →
     `[0.25, 0.5, 0.25]` (independent Binomial(2, 0.5)).
   - **Parameterization identity** (documented as a helper the impl will expose): from a target block mean
     `p` and intraclass correlation `ρ∈(0,1)`, `α = p·(1−ρ)/ρ`, `β = (1−p)·(1−ρ)/ρ`, and the round-trip
     `ρ === 1/(α+β+1)`. Oracle: `p=0.5, ρ=1/3 → α=1, β=1`; `p=2/3, ρ=1/4 → α=2, β=1`.
   - **Variance = design effect** for a matched block: `Var[X] = n·p·(1−p)·(1 + (n−1)·ρ)`. Oracle: n=2, p=0.5,
     ρ=1/3 → variance `= 2·0.25·(1+1/3) = 2/3 ≈ 0.6666666667` (and the uniform pmf `[1/3,1/3,1/3]` has that
     exact variance — cross-check both ways).
   - **Correlated TAIL, direction pinned** for the realistic "need most correct" regime (threshold ≤ mean):
     a single block n=2, p=0.5, `P(≥1 correct)`: ρ=0 → `0.75` (Binomial 1−0.25); ρ=1/3 → `0.6666666667`
     (uniform 1−1/3). And block n=3, p=0.5, `P(≥1)`: ρ=0 → `0.875`; ρ=1/3 → `0.75`. i.e. increasing ρ
     STRICTLY LOWERS P(pass) when the pass threshold is at/below the mean (the over-statement fix), and ρ=0
     exactly reproduces the independent value.
3. The file documents (comment) the MONOTONICITY properties task 02 must satisfy, as named test intents:
   (a) ρ=0 reproduces the exact Poisson-binomial result BIT-FOR-BIT (regression anchor); (b) for a block
   whose pass threshold is ≤ its mean, `P(pass)` is non-increasing in ρ.
4. `npm run -s typecheck` exits 0. `npm run -s test` exits 0 (the new file is present; until task 02 lands its
   assertions live under `describe.skip` or import a not-yet-exported symbol behind a `it.skip`, so the suite
   stays green — document which mechanism is used).

## Constraints / decisions
- Beta-binomial with mean `p` and intraclass correlation `ρ` is the "cheap drop-in" fix from the research
  (FSRS-READINESS-STRATEGY doc §Q3-B): keep the PB mean, inflate per-topic variance by `1+(n−1)ρ`. The
  beta-binomial with `α=p(1−ρ)/ρ, β=(1−p)(1−ρ)/ρ` realises that design effect EXACTLY — that is why these
  pmf literals ARE the oracle for the variance inflation.
- Direction subtlety (pin it, do not get it backwards): higher ρ lowers P(pass) ONLY when the threshold is
  at/below the mean (the exam regime — need ≥18/20, so a decent student sits near the boundary). At a
  threshold ABOVE the mean (e.g. "need ALL correct", `P(≥2 of 2)`) higher ρ would RAISE the tail — that is NOT
  the exam regime and is deliberately excluded from the direction oracle. All pinned tail cases use
  `threshold ≤ mean`.
- TESTS ONLY. No `lib/readiness-correlation.ts` implementation in this task (that is task 02). Do not edit
  `lib/readiness-model.ts`. Do not change any existing test.
- The literals are frozen here at PLAN time. The implementer MUST NOT edit these numbers or tolerances to make
  a buggy impl pass — a failing oracle means the impl is wrong, not the oracle.
- PURE test file: no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`/`Math.random`/`Date.now`/
  `new Date`.

## Next
- [x] Write `lib/readiness-correlation.test.ts` with the frozen literals above under a skip guard; run
      typecheck + `npx vitest list` to confirm collection; leave assertions skipped until task 02.
- (task 02 picks up) Un-skip the `describe.skip` block, remove the `@ts-expect-error` in `loadImpl()`, and
  grade the real impl (`betaBinomialPmf`/`betaParams`/`correlatedBlockPmf`) against these untouched literals.

## Artifacts
- `lib/readiness-correlation.test.ts` — frozen oracle vectors. Active `describe(...)` = impl-independent
  self-consistency of the frozen numbers (also keeps the file in `vitest list`); `describe.skip(...)` = the
  10 impl-dependent oracle tests that task 02 un-skips. Impl pulled via `loadImpl()` dynamic import guarded
  by `@ts-expect-error` (module doesn't exist yet).

## Log
- 2026-07-12 laptop: planned. Oracle literals hand-derived from Beta-function closed forms + the Beta(1,1)
  discrete-uniform identity; scipy.stats.betabinom named as the external cross-check.
- 2026-07-12 ClPcs-Mac-mini: wrote `lib/readiness-correlation.test.ts`. Encoded ALL frozen literals
  (uniform identity n=2/3/4, asymmetric betaBinomialPmf(2,2,1)=[1/6,1/3,1/2], ρ→0 Binomial(2,.5), param
  identity α/β + ρ=1/(α+β+1) round-trip, design-effect variance 2/3, correlated tails n=2/n=3 P(≥1)) as
  `toBeCloseTo(lit, 10)` with source comments (Beta-binomial pmf closed form + scipy.stats.betabinom named
  cross-check). Monotonicity intents (ρ=0 bit-for-bit anchor; P(pass) non-increasing in ρ for threshold ≤
  mean) documented as comments. GREEN mechanism: impl-dependent asserts live under `describe.skip` and pull
  the not-yet-written module via a dynamic `import()` guarded by `@ts-expect-error` (tsc would else error
  "Cannot find module") — nothing runs until task 02 un-skips. DISCOVERY: `npx vitest list` does NOT list a
  FULLY-skipped file, so the collection gate `grep -q readiness-correlation` failed; added a small non-skipped
  `describe` that self-checks the FROZEN numbers (pmf sums=1, tail direction, ρ round-trip, variance) — grades
  the oracle vectors themselves, not the impl, so no self-grading. Verified: typecheck exit 0; `npm test` exit
  0 (635 passed | 10 skipped, file present); `vitest list` → COLLECTED_OK.

## Verify
**Last verify:** PASS (2026-07-12T14:54:42Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T14:55:46Z)
