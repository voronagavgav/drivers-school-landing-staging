import { describe, it, expect } from "vitest";

// FROZEN ORACLE for the per-block seen/unseen split (Deliverable 2,
// Lahiri–Mukherjee form) — the future module `./readiness-seen-unseen`
// (wave19d-05) MUST MATCH these values; the implementation is NOT written here.
//
// Every literal is EXTERNAL: computed by `scripts/oracles/gen-19d-oracles.py`
// (numpy-only reference oracle; run 2026-07-13) from the formulas in
// `specs/wave19d-blueprint-and-release.md` (Deliverable 2) + the research JSON
// `docs/research/HIERARCHICAL-RELEASE-RESEARCH-2026-07-13.json`.
// DO NOT regenerate these literals from the TS implementation, and do not edit
// the literals or tolerances — wave19d-05 only un-skips and matches them.
//
// The split, per stratum block (see the script header for the frozen model):
//   seenPs   = perItemPassProb(R_i, slope)  over the block's SEEN items
//   seenMean = mean(seenPs)
//   Jeffreys posterior-predictive mean  C0 = (0.5 + Σ seenPs) / (1 + nSeen)
//   C        = min(C0, seenMean, PRIOR·slope)   (the honesty clamp, per block)
//   p_slot   = (Σ seenPs + nUnseen · C) / nPool        nPool = nSeen + nUnseen
// Seen items are NEVER shrunk; p_slot → seenMean as coverage grows (nUnseen→0).
//
// While the impl does not yet exist the impl-binding suite is suspended and
// reaches the future module via a dynamic import (the missing-module type error
// is silenced by a `// @ts-expect-error`); wave19d-05 removes both.

// ---- frozen literals (from gen-19d-oracles.py, ≥10 sig digits) --------------
const PRIOR = 0.5; // READINESS_UNSEEN_PRIOR

// (c) SPARSE: nSeen=2 @ p̂=0.95 in an 11-slot block (9 unseen) — C near the prior.
const SPARSE_C0 = 0.8;
const SPARSE_C = 0.5;
const SPARSE_SEENMEAN = 0.95;
const SPARSE_PSLOT = 0.581818181818;

// mid coverage: nSeen=8 @0.95, 3 unseen — C pinned at the clamped prior, p_slot
// released toward seenMean vs the sparse case.
const MID_C = 0.5;
const MID_PSLOT = 0.827272727273;

// full coverage: nSeen=11 @0.95, 0 unseen — p_slot === seenMean exactly.
const FULL_PSLOT = 0.95;

// (d) STUDY-NEVER-HURTS block level (pdr pool 11): BEFORE = 10 seen @0.95 + 1
// unseen; AFTER = add the 11th seen item at R=0.6 (0 unseen). p_slot must not drop.
const D_BEFORE_PSLOT = 0.909090909091;
const D_AFTER_PSLOT = 0.918181818182;

