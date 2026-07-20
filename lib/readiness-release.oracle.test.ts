import { describe, it, expect } from "vitest";

import { releaseDial } from "./readiness-release";

// FROZEN ORACLE for the end-to-end evidence-releasing readiness model —
// the future entrypoint `./readiness-release` (wave19d-07) MUST MATCH these
// dials; the implementation is NOT written here.
//
// Every literal is EXTERNAL: computed by `scripts/oracles/gen-19d-oracles.py`
// (numpy-only reference oracle; run 2026-07-13) from
// `specs/wave19d-blueprint-and-release.md` (Deliverables 2–3 + binding
// properties a–f) + the research JSON
// `docs/research/HIERARCHICAL-RELEASE-RESEARCH-2026-07-13.json`.
// DO NOT regenerate these literals from the TS implementation, and do not edit
// the literals or tolerances — wave19d-07 only un-skips and matches them.
//
// The composed model: per block p_slot + C (seen/unseen split, Deliverable 2);
//   independenceDial = exact Poisson-binomial over the raw per-slot p-vector;
//   mixtureDial      = one-factor Gauss–Hermite ICC mixture (Deliverable 3);
//   finalDial        = min(mixtureDial, independenceDial)  ← never-above guarantee.
// Dials below are reported as probability (≥10 sig digits) and as the rounded
// integer percent the UI shows (round(prob·100)).
//
// The impl-binding suite (wave19d-07) is now LIVE: it imports the real
// `./readiness-release` entrypoint and matches these frozen dials directly.

// ---- frozen end-to-end (a)–(f) dials (from gen-19d-oracles.py) --------------
// (a) NEVER-ABOVE-INDEPENDENCE. weak set (mean 0.7) ⇒ final === indep (min no-op);
//     strong set (mean 0.97) ⇒ final ≤ indep (mixture binds, lowers the tail).
const A_WEAK_INDEP = 0.0354831322985;
const A_WEAK_FINAL = 0.0354831322985;
const A_WEAK_FINAL_DIAL = 4;
const A_STRONG_INDEP = 0.978991643622;
const A_STRONG_FINAL = 0.951505707709;
const A_STRONG_FINAL_DIAL = 95;
const A_STRONG_INDEP_DIAL = 98;

// (b) ASYMPTOTIC RELEASE. p̂=0.95 across all blocks, rich evidence + full cov.
const B_INDEP = 0.924516326212;
const B_FINAL = 0.924223283803;
const B_INDEP_DIAL = 92;
const B_FINAL_DIAL = 92;

// (b′) 19c-ceiling counterexample now RELEASES. p̂=1.0, nSeen=1000, rich.
const BP_FINAL = 1;
const BP_FINAL_DIAL = 100;

// (c) SPARSE DISCOUNT (block sub-oracle values surfaced here).
const SPARSE_C = 0.5;
const SPARSE_PSLOT = 0.581818181818;

// (d) STUDY-NEVER-HURTS (R2 fix). 10 seen @0.95 + 1 unseen → add 11th seen @0.6.
const D_BEFORE_INDEP = 0.702773474539;
const D_AFTER_INDEP = 0.728393870894;
const D_BEFORE_FINAL = 0.666008997961;
const D_AFTER_FINAL = 0.689505940175;
const D_BEFORE_FINAL_DIAL = 67;
const D_AFTER_FINAL_DIAL = 69;

// (e) INSTRUMENT RANGE. perfect+rich ⇒ ≥95; hopeless+rich ⇒ ≤2.
const E_PERFECT_FINAL = 0.999998870004;
const E_PERFECT_FINAL_DIAL = 100;
const E_HOPELESS_FINAL = 0;
const E_HOPELESS_FINAL_DIAL = 0;

// (f) SINGLE UNCERTAINTY BUDGET. slope=1 rich ≈ indep; slope=0.6 strictly lower.
const F_SLOPE1_INDEP = 0.924516326212;
const F_SLOPE1_FINAL = 0.924223283803;
const F_SLOPE1_FINAL_DIAL = 92;
const F_SLOPE06_FINAL = 0.00162808082741;
const F_SLOPE06_FINAL_DIAL = 0;

