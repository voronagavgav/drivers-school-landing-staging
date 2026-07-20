import { describe, it, expect } from "vitest";

import { allocate, dialFor, scoreCandidate } from "./exam-allocator";

// FROZEN ORACLE for the greedy exam-date review ALLOCATOR (Wave 23 spike,
// spec `specs/wave23-exam-allocator-spike.md`, Deliverable 1 (a)–(f)) — the
// future pure module `./exam-allocator` (wave23-04) MUST MATCH these values by
// importing the REAL `releaseDial`; the implementation is NOT written here, and
// the impl task may NOT edit these literals or tolerances.
//
// Every literal is EXTERNAL: transcribed verbatim from the python reference
// oracle's captured stdout
//   `tasks/wave23-01-python-oracle/PREVERIFY-OUTPUT.txt`
// (`scripts/oracles/gen-wave23-oracles.py`, stdlib+numpy, run 2026-07-14 — a
// SECOND, independent re-encoding of the wave19d dial math). DO NOT regenerate
// these literals from the TS implementation, and never derive an expected value
// by calling `./exam-allocator`. Frozen from the python oracle; regenerate only
// from the python, never from TS.
//
// THE MODEL (spec Deliverable 1): the objective is the REAL dial
//   P_pass = releaseDial(input).final                    (= min(mixture, indep))
// over the official 4-strata blueprint (pdr 10 / safety 4 / build 4 / medical 2,
// THRESHOLD 18, UNSEEN_PRIOR 0.5). The allocator scores reviewing candidate i by
// the EXPECTED dial delta of a review TODAY, GIVEN before/after retrievabilities:
//   ΔP_i = p_i·(P_pass(after correct) − P_pass(before))
//        + (1−p_i)·(P_pass(after wrong) − P_pass(before)),   p_i = R_i
// `allocate` ranks candidates by descending ΔP (ties by id ascending) and takes
// the top-B; B=0 ⇒ []; B ≥ count ⇒ all.
//
// This impl-binding suite was suspended while the impl did not yet exist,
// reaching the future module via a dynamic import whose missing-module type
// error was silenced by an inline type-suppression directive. wave23-04
// activated the suite, converted the dynamic import to a static top-of-file
// import, and stripped the now-unused directives.

// ---- frozen design constants (PREVERIFY header) -----------------------------
const THRESHOLD = 18; // DEFAULT_EXAM_QUESTION_COUNT − DEFAULT_EXAM_MAX_ERRORS
const REVIEW_MASS = 8.0;
const SLOPE = 1.0;
const BG = 0.95; // fixed background retrievability

// ---- (a) frozen ΔP_i values (6dp) + the baseline dial -----------------------
const DIAL_BEFORE = 0.624559;
const DP: Record<string, number> = {
  i1: 0.018348,
  i2: 0.013055,
  i3: 0.007272,
  i4: 0.018686,
  i5: 0.012259,
  i6: 0.005315,
};

// ---- (b) allocator ranking (descending ΔP; ties by id ascending) ------------
const RANK = ["i4", "i1", "i2", "i5", "i3", "i6"];
const RANK_STR = "i4,i1,i2,i5,i3,i6";

// ---- (c) expected-outcome blend arithmetic (chosen item i1) -----------------
const BLEND_I1 = { dCorrect: 0.064417, dWrong: -0.050755, p: 0.6, dP: 0.018348 };

// ---- (d) budget boundaries --------------------------------------------------
const BUDGET_ZERO_SELECTED: string[] = []; // B=0 ⇒ nothing
const BUDGET_SATURATE_SELECTED = ["i1", "i2", "i3", "i4", "i5", "i6"]; // B ≥ count ⇒ all (sorted)

// ---- (e) baseline-policy ranking (queue.ts scoreCandidate, re-encoded) ------
const BASELINE_SCORE: Record<string, number> = {
  i1: 0.976667,
  i2: 1.008333,
  i3: 0.317143,
  i4: 1.0325,
  i5: 1.010909,
  i6: 0.166153,
};
const BASELINE_RANK = ["i4", "i5", "i2", "i1", "i3", "i6"];

// ---- (f) monotone sanity ----------------------------------------------------
const MONO = { correctItem: "i1", correctDelta: 0.064417, weak: "i1", strong: "i6" };

// ---- the 6-item / 2-block fixture (spec Deliverable 1, PREVERIFY §fixture) ---
// The full 20-slot exam state, blocks in order [pdr, build, safety, medical];
// the candidate items live in `build` (i1..i3) and `safety` (i4..i6) as SEEN
// items, each block padded with one fixed background item @0.95; pdr/medical are
// fixed background. `blockIndex`/`seenIndex` locate each candidate's `before`
// slot so the allocator can swap it to afterCorrect / afterWrong and recompute.
const EXAM_BLOCKS = [
  { quota: 10, seenR: Array<number>(10).fill(BG), nUnseen: 0 }, // pdr
  { quota: 4, seenR: [0.6, 0.75, 0.88, BG], nUnseen: 0 }, // build (i1,i2,i3,bg)
  { quota: 4, seenR: [0.65, 0.8, 0.94, BG], nUnseen: 0 }, // safety (i4,i5,i6,bg)
  { quota: 2, seenR: [BG, BG], nUnseen: 0 }, // medical
];
const ALLOC_INPUT = { blocks: EXAM_BLOCKS, reviewMass: REVIEW_MASS, slope: SLOPE };
const CANDIDATES = [
  { id: "i1", blockIndex: 1, seenIndex: 0, afterCorrect: 0.85, afterWrong: 0.4, pCorrect: 0.6 },
  { id: "i2", blockIndex: 1, seenIndex: 1, afterCorrect: 0.9, afterWrong: 0.5, pCorrect: 0.75 },
  { id: "i3", blockIndex: 1, seenIndex: 2, afterCorrect: 0.95, afterWrong: 0.6, pCorrect: 0.88 },
  { id: "i4", blockIndex: 2, seenIndex: 0, afterCorrect: 0.88, afterWrong: 0.42, pCorrect: 0.65 },
  { id: "i5", blockIndex: 2, seenIndex: 1, afterCorrect: 0.92, afterWrong: 0.55, pCorrect: 0.8 },
  { id: "i6", blockIndex: 2, seenIndex: 2, afterCorrect: 0.98, afterWrong: 0.65, pCorrect: 0.94 },
];