describe("readiness-seen-unseen split (frozen oracle, un-skipped in wave19d-05)", () => {
  it("EMPTY stratum (nSeen=0) sits AT the prior — never certain-wrong (2026-07-13 review MAJOR)", async () => {
    // Frozen from gen-19d-oracles.py `block_extrapolation` n==0 branch:
    // C0 = C = seenMean = per_item(PRIOR, slope); block_p_slot([], n) = per_item(PRIOR, slope).
    // The pre-fix impl let seenMean=0 into the min-clamp → C=0 → pSlot=0: an untouched 2-slot
    // stratum scored "certain wrong", crushing the dial of a student strong everywhere else.
    // This was the one boundary every prior case avoided (smallest frozen case = nSeen 2).
    const { blockSplit } = await import("./readiness-seen-unseen");
    const r = blockSplit([], 5, PRIOR, 1);
    expect(r.seenMean).toBeCloseTo(0.5, 10); // per_item(0.5, 1) = 0.5
    expect(r.C).toBeCloseTo(0.5, 10);
    expect(r.pSlot).toBeCloseTo(0.5, 10);
    // Slope participates exactly once, via the shared per-item map (oracle parity).
    const { perItemPassProb } = await import("./readiness-model");
    const s = blockSplit([], 2, PRIOR, 0.6);
    expect(s.pSlot).toBeCloseTo(perItemPassProb(PRIOR, 0.6), 10);
    // Degenerate no-slot block: pSlot 0 by convention, prior-valued stats.
    expect(blockSplit([], 0, PRIOR, 1).pSlot).toBe(0);
  });

  it("(c) sparse block — clamped Jeffreys-Beta C near prior, does NOT certify", async () => {
    const { blockSplit } = await import("./readiness-seen-unseen");
    const r = blockSplit([0.95, 0.95], 9, PRIOR, 1);
    expect(r.C).toBeCloseTo(SPARSE_C, 8); // 0.5 < 0.7 ⇒ 9 unseen slots not credited at seen mean
    expect(r.seenMean).toBeCloseTo(SPARSE_SEENMEAN, 8);
    expect(r.pSlot).toBeCloseTo(SPARSE_PSLOT, 8);
  });

  it("mid coverage — C pinned at clamped prior, p_slot released toward seenMean", async () => {
    const { blockSplit } = await import("./readiness-seen-unseen");
    const r = blockSplit(Array(8).fill(0.95), 3, PRIOR, 1);
    expect(r.C).toBeCloseTo(MID_C, 8);
    expect(r.pSlot).toBeCloseTo(MID_PSLOT, 8);
  });

  it("full coverage — seen NEVER shrunk: p_slot === seenMean exactly", async () => {
    const { blockSplit } = await import("./readiness-seen-unseen");
    const r = blockSplit(Array(11).fill(0.95), 0, PRIOR, 1);
    expect(r.pSlot).toBeCloseTo(FULL_PSLOT, 8);
    expect(r.pSlot).toBeCloseTo(r.seenMean, 12);
  });

  it("(d) study-never-hurts (block) — adding an 11th seen @0.6 ≥ C does not lower p_slot", async () => {
    const { blockSplit } = await import("./readiness-seen-unseen");
    const before = blockSplit(Array(10).fill(0.95), 1, PRIOR, 1);
    const after = blockSplit([...Array(10).fill(0.95), 0.6], 0, PRIOR, 1);
    expect(before.pSlot).toBeCloseTo(D_BEFORE_PSLOT, 8);
    expect(after.pSlot).toBeCloseTo(D_AFTER_PSLOT, 8);
    expect(after.pSlot).toBeGreaterThanOrEqual(before.pSlot);
  });
});

// IMPL-INDEPENDENT self-consistency of the frozen literals themselves — so
// `npx vitest list` collects this file and it stays green BEFORE wave19d-05.
// Grades the frozen numbers' internal relationships, not the not-yet-written impl.
describe("frozen seen/unseen literals are self-consistent (no impl)", () => {
  it("sparse C is the clamped prior (< seenMean and < 0.7 ⇒ does not certify)", () => {
    expect(SPARSE_C).toBe(PRIOR);
    expect(SPARSE_C).toBeLessThan(SPARSE_SEENMEAN);
    expect(SPARSE_C).toBeLessThan(0.7);
    expect(SPARSE_C).toBeLessThan(SPARSE_C0); // clamp binds below the raw Jeffreys mean
  });

  it("sparse p_slot = (Σseen + nUnseen·C)/nPool = (1.9 + 9·0.5)/11", () => {
    expect((0.95 * 2 + 9 * SPARSE_C) / 11).toBeCloseTo(SPARSE_PSLOT, 10);
  });

  it("mid p_slot = (7.6 + 3·0.5)/11 and released above the sparse p_slot", () => {
    expect((0.95 * 8 + 3 * MID_C) / 11).toBeCloseTo(MID_PSLOT, 10);
    expect(MID_PSLOT).toBeGreaterThan(SPARSE_PSLOT);
  });

  it("full coverage p_slot equals the seen mean (0.95) — no shrinkage", () => {
    expect(FULL_PSLOT).toBeCloseTo(SPARSE_SEENMEAN, 12);
  });

  it("(d) study-never-hurts holds on the literals: after ≥ before", () => {
    expect(D_AFTER_PSLOT).toBeGreaterThanOrEqual(D_BEFORE_PSLOT);
  });
});
