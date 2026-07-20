// ---------------------------------------------------------------------------
// Pure greedy exam-date review ALLOCATOR (Wave 23 spike,
// spec `specs/wave23-exam-allocator-spike.md`, Deliverable 1).
// No database, no clock read, no randomness, no server-runtime marker — a
// deterministic scoring + selection layer on top of the REAL readiness dial.
//
// The objective is the honest dial itself:
//   P_pass = releaseDial(input).final          (= min(mixture, independence))
// over the official 4-strata blueprint (pdr 10 / safety 4 / build 4 / medical 2,
// THRESHOLD 18, UNSEEN_PRIOR 0.5). This module does NOT reimplement the
// Poisson-binomial DP, the seen/unseen split, or the Gauss–Hermite mixture — it
// IMPORTS `releaseDial` and recomputes the dial exactly for each candidate's
// before / after-correct / after-wrong states.
//
// Allocator score for reviewing candidate item i TODAY (spec Deliverable 1):
//   ΔP_i = p_i·(P_pass(after correct) − P_pass(before))
//        + (1 − p_i)·(P_pass(after wrong) − P_pass(before))
// `allocate` ranks candidates by descending ΔP (ties by id ascending) and takes
// the top-B; B ≤ 0 ⇒ []; B ≥ count ⇒ all. Exact recomputation per candidate (no
// per-block factorization — see the spec NON-GOAL); affordable, the dial is fast.
// ---------------------------------------------------------------------------

import { releaseDial, type ReleaseInput, type ReleaseResult } from "@/lib/readiness-release";

/** A reviewable item located inside the exam state by (block, seen) index. */
export interface AllocatorCandidate {
  /** Stable item id (ranking tie-break is by this ascending). */
  id: string;
  /** Index of the block in `input.blocks` the item's seen slot lives in. */
  blockIndex: number;
  /** Index of the item's retrievability within that block's `seenR`. */
  seenIndex: number;
  /** The item's retrievability AFTER a correct review today. */
  afterCorrect: number;
  /** The item's retrievability AFTER a wrong review today. */
  afterWrong: number;
  /** Probability of a correct review today (p_i = R_i, the before retrievability). */
  pCorrect: number;
}

/** Thin alias for the objective dial so tests can read `dialFor(input).final`. */
export function dialFor(input: ReleaseInput): ReleaseResult {
  return releaseDial(input);
}

/** Return a copy of `input` with one seen slot's retrievability swapped to `r`. */
function withItem(input: ReleaseInput, blockIndex: number, seenIndex: number, r: number): ReleaseInput {
  const blocks = input.blocks.map((b, bi) => {
    if (bi !== blockIndex) return b;
    const seenR = b.seenR.slice();
    seenR[seenIndex] = r;
    return { ...b, seenR };
  });
  return { ...input, blocks };
}

/**
 * `scoreCandidate(input, candidate)` — the expected dial delta ΔP of reviewing
 * `candidate` today, blending the correct- and wrong-outcome dials by `pCorrect`.
 */
export function scoreCandidate(input: ReleaseInput, candidate: AllocatorCandidate): number {
  const before = dialFor(input).final;
  const afterCorrect = dialFor(withItem(input, candidate.blockIndex, candidate.seenIndex, candidate.afterCorrect)).final;
  const afterWrong = dialFor(withItem(input, candidate.blockIndex, candidate.seenIndex, candidate.afterWrong)).final;
  const p = candidate.pCorrect;
  return p * (afterCorrect - before) + (1 - p) * (afterWrong - before);
}

/**
 * `allocate(input, candidates, budgetB)` — ids of the top-B candidates by
 * descending ΔP (ties by id ascending). B ≤ 0 ⇒ []; B ≥ count ⇒ all.
 */
export function allocate(input: ReleaseInput, candidates: AllocatorCandidate[], budgetB: number): string[] {
  if (budgetB <= 0) return [];
  const scored = candidates.map((c) => ({ id: c.id, dP: scoreCandidate(input, c) }));
  scored.sort((a, b) => b.dP - a.dP || a.id.localeCompare(b.id));
  return scored.slice(0, budgetB).map((s) => s.id);
}
