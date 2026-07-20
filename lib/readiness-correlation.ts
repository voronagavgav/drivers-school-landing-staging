// ---------------------------------------------------------------------------
// Pure beta-binomial variance-inflation correction for the readiness tail.
// No DB, no clock, no randomness. (FSRS-READINESS-STRATEGY §Q3-B.)
//
// The flat Poisson-binomial model in lib/readiness-model.ts treats every exam
// slot as an INDEPENDENT Bernoulli trial. That over-states readiness near the
// pass threshold: answers to items in the SAME thematic block are correlated
// (knowing one road-sign question predicts its neighbours), so the true tail is
// heavier than the independence model claims. The honest fix keeps the
// Poisson-binomial MEAN and inflates per-block variance by the design effect
//     Var = n·p·(1−p)·(1 + (n−1)·ρ)
// which the Beta-binomial distribution realises EXACTLY. Blocks stay
// independent of each other (correlation is WITHIN a topic, not across the
// whole exam), so per-block Beta-binomial pmfs are convolved.
//
// ρ = 0 reproduces the independent Binomial per block BIT-FOR-BIT, so
// convolving the blocks equals the exact Poisson-binomial over the concatenated
// probability vector — a hard regression anchor (see the tests).
// ---------------------------------------------------------------------------

/** Clamp `x` into the closed unit interval `[0, 1]`. */
function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Beta-binomial pmf over `{0..n}` for shape params `(α, β)`:
 *   P(X = k) = C(n, k) · B(k+α, n−k+β) / B(α, β).
 *
 * Computed via the stable RATIO recurrence (no Gamma/overflow), starting from an
 * unnormalised weight `w[0] = 1` and stepping
 *   w[k] / w[k−1] = (n−k+1)/k · (α+k−1)/(β+n−k),
 * then normalising so the returned array sums to 1. Exact for integer/rational
 * shapes and stable for the near-degenerate small-ρ params this module builds.
 */
export function betaBinomialPmf(n: number, alpha: number, beta: number): number[] {
  const len = Math.max(0, Math.trunc(n)) + 1;
  const w = new Array<number>(len).fill(0);
  w[0] = 1;
  for (let k = 1; k < len; k++) {
    w[k] = (w[k - 1] * (n - k + 1) * (alpha + k - 1)) / (k * (beta + n - k));
  }
  const total = w.reduce((s, x) => s + x, 0);
  return total > 0 ? w.map((x) => x / total) : w;
}

/**
 * Beta shape params for a block with target mean per-item success `p` and
 * intraclass correlation `ρ ∈ (0, 1)`:
 *   α = p·(1−ρ)/ρ,  β = (1−p)·(1−ρ)/ρ,  with the round-trip ρ = 1/(α+β+1).
 * `p` is clamped to `[0, 1]`.
 */
export function betaParams(p: number, rho: number): { alpha: number; beta: number } {
  const pp = clamp01(p);
  const f = (1 - rho) / rho;
  return { alpha: pp * f, beta: (1 - pp) * f };
}

/** Alias matching the Wave 19b plan name; identical to {@link betaParams}. */
export const blockBetaBinomParams = betaParams;

/** Binomial(n, p) pmf via convolution of `n` independent Bernoulli(p) trials. */
function binomialPmf(n: number, p: number): number[] {
  const q = clamp01(p);
  let dp = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(dp.length + 1).fill(0);
    for (let j = 0; j < dp.length; j++) {
      next[j] += dp[j] * (1 - q);
      next[j + 1] += dp[j] * q;
    }
    dp = next;
  }
  return dp;
}

/**
 * pmf of #correct in a block of `n` items with per-item pass prob `p` and
 * intraclass correlation `ρ`. `ρ ≤ 0` returns the independent Binomial(n, p)
 * BIT-FOR-BIT (the regression anchor — avoids the α,β→∞ division). Otherwise the
 * Beta-binomial pmf for the `(p, ρ)`-derived shape params.
 */
export function correlatedBlockPmf(n: number, p: number, rho: number): number[] {
  const nn = Math.max(0, Math.trunc(n));
  if (rho <= 0) return binomialPmf(nn, p);
  // A degenerate block (p exactly 0 or 1) is a deterministic point mass — every
  // item shares the same certain outcome — so correlation adds nothing and the
  // Beta shape params blow up (β=0 at p=1, α=0 at p=0 → 0/0 in the recurrence,
  // NaN pmf). The Beta-binomial LIMIT at p∈{0,1} IS the binomial point mass, so
  // fall back to it and keep the tail finite (a freshly-reviewed block reads
  // meanProb=1.0 in production, hitting this every recompute).
  const pp = clamp01(p);
  if (pp <= 0 || pp >= 1) return binomialPmf(nn, pp);
  const { alpha, beta } = betaParams(pp, rho);
  return betaBinomialPmf(nn, alpha, beta);
}

