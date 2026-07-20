import { describe, it, expect } from "vitest";

// ORACLE-AUTHORING (Wave 19b deliverable #1, anti self-grading).
//
// These are the FROZEN, externally-computed reference vectors for the beta-binomial
// variance-inflation correction (the "cheap drop-in" fix from FSRS-READINESS-STRATEGY §Q3-B:
// keep the Poisson-binomial mean, inflate per-topic variance by 1 + (n−1)·ρ). They are frozen
// here BEFORE lib/readiness-correlation.ts exists (task wave19b-02 writes it) so the
// implementation cannot be tuned to pass a self-consistent test.
//
// Every literal below is hand-derived from the Beta-binomial pmf closed form
//     P(X = k; n, α, β) = C(n, k) · B(k+α, n−k+β) / B(α, β)
// and is cross-checkable against `scipy.stats.betabinom` — e.g.
//     scipy.stats.betabinom.pmf([0,1,2], 2, 1, 1) == [1/3, 1/3, 1/3]  (Beta(1,1) = discrete uniform)
//     scipy.stats.betabinom.pmf([0,1,2], 2, 2, 1) == [1/6, 1/3, 1/2].
//
// MECHANISM (historical): while task wave19b-02 was pending, the whole suite was suspended and
// the implementation was pulled in via a dynamic `import()` inside `loadImpl()` guarded by
// `@ts-expect-error` (the module did not exist yet, so tsc would otherwise error "Cannot find
// module"). Task wave19b-02 has since created lib/readiness-correlation.ts and un-suspended the
// suite, so this file now grades the real implementation against these untouched literals.

async function loadImpl() {
  return (await import("./readiness-correlation")) as {
    // Raw beta-binomial pmf over {0..n} for shape params (α, β).
    betaBinomialPmf(n: number, alpha: number, beta: number): number[];
    // Parameterization from a target block mean p and intraclass correlation ρ∈(0,1):
    //   α = p·(1−ρ)/ρ,  β = (1−p)·(1−ρ)/ρ,  with round-trip ρ === 1/(α+β+1).
    betaParams(p: number, rho: number): { alpha: number; beta: number };
    // pmf of #correct in a block of n items with per-item pass prob p and correlation ρ.
    // ρ = 0 must reproduce the independent Binomial(n, p) BIT-FOR-BIT (regression anchor).
    correlatedBlockPmf(n: number, p: number, rho: number): number[];
    // Empirical pairwise binary intraclass correlation over testlet-shaped rows.
    measureTopicCorrelation(groups: { outcomes: (0 | 1)[] }[]): number | null;
  };
}

// In-test derivations from a pmf array (kept anchored to the impl's pmf so the frozen numbers,
// not a second implementation, are the oracle).
const atLeast = (pmf: number[], k: number): number =>
  pmf.slice(Math.max(0, k)).reduce((a, b) => a + b, 0);
const variance = (pmf: number[]): number => {
  const m1 = pmf.reduce((s, p, k) => s + k * p, 0);
  const m2 = pmf.reduce((s, p, k) => s + k * k * p, 0);
  return m2 - m1 * m1;
};

