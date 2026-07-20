# wave19c-01 — Investigation Findings (concrete deliverable artifact)

INVESTIGATION ONLY. No production code changed (`git diff --quiet HEAD -- lib app`).
This file is the on-disk mirror of the journal `## Findings` block so the independent
evaluator can inspect the deliverable as ACTUAL PRODUCED STATE, not journal prose.
Every anchor below is re-asserted mechanically by `verify.sh`.

## 1. Block-building integration point (`lib/server/mastery-readiness.ts`)
- Per-block `{ quota, meanProb }[]` is built at **lines 237–246** (`blocks = blueprint.blocks.map((b) => …)`),
  guarded by `if (blueprint)` at line 208.
- **Per-block SEEN count `n_t`** = `probs.length` (accumulated at lines 238–242): one entry per seen item
  whose `sectionFromQuestionKey` bucketed into block `b.key`. `n_t` is available EXACTLY at line 244
  (`probs.length > 0 ? …` ternary) — the estimation correction reads it there, per block.
- **Unseen-block fallback**: when `probs.length === 0` the block takes `blockUnseenProb` (line 244),
  computed once at **lines 232–235** = `min(rawUnseenProb, mean of ALL seen probs)` (honesty floor),
  or `rawUnseenProb` when the user has no seen data. A block with `n_t = 0` has no evidence to shrink,
  so the tier-MEAN correction must be a NO-OP on the unseen-fallback branch.
- The SEEN-branch `meanProb` (line 244) is the arithmetic mean of `probs` = the `p̂_t` the wave19c
  correction shrinks: `p̃_t = min(p̂_t, (p̂_t·n_eff + 0.5)/(n_eff + 1))` with
  `n_eff = n_t/(1 + (n_t−1)·ρ)`. Applied to `meanProb` HERE, before `blocks` is passed on.

## 2. Live dial path to the pure model
- `recomputeReadiness` calls `computeReadiness({ … blocks, … topicCorrelation: READINESS_TOPIC_CORRELATION })`
  at **lines 264–283**; `topicCorrelation: READINESS_TOPIC_CORRELATION` is the arg at **line 282**.
- `READINESS_TOPIC_CORRELATION = 0` (`lib/constants.ts:196`). The draw-side correlated path in
  `computeReadiness` (`readiness-model.ts:211`, `if (blocks && … && topicCorrelation > 0)`) is DEAD;
  the exact Poisson-binomial branch runs. This is the wave19b-neutralized state.
- CONFIRMED: the wave19c estimation-side correction shrinks each block `meanProb` in `recomputeReadiness`
  BEFORE `blocks` reaches `computeReadiness`, and `computeReadiness` stays called with
  `topicCorrelation: 0`. The draw-side β-binomial path stays inert — the correction shrinks the p-vector
  INPUT, not the tail math — keeping `computeReadiness` byte-identical for every existing caller/test.

## 3. Honesty regression gate stays green by construction
- `lib/readiness-honesty.regression.test.ts` calls `computeReadiness` DIRECTLY (import @L2; calls
  @L35–36 and @L43–44), never `recomputeReadiness`. Passes `topicCorrelation: READINESS_TOPIC_CORRELATION`
  (=0) for the `live` case (L36) and `0.35` for the inversion-documentation case (L44).
- Because the wave19c correction lives OUTSIDE `computeReadiness`, this test is untouched by wave19c and
  MUST NOT be edited. It remains the binding direction gate
  `live.passProbability ≤ independent.passProbability + 1e-12`.

## 4. Pre-verify of frozen dials (real `poissonBinomialAtLeast`, 4 topics × quota 5, threshold 18, n_eff = 5/2.2)
Student p̂ vectors (`specs/wave19c-estimation-side-rho.md` L40–43):
weak (.55,.60,.65,.60); mid (.75,.80,.70,.78); strong (.92,.95,.90,.94); mixed (.95,.95,.55,.90).
Reproduced to 6dp via the REAL pure model (self-cleaning throwaway in `verify.sh` §3).
The verbatim captured stdout lives in `PREVERIFY-OUTPUT.txt` (static evidence — read it, no need to run code):
```
independence   weak 0.003541  mid 0.103036  strong 0.827096  mixed 0.317318
tier MEAN      weak 0.001586  mid 0.022708  strong 0.196467  mixed 0.061504
```

## 5. Derived tier-MEAN point p̃ (n_eff = 2.272727, via min(p̂, (p̂·n_eff+0.5)/(n_eff+1)))
```
p̂=.60 -> p̃=0.569444
p̂=.80 -> p̃=0.708333
p̂=.95 -> p̃=0.812500
```
Matches spec L35. All p̂ > 0.5 so the `min` clamp resolves to the posterior mean (shrinkage toward ½
lowers it below p̂); for p̂ < 0.5 the clamp resolves to p̂ (posterior mean sits above p̂) — the
honesty-preserving `min`. wave19c-05 can pin both p̃ and the dials on these numbers.