/** One blueprint block: a fixed-quota slice with its own mean per-item success. */
export interface CorrelationBlock {
  /** Number of exam slots this block contributes (integer ≥ 0). */
  quota: number;
  /** Mean per-item success probability for items in this block, in `[0, 1]`. */
  meanProb: number;
}

/** Discrete convolution of two pmfs (probability of the summed count). */
function convolve(a: number[], b: number[]): number[] {
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      out[i + j] += a[i] * b[j];
    }
  }
  return out;
}

/**
 * Empirical estimate of the within-topic intraclass correlation ρ from
 * testlet-shaped data. Each `group` is one attempt/testlet's correct(1)/
 * incorrect(0) responses to a topic's items. READ-ONLY analytics — this does NOT
 * feed the live dial (which uses the {@link READINESS_TOPIC_CORRELATION} default
 * until a future data-gated wave); it only MEASURES ρ so it can become empirical
 * as ReviewLog data accrues (Wave 19b deliverable #1).
 *
 * ESTIMATOR (the PAIRWISE binary intraclass correlation — the standard closed
 * form, cited here as the external definition, NOT derived by calling anything):
 *   p̂ = (Σ over all responses of y) / (total responses)
 *   ρ̂ = [ Σ_g Σ_{i<j} (y_gi − p̂)(y_gj − p̂) ] / [ (Σ_g C(n_g, 2)) · p̂·(1 − p̂) ]
 * i.e. the mean within-group pairwise product normalised by the Bernoulli
 * variance. Equivalently the Pearson correlation between item pairs sharing a
 * group: perfectly concordant groups → +1, perfectly discordant → −1, a
 * balanced mix → 0.
 *
 * Returns `null` when there are `< 1` usable pairs (every group is a singleton)
 * or the pooled variance `p̂·(1 − p̂)` is 0 (all responses identical → the
 * correlation is undefined). The estimator can legitimately return NEGATIVE
 * values (anti-correlation) and can exceed the beta-binomial-usable `[0, 1)` on
 * tiny samples — that is fine; consumers clamp/label as needed. Do NOT clamp
 * here (it would corrupt the oracle).
 */
export function measureTopicCorrelation(groups: { outcomes: (0 | 1)[] }[]): number | null {
  let sumY = 0;
  let totalN = 0;
  let totalPairs = 0;
  for (const g of groups) {
    for (const y of g.outcomes) sumY += y;
    totalN += g.outcomes.length;
    const n = g.outcomes.length;
    totalPairs += (n * (n - 1)) / 2;
  }
  if (totalPairs < 1 || totalN === 0) return null;
  const pHat = sumY / totalN;
  const variance = pHat * (1 - pHat);
  if (variance === 0) return null;
  let pairSum = 0;
  for (const g of groups) {
    const dev = g.outcomes.map((y) => y - pHat);
    for (let i = 0; i < dev.length; i++) {
      for (let j = i + 1; j < dev.length; j++) {
        pairSum += dev[i] * dev[j];
      }
    }
  }
  return pairSum / (totalPairs * variance);
}

/**
 * `P(total correct ≥ threshold)` across INDEPENDENT blocks, each an internally
 * CORRELATED Beta-binomial (`n = quota`, `p = meanProb`, `ρ = rho`). Per-block
 * pmfs are convolved into the total-count distribution.
 *
 * `ρ = 0` reduces each block to the independent Binomial, so the convolution
 * equals the exact Poisson-binomial over the concatenated probability vector —
 * i.e. correlation changes nothing (bit-for-bit regression anchor). For a
 * threshold at/below the total mean (the exam "need ≥18/20" regime) a higher `ρ`
 * lowers `P(pass)`.
 */
export function correlatedPassProbability(
  blocks: CorrelationBlock[],
  threshold: number,
  rho: number,
): number {
  let total = [1];
  for (const b of blocks) {
    total = convolve(total, correlatedBlockPmf(b.quota, b.meanProb, rho));
  }
  const k = Math.trunc(threshold);
  if (k <= 0) return 1;
  if (k >= total.length) return 0;
  let tail = 0;
  for (let i = k; i < total.length; i++) tail += total[i];
  return clamp01(tail);
}
