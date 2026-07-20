# SPEC — Wave 19c: estimation-side correlation correction (the CORRECT ρ penalty)

Replaces the neutralized draw-side tail inflation from wave19b (see `READINESS_TOPIC_CORRELATION` comment,
the wave19b-hotfix `ac5cf1e`, and the binding gate `lib/readiness-honesty.regression.test.ts`).
Math source: `docs/research/RHO-CORRECTION-RESEARCH-2026-07-12.json` — deep-research verified 3-0 per claim
(Kish/Rao-Scott design effect; Jeffreys interval under clustering, Franco-Little-Louis-Slud JSSAM 2017;
Dean-Pagano monotone-direction; Lord-Wingersky/PB equivalence González-Wiberg-von Davier 2016; MPIR
non-concavity rejection of draw-side inflation, Chateauneuf-Cohen-Meilijson). ALL numeric oracles below are
FROZEN from that research (scipy 1.18, recomputed live during verification) — implementation must match
them, never regenerate them from its own output.

## The correction (per topic block t entering the blueprint p-vector)
1. `n_eff,t = n_t / (1 + (n_t − 1)·ρ)` — n_t = number of SEEN evidence items in the topic (NOT the exam
   quota), ρ = READINESS_TOPIC_CORRELATION_ESTIMATION (new constant; default 0.3).
2. Jeffreys pseudo-posterior `Beta(a,b)`, `a = p̂_t·n_eff,t + ½`, `b = (1−p̂_t)·n_eff,t + ½` where p̂_t is
   the block mean retrievability (existing meanProb).
3. Two tiers:
   - **Tier MEAN (live default):** `p̃_t = min(p̂_t, a/(a+b))` — posterior-mean shrinkage toward ½,
     min-clamped so it can never raise p̂ (the clamp binds when p̂_t < ½).
   - **Tier QUANTILE (implemented, parked behind a constant):** `p̃_t = min(p̂_t, BetaInv(α; a, b))`,
     α default 0.2; Šidák note (α = 1−γ^{1/T}) documented, not wired.
4. Feed p̃ through the EXISTING exact Poisson-binomial DP (`poissonBinomialAtLeast`) — no new tail math.
   The wave19b β-binomial pmf lib stays as-is (correct math, unused by the live dial).

## Direction guarantees (must be pinned as tests, they are the point)
- (i) min-clamp ⇒ p̃_i ≤ p̂_i for every block; (ii) PB tail is monotone nondecreasing in each p_i
  ⇒ dial(p̃) ≤ dial(p̂) = independence baseline, for EVERY student (weak included). This must keep
  `lib/readiness-honesty.regression.test.ts` green BY CONSTRUCTION (do not edit that gate).
- (iii) monotone in ρ: larger ρ ⇒ smaller n_eff ⇒ p̃ weakly lower ⇒ dial weakly lower. Pin at two ρ values.
- Beta needs no p∈{0,1} NaN guard at the DP boundary, but pin p̂=0 and p̂=1 behavior explicitly
  (a=½ or b=½ cases): p̃ finite, in [0,1], clamp still holds.

## FROZEN ORACLES (external — from the research, scipy 1.18; freeze as literals with source comments)
- n_eff: n=5, ρ=0.3 → 2.272727… (pin ≥10dp as 5/2.2).
- Posterior-mean tier (n_eff=2.272727): p̂=.60→0.569444, p̂=.80→0.708333, p̂=.95→0.8125.
- Quantile tier q20 (α=0.2, n_eff=2.272727): p̂=.60→0.339343, p̂=.80→0.511245, p̂=.95→0.665395.
- End-to-end dials (n=20 = 4 topics × 5 quota, threshold ≥18, ρ=0.3, per-topic seen n_t=5):
  | student p̂ per topic | independence | tier MEAN | tier QUANTILE(α=.2) |
  |---|---|---|---|
  | weak (.55,.60,.65,.60) | 0.003541 | 0.001586 | ≈0.000000 |
  | mid (.75,.80,.70,.78) | 0.103036 | 0.022708 | 0.000078 |
  | strong (.92,.95,.90,.94) | 0.827096 | 0.196467 | 0.009722 |
  | mixed (.95,.95,.55,.90) | 0.317318 | 0.061504 | 0.000722 |
  (Derive the tier-MEAN p̃ vectors via the formula; the DIAL values above are the frozen end-to-end truth.)
- Draw-side rejection regression (already partially gated): independence p=0.6 n=20 k≥18 → 0.003611;
  β-binomial ρ=0.3 same → 0.214233 (the wrong-direction result — belongs in the documentation test).

## Server wiring
- `recomputeReadiness` applies tier MEAN to each block meanProb BEFORE building the p-vector; passes
  `topicCorrelation: 0` (the draw-side path stays dead). Per-block seen counts (n_t) come from the same
  ReviewState join that builds meanProb today.
- inputsJson: append `rhoEst`, `tier` ("mean"|"quantile"|"off"), per-block `nEff` (rounded 4dp) —
  append-only, old rows tolerated.
- Also record the UNCORRECTED independence dial alongside (new inputsJson field `dialIndep`) so the
  PassOutcome calibration view can compare tiers against real outcomes and pick empirically.
- UI: no copy change beyond what exists (the disclaimer already ships); dial just gets more honest.

## Honesty stance (why tier MEAN live, quantile parked)
Never-above-independence is guaranteed by the clamp in both tiers. The quantile tier at α=0.2 crushes a
genuinely strong student 0.83→0.01 — over-conservatism is ALSO miscalibration; the PassOutcome pipeline
(wave19a) exists to measure which tier tracks real ТСЦ outcomes and the admin calibration view can show
Brier/ECE per tier once outcomes accrue. Machinery ships now; aggressiveness is a data decision later.

## House rules
Pure math in lib/ (injected everything, no Date.now/Math.random), oracle rule (values above are the
oracle — never recompute from the implementation), production-path integration test through
recomputeReadiness, typecheck+unit+integration green per task, keep the wave19b hotfix gates green
unmodified. Evaluator: REJECT trigger (e) fixture-population dodging is live — direction claims must be
tested on the WEAK-student population.