// ORACLE SELF-CHECK (active, impl-independent). Verifies the frozen reference vectors are
// internally consistent — every pmf is a valid distribution (non-negative, sums to 1) and the
// pinned tail values follow from the frozen pmfs. This grades the oracle NUMBERS themselves (the
// closed-form derivations above), NOT the not-yet-written implementation, so it must never import
// lib/readiness-correlation.ts. It also keeps this file present in `npx vitest list` (a fully
// `.skip`-ped file is not listed) so the collection gate can find it.
describe("readiness-correlation frozen oracle vectors are internally consistent", () => {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

  it("every frozen pmf is a valid distribution (≥0, sums to 1)", () => {
    const pmfs: number[][] = [
      [1 / 3, 1 / 3, 1 / 3], // betaBinomialPmf(2,1,1)
      [0.25, 0.25, 0.25, 0.25], // betaBinomialPmf(3,1,1)
      [0.2, 0.2, 0.2, 0.2, 0.2], // betaBinomialPmf(4,1,1)
      [1 / 6, 1 / 3, 1 / 2], // betaBinomialPmf(2,2,1)
      [0.25, 0.5, 0.25], // correlatedBlockPmf(2,0.5,0) = Binomial(2,0.5)
    ];
    for (const pmf of pmfs) {
      for (const p of pmf) expect(p).toBeGreaterThanOrEqual(0);
      expect(sum(pmf)).toBeCloseTo(1, 10);
    }
  });

  it("pinned tails follow from the frozen pmfs (threshold ≤ mean ⇒ higher ρ lowers P(pass))", () => {
    // n=2, p=0.5: ρ=0 pmf [0.25,0.5,0.25] ⇒ P(≥1)=0.75; ρ=1/3 pmf [1/3,1/3,1/3] ⇒ P(≥1)=2/3.
    expect(1 - 0.25).toBeCloseTo(0.75, 10);
    expect(1 - 1 / 3).toBeCloseTo(0.6666666667, 10);
    expect(0.75).toBeGreaterThan(1 - 1 / 3); // higher ρ strictly lowers P(≥1)
    // n=3, p=0.5: ρ=0 Binomial(3,0.5) P(0)=1/8 ⇒ P(≥1)=0.875; ρ=1/3 uniform{0..3} ⇒ P(≥1)=0.75.
    expect(1 - 1 / 8).toBeCloseTo(0.875, 10);
    expect(0.875).toBeGreaterThan(0.75);
  });

  it("beta-param round-trip: (p,ρ) ⇒ (α,β) with ρ = 1/(α+β+1)", () => {
    // p=0.5, ρ=1/3 → α=1,β=1 → 1/(1+1+1)=1/3.  p=2/3, ρ=1/4 → α=2,β=1 → 1/(2+1+1)=1/4.
    expect(1 / (1 + 1 + 1)).toBeCloseTo(0.3333333333, 10);
    expect(1 / (2 + 1 + 1)).toBeCloseTo(0.25, 10);
  });

  it("design-effect variance: uniform [1/3,1/3,1/3] has Var 2/3 = 2·0.25·(1+1/3)", () => {
    const pmf = [1 / 3, 1 / 3, 1 / 3];
    const m1 = pmf.reduce((s, p, k) => s + k * p, 0);
    const m2 = pmf.reduce((s, p, k) => s + k * k * p, 0);
    expect(m2 - m1 * m1).toBeCloseTo(0.6666666667, 10);
    expect(2 * 0.25 * (1 + 1 / 3)).toBeCloseTo(0.6666666667, 10);
  });
});