// Fixtures mirror the oracle script's `dials(...)` calls (blocks: seen R list +
// unseen count per stratum, quotas pdr=10/safety=4/build=4/medical=2).
const homo = (R: number, nSeen: number, nUnseen: number) => ({ seenR: Array(nSeen).fill(R), nUnseen });
const quotas = { pdr: 10, safety: 4, build: 4, medical: 2 };
const flat = (b: ReturnType<typeof homo>) => [
  { quota: quotas.pdr, ...b },
  { quota: quotas.safety, ...b },
  { quota: quotas.build, ...b },
  { quota: quotas.medical, ...b },
];

describe("readiness-release end-to-end (frozen oracle, un-skipped in wave19d-07)", () => {
  it("(a) weak ⇒ final === indep (min no-op); strong ⇒ final ≤ indep", async () => {
    const weak = releaseDial({ blocks: flat(homo(0.7, 40, 0)), reviewMass: 4, slope: 1 });
    const strong = releaseDial({ blocks: flat(homo(0.97, 40, 0)), reviewMass: 4, slope: 1 });
    expect(weak.independence).toBeCloseTo(A_WEAK_INDEP, 8);
    expect(weak.final).toBeCloseTo(A_WEAK_FINAL, 8);
    expect(weak.final).toBeCloseTo(weak.independence, 12); // min-clamp no-op
    expect(strong.independence).toBeCloseTo(A_STRONG_INDEP, 8);
    expect(strong.final).toBeCloseTo(A_STRONG_FINAL, 8);
    expect(strong.final).toBeLessThanOrEqual(strong.independence + 1e-12);
  });

  it("(b) rich p̂=0.95 ⇒ |final − indep| ≤ 2pp and final ≥ 80", async () => {
    const b = releaseDial({ blocks: flat(homo(0.95, 50, 0)), reviewMass: 1000, slope: 1 });
    expect(b.independence).toBeCloseTo(B_INDEP, 8);
    expect(b.final).toBeCloseTo(B_FINAL, 8);
    expect(Math.abs(b.finalDial - b.independenceDial)).toBeLessThanOrEqual(2);
    expect(b.finalDial).toBeGreaterThanOrEqual(80);
  });

  it("(b′) p̂=1.0, nSeen=1000 ⇒ finalDial ≥ 95 (releases past the 19c ceiling)", async () => {
    const bp = releaseDial({ blocks: flat(homo(1.0, 1000, 0)), reviewMass: 1000, slope: 1 });
    expect(bp.final).toBeCloseTo(BP_FINAL, 8);
    expect(bp.finalDial).toBeGreaterThanOrEqual(95);
  });

  it("(d) study-never-hurts: after ≥ before (10 seen @0.95, then +1 seen @0.6)", async () => {
    const others = [
      { quota: quotas.safety, ...homo(0.9, 20, 0) },
      { quota: quotas.build, ...homo(0.9, 20, 0) },
      { quota: quotas.medical, ...homo(0.9, 20, 0) },
    ];
    const before = releaseDial({
      blocks: [{ quota: quotas.pdr, seenR: Array(10).fill(0.95), nUnseen: 1 }, ...others],
      reviewMass: 8, slope: 1,
    });
    const after = releaseDial({
      blocks: [{ quota: quotas.pdr, seenR: [...Array(10).fill(0.95), 0.6], nUnseen: 0 }, ...others],
      reviewMass: 8, slope: 1,
    });
    expect(before.final).toBeCloseTo(D_BEFORE_FINAL, 8);
    expect(after.final).toBeCloseTo(D_AFTER_FINAL, 8);
    expect(after.final).toBeGreaterThanOrEqual(before.final);
  });

  it("(e) perfect+rich ⇒ ≥95; hopeless+rich ⇒ ≤2", async () => {
    const perfect = releaseDial({ blocks: flat(homo(0.999, 200, 0)), reviewMass: 2000, slope: 1 });
    const hopeless = releaseDial({ blocks: flat(homo(0.0, 200, 0)), reviewMass: 2000, slope: 1 });
    expect(perfect.final).toBeCloseTo(E_PERFECT_FINAL, 8);
    expect(perfect.finalDial).toBeGreaterThanOrEqual(95);
    expect(hopeless.final).toBeCloseTo(E_HOPELESS_FINAL, 8);
    expect(hopeless.finalDial).toBeLessThanOrEqual(2);
  });

  it("(f) slope=1 rich ≈ indep; slope=0.6 strictly lower (slope participates once)", async () => {
    const s1 = releaseDial({ blocks: flat(homo(0.95, 50, 0)), reviewMass: 1000, slope: 1 });
    const s06 = releaseDial({ blocks: flat(homo(0.95, 50, 0)), reviewMass: 1000, slope: 0.6 });
    expect(s1.independence).toBeCloseTo(F_SLOPE1_INDEP, 8);
    expect(s1.final).toBeCloseTo(F_SLOPE1_FINAL, 8);
    expect(Math.abs(s1.finalDial - s1.independenceDial)).toBeLessThanOrEqual(2);
    expect(s06.final).toBeCloseTo(F_SLOPE06_FINAL, 8);
    expect(s06.final).toBeLessThan(s1.final);
  });
});

