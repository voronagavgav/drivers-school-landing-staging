# Task: wave19d-05-seen-unseen-split

**Status:** done
**Driver:** auto
**Evaluate:** yes

IMPLEMENTATION (PURE lib) of Deliverable 2 — the per-block seen/unseen split (Lahiri–Mukherjee form) that
kills R2. New pure module `lib/readiness-seen-unseen.ts` computing, per stratum block:

  `p_slot = (Σ_seen perItemPassProb(R_i, slope) + n_unseen · C) / n_pool`

where `C` = the unseen-slot extrapolation = posterior-predictive mean of a **Jeffreys-updated Beta** over
the block's seen evidence, CLAMPED `C ≤ min(seenMean, READINESS_UNSEEN_PRIOR · slopeAdj)` (the existing
global honesty clamp, now applied PER BLOCK). Seen items are NEVER shrunk (release comes free);
`C → seenMean-clamped-prior` as coverage grows; `C` stays near the clamped prior at n_seen=2 (property c).
The frozen literals come from task 02's `lib/readiness-seen-unseen.oracle.test.ts` + `scripts/oracles/
gen-19d-oracles.py` — this task un-skips that oracle and MATCHES it; it may NOT edit the oracle literals.

## Goal
PASS = ALL true:

1. `lib/readiness-seen-unseen.ts` exists and exports a pure function computing, for a block given its seen
   per-item pass probabilities, `n_unseen`, `n_pool` (= seen + unseen slots), the honesty prior, and slope
   (or a slope-adjusted prior): the clamped Jeffreys-Beta posterior-predictive mean `C` AND the resulting
   `p_slot`. Signature/shape follows what task 07's compose + task 08's recompute consume (a `{ pSlot, C }`
   per block, or equivalent), documented in the module header.
2. `C` is the posterior-predictive mean of a Jeffreys Beta (prior Beta(½,½)) updated by the block's seen
   evidence, then clamped `C ≤ min(seenMean, priorAdj)`. Frozen oracle match (task 02 file, ≥8dp): the
   sparse case (n_seen=2 at p̂=0.95, 11-slot block) yields the frozen `C` (< 0.7 — does NOT certify) and
   the frozen `p_slot`; a mid/high-coverage case yields `C` released toward the seen mean (the frozen
   value). `toBeCloseTo(_, 8)` or tighter against the oracle literals.
3. SEEN-NEVER-SHRUNK: with `n_unseen = 0` (full coverage) `p_slot === seenMean` exactly (the seen sum over
   the seen count), i.e. the split adds NO shrinkage to seen items — pin as an exact-equality oracle.
4. STUDY-NEVER-HURTS building block (property d, block level): moving one slot from unseen (credited at the
   clamped `C`) to seen at retrievability `R ≥ C` does not LOWER `p_slot` — pin the R2 counterexample's
   block-level numbers from the oracle (10 seen @0.95, C is the clamped prior; adding an 11th seen @0.6
   with 0.6 ≥ C keeps `p_slot` non-decreasing vs the same block with that slot unseen).
5. The oracle file `lib/readiness-seen-unseen.oracle.test.ts` is UN-SKIPPED for this module's suite (remove
   the `describe.skip`/`it.skip` + the `// @ts-expect-error` on the dynamic import) and passes; the file's
   pre-existing NON-skipped self-consistency test still passes. `npx vitest list` lists the file with a
   NON-skipped test (i.e. no stale whole-suite skip).
6. PURITY: `lib/readiness-seen-unseen.ts` has no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`/
   `Math.random`/`Date.now`/`new Date` (grep the whole file — keep those tokens out of comments too).
   `npm run -s typecheck` exits 0; `npm run -s test` exits 0.

## Constraints / decisions
- ORACLE IS FROZEN (task 02): do not edit the literals or tolerances in `readiness-seen-unseen.oracle.
  test.ts` or recompute them from this implementation. Match the numbers; if the impl can't match, the
  IMPL is wrong (or the oracle premise is — surface it, don't re-fixture).
- PURE math only (injected slope/prior; no clock/rng). This module computes ONE block's split; the
  cross-block assembly + factor mixture + min-clamp live in tasks 06/07.
- `perItemPassProb` reuse: import the existing `perItemPassProb` from `@/lib/readiness-model` (pure) rather
  than re-deriving the slope scaling, so slope semantics stay single-sourced.
- Non-goals: the factor mixture (06), the compose/min-clamp/release entrypoint (07), live wiring (08).

## Next
- [x] Read `readiness-seen-unseen.oracle.test.ts` frozen literals; implement the clamped Jeffreys-Beta C +
      p_slot; un-skip the oracle; typecheck + `npm test`.
- Goal fully met. `lib/readiness-seen-unseen.ts` (pure `blockSplit`) matches all 4 frozen impl cases +
  self-consistency; typecheck 0, `npm test` 715 pass / 9 skipped (other waves), purity clean.

## Artifacts
- lib/readiness-seen-unseen.ts — per-block seen/unseen split (C + p_slot), pure
- lib/readiness-seen-unseen.oracle.test.ts — un-skipped (frozen literals owned by task 02)

## Log
- 2026-07-13 laptop: planned. Depends on task 02's frozen oracle.
- 2026-07-13T16:35Z ClPcs-Mac-mini: implemented pure `lib/readiness-seen-unseen.ts` exporting
  `blockSplit(seenR, nUnseen, prior, slope) → { seenMean, C, pSlot }` — Jeffreys Beta(½,½) post-pred
  mean `C0=(0.5+Σ)/(1+nSeen)` clamped per-block by `min(C0, seenMean, prior·slope)`, `pSlot=(Σ+nUnseen·C)/nPool`;
  reuses `perItemPassProb` from readiness-model for slope semantics (also for priorAdj). Un-skipped the
  oracle (`describe.skip`→`describe`, dropped 4 `// @ts-expect-error`). Verified: typecheck 0; oracle suite
  9/9 pass (4 impl cases match frozen literals ≥8dp, incl. seen-never-shrunk exact + study-never-hurts);
  full `npm test` 715 pass; `vitest list` collects the file non-skipped; purity grep clean. Status→done.

## Verify
**Last verify:** PASS (2026-07-13T13:35:43Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T13:37:47Z)
