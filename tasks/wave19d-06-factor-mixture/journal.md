# Task: wave19d-06-factor-mixture

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8

IMPLEMENTATION (PURE lib) of Deliverable 3's core — the ICC as an evidence-decaying one-factor mixture.
New pure module `lib/readiness-factor-mixture.ts`:
- one latent logit-normal factor per student, variance `σ² = σ₀²·w(evidence)`, with `w` decaying in total
  per-item review mass at the research's m^(−1/2) credible-gap rate — the EXACT decay form + `σ₀` + node
  count are PINNED by task 02's oracle (`scripts/oracles/gen-19d-oracles.py` + `lib/readiness-factor-
  mixture.oracle.test.ts`); this task reads them, does not invent them;
- conditional on each of ~`nNodes` **Gauss–Hermite** nodes (standard-normal factor), per-slot probs shift
  on the LOGIT scale by the node value; the EXISTING exact Poisson-binomial recursion
  (`poissonBinomialAtLeast`, lib/readiness-model.ts) runs UNCHANGED per node; `mixtureDial` = the
  node-weight-normalised average of the per-node pass probabilities.

This task un-skips `lib/readiness-factor-mixture.oracle.test.ts` and MATCHES its frozen literals ≥8dp; it
does NOT compute the outer `min(mixtureDial, independenceDial)` guarantee (that's task 07's compose step).

## Goal
PASS = ALL true:

1. `lib/readiness-factor-mixture.ts` exists and exports pure functions for: (a) the Gauss–Hermite
   nodes+weights for `nNodes` (matching `numpy.polynomial.hermite_e.hermegauss` for the standard-normal
   weight — the oracle's frozen node/weight arrays, ≥8dp); (b) `σ(evidence) = σ₀·sqrt(w(evidence))` via the
   pinned decay form; (c) `mixtureDial(pSlots, quotas, threshold, sigma)` = node-weighted average of the
   per-node exact PB pass probabilities, where at node `z` each slot's logit is shifted by `sigma·z` (or
   the pinned parameterisation) before `poissonBinomialAtLeast`.
2. FROZEN ORACLE MATCH (task 02 file, `toBeCloseTo(_,8)` or tighter): the frozen `nNodes`, the node values
   + weights, at least one per-node conditional pass probability, and the node-weighted `mixtureDial` for
   the oracle's fixed `(pSlots, quotas, threshold, σ)` fixture. Also the pinned `σ₀` and the ρ→σ₀ mapping
   (ρ=0.35 → the frozen σ₀).
3. RELEASE DIRECTION (property b, mixture level): as `σ → 0` (rich evidence ⇒ `w → 0`) `mixtureDial →
   independence` — pin: at the oracle's frozen small-σ (rich) value `mixtureDial` is within the frozen
   tolerance of the plain PB over the same p-vector; at a larger σ (thin evidence) `mixtureDial` is
   strictly LOWER for an above-threshold-mean fixture. Both frozen from the oracle.
4. WEIGHTS NORMALISE: the returned Gauss–Hermite weights (as used) sum to 1 (probabilist normalisation),
   pinned as an exact/near-exact oracle (`toBeCloseTo(1, 10)`), so `mixtureDial` is a proper average.
5. `lib/readiness-factor-mixture.oracle.test.ts` is UN-SKIPPED for this module's suite (remove
   `describe.skip`/`it.skip` + the `// @ts-expect-error` dynamic import) and passes; its pre-existing
   NON-skipped self-consistency test still passes; `npx vitest list` lists the file with a non-skipped
   test.
6. PURITY: `lib/readiness-factor-mixture.ts` has no `server-only`/`@/lib/db`/`@prisma/client`/
   `lib/generated`/`Math.random`/`Date.now`/`new Date` (grep whole file incl. comments). Reuses the
   EXISTING `poissonBinomialAtLeast` — does NOT reimplement the PB recursion. `npm run -s typecheck` exits
   0; `npm run -s test` exits 0.

## Constraints / decisions
- HARDEST MATH TASK (Model: fable). The Gauss–Hermite node/weight computation and the logit-shift
  parameterisation must reproduce the numpy reference to ≥8dp — verify against the oracle's frozen arrays,
  not a re-derivation. If TS can't reproduce numpy's `hermegauss` to 8dp via a Golub–Welsch/analytic
  route, embed the frozen nodes/weights as a `const` table sourced from the oracle (a fixed nNodes table
  is legitimate — the oracle is the external source), and pin that the table matches the oracle.
- ORACLE IS FROZEN (task 02): match the literals; never regenerate them from this impl.
- REUSE the existing exact PB DP (`poissonBinomialAtLeast`) verbatim per node — the research is explicit
  that ICC lives OUTSIDE the PB recursion (input-side mixture), never inside it.
- This module returns `mixtureDial` only. The `min(mixtureDial, independenceDial)` outer clamp + the
  seen/unseen assembly are task 07. Keep the boundary clean.
- Non-goals: seen/unseen split (05), compose/min-clamp (07), live wiring (08).

## Next
- [x] Read the frozen node/weight + mixtureDial literals from the oracle; implement GH nodes + logit-shift
      mixture over the existing PB DP; un-skip the oracle; typecheck + `npm test`.
- Goal fully met. `lib/readiness-factor-mixture.ts` exports `gaussHermite`/`SIGMA0`/`sigmaFromEvidence`/
  `mixtureDial` (+ `N_NODES`/`RHO`/`EVIDENCE_M0`), reuses `poissonBinomialAtLeast` verbatim, is pure.
  Oracle un-skipped, 8/8 pass ≥8dp (nodes 8dp, normWeights 12dp, σ₀/σ 8dp, mixtureDial 8dp). Boundary
  clean: no min-clamp / seen-unseen here (07/05). Downstream: task 07 composes min(mixtureDial, indep).

## Artifacts
- lib/readiness-factor-mixture.ts — GH one-factor mixture over the existing PB DP, pure
- lib/readiness-factor-mixture.oracle.test.ts — un-skipped (frozen literals owned by task 02)

## Log
- 2026-07-13 laptop: planned. Depends on task 02 (nodes/σ₀/decay/nNodes pinned there). numpy hermegauss is
  the node/weight reference.
- 2026-07-13T16:41Z ClPcs-Mac-mini: implemented `lib/readiness-factor-mixture.ts` — pure one-factor GH
  ICC mixture. `gaussHermite(20)` returns the frozen HermiteE node/weight table (external numpy constant,
  fixed 20-node quadrature rule; `normWeights=weights/√(2π)`), `SIGMA0=√(ρ/(1−ρ)·π²/3)` computed from
  ρ=0.35, `sigmaFromEvidence(M)=σ₀·√(M0/(M0+M))`, `mixtureDial(pSlots,threshold,sigma)` shifts each slot
  logit by σ·zᵢ (`sigmoid(logit(p)+σ·zᵢ)`, EPS-clamped logit mirroring the oracle) and node-weight-averages
  the EXISTING `poissonBinomialAtLeast` per node — PB reused verbatim, ICC stays outside the recursion.
  Un-skipped the oracle (removed `describe.skip` + `// @ts-expect-error` dynamic-import guards). Verify:
  oracle 8/8 pass; `npm run -s typecheck` exit 0; `npm run -s test` 718 passed/6 skipped; purity grep
  clean; `npx vitest list` collects the file with un-skipped tests. Status→done.

## Verify
**Last verify:** PASS (2026-07-13T13:41:56Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T13:48:17Z)