describe("exam-allocator vs frozen python oracle (un-skipped in wave23-04)", () => {
  it("(a) dialBefore + scoreCandidate reproduce ΔP_i (6dp) for every fixture item", () => {
    expect(dialFor(ALLOC_INPUT).final).toBeCloseTo(DIAL_BEFORE, 6);
    for (const c of CANDIDATES) {
      expect(scoreCandidate(ALLOC_INPUT, c)).toBeCloseTo(DP[c.id], 6);
    }
  });

  it("(b) allocate ranks candidates descending ΔP, ties by id ascending", () => {
    expect(allocate(ALLOC_INPUT, CANDIDATES, CANDIDATES.length)).toEqual(RANK);
  });

  it("(c) expected-outcome blend for i1 equals p·dCorrect + (1−p)·dWrong", () => {
    expect(scoreCandidate(ALLOC_INPUT, CANDIDATES[0])).toBeCloseTo(BLEND_I1.dP, 6);
  });

  it("(d) budget boundaries: B=0 ⇒ [] ; B ≥ count ⇒ all six (sorted)", () => {
    expect(allocate(ALLOC_INPUT, CANDIDATES, 0)).toEqual(BUDGET_ZERO_SELECTED);
    expect([...allocate(ALLOC_INPUT, CANDIDATES, 99)].sort()).toEqual(BUDGET_SATURATE_SELECTED);
  });

  it("(f) monotone sanity: correct-path delta ≥ 0 and weak i1 ΔP > strong i6 ΔP", () => {
    const weak = scoreCandidate(ALLOC_INPUT, CANDIDATES[0]);
    const strong = scoreCandidate(ALLOC_INPUT, CANDIDATES[5]);
    expect(weak).toBeGreaterThan(strong);
  });
});

// IMPL-INDEPENDENT self-consistency of the FROZEN literals themselves — so
// `npx vitest list` COLLECTS this file and it stays green BEFORE wave23-04.
// These grade the frozen vectors (not the not-yet-written impl), so no
// self-grading: none of them import `./exam-allocator`.
describe("frozen allocator oracle literals are self-consistent (no impl)", () => {
  it("(c) blend identity: ΔP_i1 = p·dCorrect + (1−p)·dWrong holds to 6dp", () => {
    const blended = BLEND_I1.p * BLEND_I1.dCorrect + (1 - BLEND_I1.p) * BLEND_I1.dWrong;
    expect(blended).toBeCloseTo(BLEND_I1.dP, 6);
    expect(BLEND_I1.dP).toBe(DP.i1);
  });

  it("(b) the frozen ranking is exactly the ids sorted by descending ΔP, ties by id", () => {
    const ids = Object.keys(DP);
    const sorted = [...ids].sort((a, b) => DP[b] - DP[a] || a.localeCompare(b));
    expect(RANK).toEqual(sorted);
    expect(RANK.join(",")).toBe(RANK_STR);
    // it is a permutation of the six item ids
    expect([...RANK].sort()).toEqual([...ids].sort());
  });

  it("(e) the baseline ranking is a permutation that DIFFERS from the allocator ranking", () => {
    const ids = Object.keys(BASELINE_SCORE);
    const sorted = [...ids].sort((a, b) => BASELINE_SCORE[b] - BASELINE_SCORE[a] || a.localeCompare(b));
    expect(BASELINE_RANK).toEqual(sorted);
    expect([...BASELINE_RANK].sort()).toEqual([...ids].sort());
    expect(BASELINE_RANK).not.toEqual(RANK); // policies_differ = true
  });

  it("(d) budget boundaries: empty at B=0, all six (sorted) at saturation", () => {
    expect(BUDGET_ZERO_SELECTED).toEqual([]);
    expect(BUDGET_SATURATE_SELECTED).toEqual([...Object.keys(DP)].sort());
  });

  it("(f) monotone sanity: correct-path delta ≥ 0 and weak i1 ΔP > strong i6 ΔP", () => {
    expect(MONO.correctDelta).toBeGreaterThanOrEqual(0);
    expect(DP[MONO.weak]).toBeGreaterThan(DP[MONO.strong]);
  });

  it("(a) dial_before is a probability in (0,1) and THRESHOLD is 18", () => {
    expect(DIAL_BEFORE).toBeGreaterThan(0);
    expect(DIAL_BEFORE).toBeLessThan(1);
    expect(THRESHOLD).toBe(18);
  });
});