// IMPL-INDEPENDENT self-consistency of the frozen (a)–(f) dials themselves — so
// `npx vitest list` collects this file and it stays green BEFORE wave19d-07.
describe("frozen release dials are self-consistent (no impl)", () => {
  it("(a) never-above-independence holds on the literals", () => {
    expect(A_WEAK_FINAL).toBe(A_WEAK_INDEP); // min no-op for the weak set
    expect(A_STRONG_FINAL).toBeLessThanOrEqual(A_STRONG_INDEP);
    expect(A_STRONG_FINAL_DIAL).toBeLessThanOrEqual(A_STRONG_INDEP_DIAL);
    expect(A_WEAK_FINAL_DIAL).toBe(4);
  });

  it("(b) release within 2pp and final ≥ 80", () => {
    expect(Math.abs(B_FINAL_DIAL - B_INDEP_DIAL)).toBeLessThanOrEqual(2);
    expect(B_FINAL_DIAL).toBeGreaterThanOrEqual(80);
    expect(B_FINAL).toBeLessThanOrEqual(B_INDEP);
  });

  it("(b′) counterexample releases to the top band (≥95, not the 19c ~59% ceiling)", () => {
    expect(BP_FINAL_DIAL).toBeGreaterThanOrEqual(95);
    expect(BP_FINAL).toBeGreaterThan(0.59);
  });

  it("(c) sparse C < 0.7 (does not certify) and its p_slot sits below the seen mean", () => {
    expect(SPARSE_C).toBeLessThan(0.7);
    expect(SPARSE_PSLOT).toBeLessThan(0.95);
  });

  it("(d) study-never-hurts: after ≥ before (final and dial), indep also non-decreasing", () => {
    expect(D_AFTER_FINAL).toBeGreaterThanOrEqual(D_BEFORE_FINAL);
    expect(D_AFTER_FINAL_DIAL).toBeGreaterThanOrEqual(D_BEFORE_FINAL_DIAL);
    expect(D_AFTER_INDEP).toBeGreaterThanOrEqual(D_BEFORE_INDEP);
  });

  it("(e) instrument spans the full range: perfect ≥95, hopeless ≤2", () => {
    expect(E_PERFECT_FINAL_DIAL).toBeGreaterThanOrEqual(95);
    expect(E_HOPELESS_FINAL_DIAL).toBeLessThanOrEqual(2);
  });

  it("(f) slope participates in release: slope=1 ≈ indep, slope=0.6 strictly lower", () => {
    expect(Math.abs(F_SLOPE1_FINAL_DIAL - B_INDEP_DIAL)).toBeLessThanOrEqual(2);
    expect(F_SLOPE06_FINAL).toBeLessThan(F_SLOPE1_FINAL);
    expect(F_SLOPE06_FINAL_DIAL).toBeLessThan(F_SLOPE1_FINAL_DIAL);
  });
});
