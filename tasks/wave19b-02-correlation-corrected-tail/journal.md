# Task: wave19b-02-correlation-corrected-tail

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-12
**Last compute:** laptop

LIB IMPLEMENTATION of the beta-binomial variance-inflation correction (Wave 19b deliverable #1). Implement the
pure functions the frozen oracle (task 01) pins, wire a conservative `ρ` constant + design effect into the
readiness pass-probability tail PER BLOCK (blocks independent, within-block correlated), and un-skip task 01's
oracle tests against the real implementation. `ρ=0` must reproduce today's exact Poisson-binomial result
bit-for-bit (regression anchor). PURE — no DB, no clock, no rng.

## Goal
PASS = ALL true:

1. `lib/readiness-correlation.ts` (new, PURE) exports:
   - `betaBinomialPmf(n: number, alpha: number, beta: number): number[]` → length-`n+1` pmf summing to 1.
   - `blockBetaBinomParams(p: number, rho: number): { alpha: number; beta: number }` = `α=p(1−ρ)/ρ,
     β=(1−p)(1−ρ)/ρ` (ρ round-trips as `1/(α+β+1)`).
   - `correlatedPassProbability(blocks: { quota: number; meanProb: number }[], threshold: number,
     rho: number): number` — convolves per-block beta-binomial pmfs (each block `n=quota, p=meanProb, ρ=rho`;
     `ρ=0` → the block's independent Binomial(n,p)) across INDEPENDENT blocks, returns `P(total ≥ threshold)`.
2. Task 01's `lib/readiness-correlation.test.ts` is UN-SKIPPED and passes against the real exports — every
   frozen literal green (`npm test` exits 0; the file is collected per `npx vitest list`). Do NOT edit task
   01's frozen numbers/tolerances.
3. REGRESSION ANCHOR (bit-for-bit): a new/kept test asserts `correlatedPassProbability(blocks, k, 0)` EQUALS
   `poissonBinomialAtLeast(k, flatten(blocks))` (the existing `lib/readiness-model.ts` fn) to `toBeCloseTo(…,12)`
   for at least 3 heterogeneous block fixtures — i.e. ρ=0 changes nothing. The existing
   `lib/readiness-model.test.ts` golden values remain unchanged and green.
4. MONOTONICITY: a property test asserts that for a block set whose pass threshold ≤ total mean, increasing ρ
   over `[0, 0.15, 0.35, 0.6]` produces a NON-INCREASING `correlatedPassProbability` sequence (strict decrease
   on the pinned n=2 `P(≥1)`: 0.75 → … → below 0.6666666667 is NOT required, but non-increasing is).
5. `computeReadiness` (in `lib/readiness-model.ts`) accepts an optional `topicCorrelation?: number` (ρ) on its
   input (default `0` — so ALL existing callers/tests are byte-identical). When `topicCorrelation > 0` AND
   `blueprint.blocks` is supplied, the model probability `P_model` is computed via `correlatedPassProbability`
   over the blocks instead of the flat Poisson-binomial; otherwise the existing PB path is used unchanged.
   (No blocks → no topic structure → no correlation applied.)
6. `READINESS_TOPIC_CORRELATION = 0.35` is added to `lib/constants.ts` with a doc comment: research-measured
   within-topic intraclass correlation (FSRS-READINESS-STRATEGY §Q3), a CONSERVATIVE default overridable by the
   empirical `measureTopicCorrelation` (task 03) as data accrues. (This task ADDS the constant; the server wires
   it in task 09.)
7. PURITY: grep over `lib/readiness-correlation.ts` finds NONE of `server-only`, `@/lib/db`, `@prisma/client`,
   `lib/generated`, `Math.random`, `Date.now`, `new Date` (comments too).
8. `npm run -s typecheck` exits 0; `npm run -s test` exits 0.

## Constraints / decisions
- The beta-binomial realises the design effect `Var = n·p(1−p)(1+(n−1)ρ)` EXACTLY — that is the whole point;
  do not approximate with a normal/moment match. Convolution across blocks is an O(total²) DP (total ≤ 20).
- Correlation is a WITHIN-topic phenomenon → apply it per BLOCK (each blueprint block groups topic-ish
  sections), blocks independent. Fallback (no blocks / non-blueprint category) stays exact PB — do NOT model
  the whole 20-item exam as one correlated block (that over-applies correlation across unrelated topics).
- `ρ=0` MUST reproduce PB bit-for-bit: `betaBinomialPmf` at ρ→0 is the Binomial; convolving per-block
  Binomials with constant per-block p equals the exact PB over the concatenated vector. Guard the ρ=0 branch
  explicitly (avoid `α,β=∞` division) — return the Binomial pmf directly when `ρ<=0`.
- Numerical: compute `betaBinomialPmf` via log-Gamma (`lgamma`)-based log-Beta to avoid overflow, or the
  stable recurrence `P(k)/P(k−1) = (n−k+1)/k · (α+k−1)/(β+n−k)`; normalise so the returned pmf sums to 1
  within 1e-12. Clamp `meanProb`/inputs to `[0,1]`.
- This is a GENUINELY HARD numerics task (near-degenerate α,β at small ρ; the ρ=0 exact-reproduction anchor;
  correct tail direction) — hence **Model: claude-opus-4-8** and **Evaluate: yes**.
- Non-goals: the empirical ρ estimator (task 03), server wiring / inputsJson (task 09), any UI.

## Next
- [x] Write `lib/readiness-correlation.ts`; un-skip `lib/readiness-correlation.test.ts`; add the ρ=0
      regression-anchor + monotonicity tests; add `READINESS_TOPIC_CORRELATION`; thread optional
      `topicCorrelation` into `computeReadiness`; run typecheck + test.
- Task complete. (Downstream: task 03 empirical estimator, task 09 server wiring/inputsJson.)

## Log
- 2026-07-12 laptop: planned. Depends on task 01 (frozen oracle). ρ=0 = exact-PB regression anchor is the
  hard guarantee; per-block application (not whole-exam) is the honesty-correct granularity.
- 2026-07-12 ClPcs-Mac-mini: implemented `lib/readiness-correlation.ts` (PURE) — `betaBinomialPmf` via the
  stable ratio recurrence (no Gamma; exact for the frozen [1/6,1/3,1/2] etc.), `betaParams`
  (+`blockBetaBinomParams` alias), `correlatedBlockPmf` (ρ≤0 guard → Binomial via Bernoulli convolution,
  bit-for-bit anchor), `correlatedPassProbability` (convolve independent per-block beta-binomial pmfs →
  P(total≥threshold)). Un-skipped task 01's oracle (removed `.skip` + `@ts-expect-error`) — 19 tests green.
  Added `lib/readiness-correlation.regression.test.ts`: 3 heterogeneous fixtures proving ρ=0 ==
  poissonBinomialAtLeast to 12 dp, + non-increasing-in-ρ monotonicity over [0,0.15,0.35,0.6] and the pinned
  n=2 strict 0.75→2/3. Threaded optional `topicCorrelation` (default 0) into `computeReadiness` — used only
  with blocks & ρ>0, else existing PB path unchanged. Added `READINESS_TOPIC_CORRELATION=0.35` to
  lib/constants.ts. typecheck 0, `npm test` 650 passed, purity grep clean.

- 2026-07-12 ClPcs-Mac-mini: FIXED verify FAIL. Root cause: the whole-file gate
  `grep -Eq "describe\.skip|it\.skip|\.skip\("` false-tripped on a STALE task-01 comment
  ("the whole suite is `describe.skip`") — the suite was already un-skipped, so the comment was
  historically inaccurate. Reworded the MECHANISM comment block to past tense without the literal
  `describe.skip` token (no oracle numbers/tolerances touched). Gate now clear; `verify.sh` →
  `PASS wave19b-02` (typecheck 0, 650 tests green). Status → done.

## Artifacts
- lib/readiness-correlation.ts (new, PURE — beta-binomial variance-inflation correction)
- lib/readiness-correlation.regression.test.ts (new — ρ=0 anchor + monotonicity)
- lib/readiness-correlation.test.ts (un-skipped task 01 oracle)
- lib/readiness-model.ts (optional `topicCorrelation` threaded into computeReadiness)
- lib/constants.ts (READINESS_TOPIC_CORRELATION = 0.35)


## Verify
**Last verify:** PASS (2026-07-12T15:02:09Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T15:03:41Z)