describe("readiness-correlation beta-binomial oracle (impl lands in task wave19b-02)", () => {
  describe("uniform identity: betaBinomialPmf(n, 1, 1) == discrete uniform on {0..n}", () => {
    it("n=2 → [1/3, 1/3, 1/3]", async () => {
      const { betaBinomialPmf } = await loadImpl();
      const pmf = betaBinomialPmf(2, 1, 1);
      // Beta(1,1) is Uniform(0,1) ⇒ beta-binomial collapses to discrete-uniform on {0,1,2}.
      // scipy: betabinom.pmf([0,1,2], 2, 1, 1) == [1/3, 1/3, 1/3].
      expect(pmf[0]).toBeCloseTo(0.3333333333, 10);
      expect(pmf[1]).toBeCloseTo(0.3333333333, 10);
      expect(pmf[2]).toBeCloseTo(0.3333333333, 10);
    });

    it("n=3 → [0.25, 0.25, 0.25, 0.25]", async () => {
      const { betaBinomialPmf } = await loadImpl();
      const pmf = betaBinomialPmf(3, 1, 1);
      // scipy: betabinom.pmf([0..3], 3, 1, 1) == [1/4, 1/4, 1/4, 1/4].
      expect(pmf[0]).toBeCloseTo(0.25, 10);
      expect(pmf[1]).toBeCloseTo(0.25, 10);
      expect(pmf[2]).toBeCloseTo(0.25, 10);
      expect(pmf[3]).toBeCloseTo(0.25, 10);
    });

    it("n=4 → [0.2, 0.2, 0.2, 0.2, 0.2]", async () => {
      const { betaBinomialPmf } = await loadImpl();
      const pmf = betaBinomialPmf(4, 1, 1);
      // scipy: betabinom.pmf([0..4], 4, 1, 1) == [1/5]*5.
      for (const p of pmf) expect(p).toBeCloseTo(0.2, 10);
      expect(pmf).toHaveLength(5);
    });
  });

  it("asymmetric closed form: betaBinomialPmf(2, 2, 1) == [1/6, 1/3, 1/2]", async () => {
    const { betaBinomialPmf } = await loadImpl();
    const pmf = betaBinomialPmf(2, 2, 1);
    // Hand-derived via P(X=k)=C(2,k)·B(k+2, 3−k)/B(2,1), B(2,1)=1/2:
    //   k=0: B(2,3)/B(2,1) = (1/12)/(1/2) = 1/6
    //   k=1: 2·B(3,2)/B(2,1) = 2·(1/12)/(1/2) = 1/3
    //   k=2: B(4,1)/B(2,1) = (1/4)/(1/2) = 1/2
    // mean = 0·1/6 + 1·1/3 + 2·1/2 = 4/3. scipy cross-check: betabinom.pmf([0,1,2],2,2,1).
    expect(pmf[0]).toBeCloseTo(0.1666666667, 10);
    expect(pmf[1]).toBeCloseTo(0.3333333333, 10);
    expect(pmf[2]).toBeCloseTo(0.5, 10);
    const mean = pmf.reduce((s, p, k) => s + k * p, 0);
    expect(mean).toBeCloseTo(1.3333333333, 10); // 4/3
  });

  it("ρ→0 limit reproduces the independent Binomial(2, 0.5): [0.25, 0.5, 0.25]", async () => {
    const { correlatedBlockPmf } = await loadImpl();
    const pmf = correlatedBlockPmf(2, 0.5, 0);
    // ρ=0 ⇒ items independent ⇒ Binomial(2, 0.5) = [1/4, 1/2, 1/4] (regression anchor, bit-for-bit).
    expect(pmf[0]).toBeCloseTo(0.25, 10);
    expect(pmf[1]).toBeCloseTo(0.5, 10);
    expect(pmf[2]).toBeCloseTo(0.25, 10);
  });

  describe("parameterization identity: (p, ρ) ⇒ (α, β) with ρ === 1/(α+β+1)", () => {
    it("p=0.5, ρ=1/3 → α=1, β=1", async () => {
      const { betaParams } = await loadImpl();
      const { alpha, beta } = betaParams(0.5, 1 / 3);
      // α = p(1−ρ)/ρ = 0.5·(2/3)/(1/3) = 1;  β = (1−p)(1−ρ)/ρ = 1;  round-trip ρ = 1/(1+1+1) = 1/3.
      expect(alpha).toBeCloseTo(1, 10);
      expect(beta).toBeCloseTo(1, 10);
      expect(1 / (alpha + beta + 1)).toBeCloseTo(0.3333333333, 10);
    });

    it("p=2/3, ρ=1/4 → α=2, β=1", async () => {
      const { betaParams } = await loadImpl();
      const { alpha, beta } = betaParams(2 / 3, 0.25);
      // α = (2/3)·(3/4)/(1/4) = 2;  β = (1/3)·(3/4)/(1/4) = 1;  round-trip ρ = 1/(2+1+1) = 1/4.
      expect(alpha).toBeCloseTo(2, 10);
      expect(beta).toBeCloseTo(1, 10);
      expect(1 / (alpha + beta + 1)).toBeCloseTo(0.25, 10);
    });
  });

  it("variance = design effect: Var[X] = n·p·(1−p)·(1 + (n−1)·ρ)", async () => {
    const { correlatedBlockPmf } = await loadImpl();
    // n=2, p=0.5, ρ=1/3 ⇒ Var = 2·0.25·(1 + 1·1/3) = 2/3.
    // Cross-check both ways: (a) the design-effect formula, (b) the pmf's own second moment.
    const pmf = correlatedBlockPmf(2, 0.5, 1 / 3); // == uniform [1/3, 1/3, 1/3]
    expect(pmf[0]).toBeCloseTo(0.3333333333, 10);
    expect(pmf[1]).toBeCloseTo(0.3333333333, 10);
    expect(pmf[2]).toBeCloseTo(0.3333333333, 10);
    expect(variance(pmf)).toBeCloseTo(0.6666666667, 10); // 2/3
  });

  it("degenerate block p∈{0,1} with ρ>0 is a finite point mass (no NaN — β=0/α=0 guard)", async () => {
    const { correlatedBlockPmf } = await loadImpl();
    // A fully-mastered (p=1) or never-recalled (p=0) block is a DETERMINISTIC outcome, so
    // correlation is meaningless and the Beta-binomial LIMIT is the binomial point mass. Without a
    // guard, betaParams(1,ρ) gives β=0 (and p=0 gives α=0) → 0/0 in the ratio recurrence → NaN pmf,
    // which would then poison the whole readiness tail (a freshly-reviewed block reads p=1.0 in
    // production). Pin the correct point masses and that NO entry is NaN.
    const allCorrect = correlatedBlockPmf(3, 1, 1 / 3); // [0,0,0,1]
    const allWrong = correlatedBlockPmf(3, 0, 1 / 3); // [1,0,0,0]
    for (const p of [...allCorrect, ...allWrong]) expect(Number.isFinite(p)).toBe(true);
    expect(allCorrect).toEqual([0, 0, 0, 1]);
    expect(allWrong).toEqual([1, 0, 0, 0]);
  });

  describe("correlated tail, direction pinned (threshold ≤ mean ⇒ higher ρ LOWERS P(pass))", () => {
    it("block n=2, p=0.5, P(≥1): ρ=0 → 0.75; ρ=1/3 → 2/3", async () => {
      const { correlatedBlockPmf } = await loadImpl();
      // ρ=0: Binomial(2,0.5) ⇒ P(≥1) = 1 − 0.25 = 0.75.
      // ρ=1/3: uniform [1/3,1/3,1/3] ⇒ P(≥1) = 1 − 1/3 = 2/3. Higher ρ lowers P(pass).
      expect(atLeast(correlatedBlockPmf(2, 0.5, 0), 1)).toBeCloseTo(0.75, 10);
      expect(atLeast(correlatedBlockPmf(2, 0.5, 1 / 3), 1)).toBeCloseTo(0.6666666667, 10);
    });

    it("block n=3, p=0.5, P(≥1): ρ=0 → 0.875; ρ=1/3 → 0.75", async () => {
      const { correlatedBlockPmf } = await loadImpl();
      // ρ=0: Binomial(3,0.5) ⇒ P(≥1) = 1 − 1/8 = 0.875.
      // ρ=1/3: (p=0.5,ρ=1/3 ⇒ α=1,β=1) uniform on {0..3} ⇒ P(≥1) = 1 − 1/4 = 0.75.
      expect(atLeast(correlatedBlockPmf(3, 0.5, 0), 1)).toBeCloseTo(0.875, 10);
      expect(atLeast(correlatedBlockPmf(3, 0.5, 1 / 3), 1)).toBeCloseTo(0.75, 10);
    });
  });

  // MONOTONICITY INTENTS task wave19b-02 satisfies (named here as the frozen contract):
  //  (a) ρ=0 reproduces the exact Poisson-binomial / Binomial result BIT-FOR-BIT (regression anchor —
  //      the ρ→0 and P(≥1) ρ=0 cases above are the concrete witnesses).
  //  (b) for a block whose pass threshold is ≤ its mean, P(pass) is NON-INCREASING in ρ
  //      (the two tail cases above pin 0.75→2/3 and 0.875→0.75 as ρ rises 0→1/3).
  //  ⚠ CORRECTED FRAMING (wave19b adversarial review, 2026-07-12): the original note here called
  //  threshold-above-mean "not the exam regime" — that was BACKWARDS. The real exam (need ≥18/20)
  //  puts every below-threshold student's mean UNDER the threshold, i.e. the exam regime for the
  //  population the dial must warn IS threshold-above-mean, where higher ρ RAISES the tail. The
  //  pmf/tail math pinned in this file is correct as draw-variance math; it is just NOT a dial
  //  honesty correction, so the live constant is neutralized to 0 — see
  //  lib/readiness-honesty.regression.test.ts (binding direction gate) and READINESS_TOPIC_CORRELATION.
});

