# Task: wave10f-06-readiness-blueprint-heterogeneity

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Artifacts:** lib/readiness-model.ts, lib/readiness-model.test.ts
**Last compute:** laptop

## Goal
Stop feeding the Poisson-binomial DP a constant per-item vector (`new Array(questionCount).fill(meanItemProb)`),
which degenerates it to a plain binomial and over-reports readiness when weakness sits in a small fixed-quota
blueprint block (C2). Accept per-block inputs and build a heterogeneous p-vector — exact, no Monte Carlo.

Boolean acceptance criteria:
1. `computeReadiness` accepts per-block inputs `{ quota_b, meanProb_b }[]` (cat-B blueprint blocks) and
   builds the DP p-vector as `quota_b` entries of `meanProb_b`, concatenated across blocks, then runs the
   SAME exact `poissonBinomialAtLeast` DP over that heterogeneous vector.
2. The pool-mean constant-vector path is no longer used to compute `passProbability` when blueprint blocks
   are supplied (the `fill(meanItemProb)` degenerate vector is gone from the blueprint path).
3. Unit test — two-block case (18 strong ×0.95 + a 2-slot block ×0.10, pass threshold from the blueprint):
   asserts BOTH (a) the result ≈ the true heterogeneous Poisson-binomial tail (computed by hand or by an
   independent inline reference), AND (b) the result `!==` the degenerate pool-mean binomial value
   (proving the heterogeneity actually changed the answer).
4. Tests collected by `npx vitest list`; `npm test` exits 0; `npm run typecheck` exits 0.
5. `lib/readiness-model.ts` stays pure; `poissonBinomialAtLeast` itself UNCHANGED.

## Constraints / decisions
- Sum of `quota_b` should equal the blueprint `questionCount`; the built p-vector length equals that sum.
  Keep a sensible fallback for callers that supply no blocks (interim: the previous whole-pool mean vector)
  so existing call sites still typecheck — but the blueprint-blocks path is the corrected one under test.
- Compose cleanly with wave10f-05's Beta mock shrinkage (that shrinkage wraps the DP output; order:
  DP heterogeneous pass prob → then anchor with mock counts). Do not re-introduce the old blend.
- Non-Goal: unseen-prior honesty (wave10f-07); do NOT modify the DP kernel.

## Plan
- [x] Extend `ReadinessInput`/`ReadinessBlueprint` with per-block `{ quota, meanProb }[]`.
- [x] Build the heterogeneous p-vector and feed it to `poissonBinomialAtLeast` unchanged.
- [x] Add the two-block unit test asserting both the correct tail and inequality vs the pool-mean binomial.
- [x] `npm test` + `npm run typecheck` 0.

## Next
- [ ] (none — goal met; awaiting verify re-run.)

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01 ClPcs-Mac-mini: Added `ReadinessBlock` interface + `blocks?` on `ReadinessBlueprint`.
  `computeReadiness` now builds the DP p-vector heterogeneously (`quota_b` entries of `clamp01(meanProb_b)`,
  concatenated via `flatMap`) when blocks are supplied, running the UNCHANGED `poissonBinomialAtLeast` over it;
  the `fill(meanItemProb)` constant vector is now the no-blocks fallback only. Added the two-block unit test
  (18×0.95 + 2×0.10, pass 18/20): asserts passProbability ≈ exact heterogeneous tail AND < the degenerate
  pool-mean (μ=0.865) binomial value. `npx vitest run` 12/12; `npm test` 336/336; `npm run typecheck` 0. Status → done.

## Verify
**Last verify:** PASS (2026-07-01T20:35:43Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:36:41Z)
