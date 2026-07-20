# Task: wave10-06-readiness-model

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Spec §D — pure `lib/readiness-model.ts`: honest pass-probability via the exact Poisson-binomial DP.
PASS = ALL true:

1. `lib/readiness-model.ts` exports:
   - `perItemPassProb(r, calibrationSlope?)` → a probability in `[0,1]` (R × slope, clamped).
   - `poissonBinomialAtLeast(k, ps)` → `P(≥k successes)` over independent Bernoulli `ps[]`, via the exact DP.
   - `computeReadiness(input)` where `input = { seen: number[] /* per-seen-item R */, unseenCount: number,
     unseenPrior: number, blueprint?: { questionCount?: number; passThreshold?: number },
     mockPassRate?: number, calibrationSlope?: number }` → `{ passProbability: number; dialPercent: number;
     ... }`. `passProbability` = `P(≥ passThreshold of questionCount)` (defaults 18 of 20) over the drawn
     per-item `p`s, with UNSEEN items using `unseenPrior` (~0.5–0.6); then shrunk toward `mockPassRate` when
     present.
2. EXACT DP correctness (unit-proven to ±1e-9):
   - `poissonBinomialAtLeast(2, [0.2, 0.5, 0.9])` = `0.55`.
   - `poissonBinomialAtLeast(2, [0.5, 0.5, 0.5])` = `0.5` (all-equal-p equals the binomial complement).
3. HONEST-BY-CONSTRUCTION monotonicity:
   - readiness RISES as seen-R rises: `computeReadiness` with all-high-R `seen` yields a strictly greater
     `dialPercent` (and `passProbability`) than with all-low-R `seen`, holding everything else equal.
   - MORE unseen items LOWER it: increasing `unseenCount` (with a conservative `unseenPrior ≤ 0.6`, holding
     `seen` fixed) yields a `dialPercent` that is ≤ the smaller-unseen case (strictly lower when it bites).
4. `dialPercent` is an integer in `[0, 100]` for every input; `passProbability` ∈ `[0,1]`.
5. PURITY: `lib/readiness-model.ts` contains NONE of `server-only`, `@/lib/db`, `@prisma/client`,
   `lib/generated`, `Math.random`, `Date.now`, `new Date` (and no JSX).
6. `lib/readiness-model.test.ts` (included per `npx vitest list`) asserts the two exact DP values (Goal 2),
   both monotonic properties (Goal 3), and `dialPercent ∈ 0..100`.
7. `npm run typecheck` 0; `npm test` 0 (ZERO failures).

## Constraints / decisions
- PURE + deterministic — no clock, no RNG (the DP is fully determined by its inputs).
- Distinct file from the existing `lib/readiness.ts` (the legacy 3-band estimator, wave5-09) — do NOT modify
  or merge that; `lib/readiness-model.ts` is the new Poisson-binomial model.
- Unseen items MUST drag the number down (conservative prior) so thin coverage never over-reports readiness —
  this is the honesty invariant (plan §0.6 / §6). Blueprint topic-weighting may be layered later; only the
  `questionCount`/`passThreshold` shape + the monotonic/DP properties are required here.
- Non-Goal: persisting `ReadinessSnapshot`, the dashboard dial, any DB read, the nightly recompute (Wave 11).

## Plan
- [x] Write `poissonBinomialAtLeast` (exact DP) + `perItemPassProb`.
- [x] Write `computeReadiness` (seen `p`s + unseen prior → P(≥18/20) → mock shrinkage → dialPercent 0..100).
- [x] Write `lib/readiness-model.test.ts` (exact DP values, monotonicity, dial range).
- [x] `npm run typecheck` && `npm test`; confirm inclusion via `npx vitest list`.

## Next
- [x] DONE — Goal fully met; `verify.sh` green (SMOKE OK hi=92 lo=0 few=43 many=0; typecheck 0; 324 tests
  pass). Nothing further for this task. Downstream consumers (dashboard dial, `ReadinessSnapshot` persist,
  nightly recompute) are Wave 11 / other tasks — out of scope here.

## Artifacts
- `lib/readiness-model.ts` — pure Poisson-binomial readiness model. Exports `perItemPassProb(r, slope?)`,
  `poissonBinomialAtLeast(k, ps)` (exact O(n·k) tail DP), and now `computeReadiness(input)` plus the
  `ReadinessInput`/`ReadinessResult`/`ReadinessBlueprint` types. Model: pool = seen mapped via
  `perItemPassProb` ∪ `unseenCount` items at `unseenPrior`; a random exam draw lands on any pool item equally,
  so each of `questionCount` slots is Bernoulli(pool mean μ) → `passProbability = poissonBinomialAtLeast(
  passThreshold, [μ]×questionCount)`; shrunk toward `mockPassRate` (weight 0.35) when present; `dialPercent =
  round(passProbability×100)`. Result also carries `meanItemProb`/`expectedCorrect`/`coverage` diagnostics.
- `lib/readiness-model.test.ts` — asserts the two exact DP values (0.55, 0.5) + edge cases, `perItemPassProb`
  clamping, both honesty-monotonicity properties (higher seen-R ↑, more unseen ↓, on both dialPercent AND
  passProbability), and `dialPercent ∈ 0..100` integer (incl. degenerate empty pool). In the unit suite per
  `npx vitest list`.

## Log
- 2026-07-01 planner: task authored from specs/wave10-srs-foundation.md §D.
- 2026-07-01T00:00Z ClPcs-Mac-mini: created `lib/readiness-model.ts` with exact O(n·k) `poissonBinomialAtLeast`
  (descending-index convolution DP, drops mass past k-1, tail = 1−Σdp[0..k-1]) + `perItemPassProb` (R×slope
  clamped). `npx tsc --noEmit` clean; tsx smoke confirms the two Goal-2 exact values (0.55, 0.5) and edge
  cases (k≤0→1, k>n→0). No test file yet (next increment pairs with computeReadiness).
- 2026-07-01T20:15Z ClPcs-Mac-mini: added `computeReadiness(input)` (+ `ReadinessInput`/`ReadinessResult`/
  `ReadinessBlueprint`) — pool-mean μ over seen∪unseen → binomial-collapsed Poisson-binomial (a random draw
  lands on any item equally, so each slot ~Bernoulli(μ); heterogeneity is not extra variance for a random
  exam) → mock shrinkage (0.35) → integer `dialPercent`. Defaults 18/20, threshold clamped to `[0,
  questionCount]`; empty pool falls back to `unseenPrior` (no NaN). Wrote `lib/readiness-model.test.ts`
  mirroring `readiness.test.ts` style. `verify.sh` GREEN: SMOKE OK (hi=92 lo=0 few=43 many=0), typecheck 0,
  324 unit tests pass, file in `npx vitest list`. Task Status → done.


## Verify
**Last verify:** PASS (2026-07-01T17:16:05Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T17:17:15Z)