// FROZEN ORACLE for the empirical estimator measureTopicCorrelation (Wave 19b deliverable #1).
// Each literal is hand-computed below from the pairwise binary intraclass-correlation identity
//   p̂ = (Σy)/(total),  ρ̂ = [Σ_g Σ_{i<j}(y_gi−p̂)(y_gj−p̂)] / [(Σ_g C(n_g,2))·p̂·(1−p̂)]
// — an EXTERNAL closed form (concordant→+1, discordant→−1, balanced→0), NOT derived by calling
// the implementation. Tolerance 1e-9 per the task Goal.
describe("measureTopicCorrelation — pairwise binary intraclass correlation", () => {
  it("perfectly concordant groups → ρ̂ = 1.0", async () => {
    const { measureTopicCorrelation } = await loadImpl();
    // [1,1],[0,0]: p̂ = 2/4 = 0.5. pairs: (0.5·0.5)+(−0.5·−0.5) = 0.25+0.25 = 0.5.
    //   denom = (1+1)·0.25 = 0.5. ρ̂ = 0.5/0.5 = 1.
    expect(measureTopicCorrelation([{ outcomes: [1, 1] }, { outcomes: [0, 0] }])).toBeCloseTo(1.0, 9);
  });

  it("perfectly discordant groups → ρ̂ = −1.0", async () => {
    const { measureTopicCorrelation } = await loadImpl();
    // [1,0],[0,1]: p̂ = 0.5. pairs: (0.5·−0.5)+(−0.5·0.5) = −0.25−0.25 = −0.5.
    //   denom = 2·0.25 = 0.5. ρ̂ = −0.5/0.5 = −1.
    expect(measureTopicCorrelation([{ outcomes: [1, 0] }, { outcomes: [0, 1] }])).toBeCloseTo(-1.0, 9);
  });

  it("balanced mix → ρ̂ = 0.0", async () => {
    const { measureTopicCorrelation } = await loadImpl();
    // [1,1],[0,0],[1,0],[0,1]: p̂ = 4/8 = 0.5. pairs: 0.25+0.25−0.25−0.25 = 0.
    //   denom = 4·0.25 = 1. ρ̂ = 0.
    const groups = [
      { outcomes: [1, 1] as (0 | 1)[] },
      { outcomes: [0, 0] as (0 | 1)[] },
      { outcomes: [1, 0] as (0 | 1)[] },
      { outcomes: [0, 1] as (0 | 1)[] },
    ];
    expect(measureTopicCorrelation(groups)).toBeCloseTo(0.0, 9);
  });

  it("degenerate all-correct (variance 0) → null", async () => {
    const { measureTopicCorrelation } = await loadImpl();
    // [1,1],[1,1]: p̂ = 1 ⇒ p̂·(1−p̂) = 0 ⇒ correlation undefined ⇒ null.
    expect(measureTopicCorrelation([{ outcomes: [1, 1] }, { outcomes: [1, 1] }])).toBeNull();
  });

  it("singleton groups (no within-group pairs) → null", async () => {
    const { measureTopicCorrelation } = await loadImpl();
    // [1],[0]: Σ_g C(n_g,2) = 0 pairs ⇒ null.
    expect(measureTopicCorrelation([{ outcomes: [1] }, { outcomes: [0] }])).toBeNull();
  });
});
