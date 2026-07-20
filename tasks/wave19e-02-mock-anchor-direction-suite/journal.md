# Task: wave19e-02-mock-anchor-direction-suite

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-13
**Last compute:** mac-mini

## Goal
Un-suspend and rewrite the mock-anchor DIRECTION suite (§4) in
`lib/server/readiness-snapshot.integration.test.ts` against the wave19d release model, so it pins the
server property restored by wave19e-01. Both directions asserted STRICTLY, driving the REAL production
path (`recomputeReadiness`).

Numbered BOOLEAN acceptance criteria:

1. The `describe.skip("readiness recompute — mock-anchor direction (§4)", ...)` becomes a live
   `describe(...)` — NO `.skip` remains on it. (No `describe.skip`/`it.skip`/`.skip(` anywhere in the
   file; a graceful "content absent" guard, if any, uses an early `if (!seeded) return;`, not `.skip`.)
2. `npx vitest list lib/server/readiness-snapshot.integration.test.ts` LISTS the §4 test (proves it is
   collected and not skipped).
3. The reference "no-mock dial" is reconstructed from the persisted snapshot via the RELEASE model
   (NOT the retired pure `computeReadiness` anchor path). Reconstruct `release.final` and
   `release.independence` from the persisted `inputsJson` audit fields — build the exam p-vector from
   `inputsJson.blocks` (each block contributes `quota` copies of `meanProb` = the block `pSlot`) and
   use the persisted `inputsJson.sigma`, then:
   - `indepProb  = poissonBinomialAtLeast(THRESHOLD, pvec)` (`@/lib/readiness-factor-mixture` /
     wherever the PB DP is exported — the SAME fn `releaseDial` uses),
   - `mixtureProb = mixtureDial(pvec, THRESHOLD, sigma)` (`@/lib/readiness-factor-mixture`),
   - `noMockFinal = Math.min(mixtureProb, indepProb)`,
   with `THRESHOLD = DEFAULT_EXAM_QUESTION_COUNT − DEFAULT_EXAM_MAX_ERRORS`. This is the relative
   oracle: it reproduces the dial the release model would persist with `m=0`, WITHOUT re-implementing
   the split/mixture/DP (they are imported).
   NOTE: if the §4 fixture category has NO blueprint (throwaway `createOfficialQuestion` category ⇒
   `inputsJson.blocks == []`), the persisted blocks do NOT carry the whole-pool p-vector. In that case
   obtain the no-mock baseline by driving `recomputeReadiness` with ZERO mocks first (delete all
   `EXAM_SIMULATION` sessions, recompute, read the persisted `dialPercent`/`passProbability`), then
   seed mocks and recompute — the production path itself supplies the `m=0` reference. EITHER approach
   is acceptable; pick the one that matches whether the fixture is blueprint-backed. Document which in
   a comment.
4. Direction 1 — all-FAILED mocks (`k=0`, `m>0`): the recomputed persisted `dialPercent` is STRICTLY
   LESS than the no-mock dial (`expect(failed.dialPercent).toBeLessThan(noMockDial)`), and
   `dialPercent ≤ dialIndep` (from `inputsJson.dialIndep`) still holds.
5. Direction 2 — all-PASSED mocks (`k=m`, `m>0`): the recomputed persisted `dialPercent` is STRICTLY
   GREATER than the no-mock dial (`toBeGreaterThan`), and `dialPercent ≤ dialIndep` still holds.
6. Guard asserts the fixture actually exercises the anchor: `inputsJson.seenCount >=
   READINESS_MIN_SEEN` (sufficientData true), the no-mock dial is strictly inside (0,100) so both
   directions have room, and `inputsJson.anchored === true` and `inputsJson.mock.m` equals the seeded
   mock count.
7. `npm run test:integration` runs this file GREEN on the seeded DB (0 skipped tests in THIS file).
8. `npm run -s typecheck` exits 0.

## Constraints / decisions
- RELATIVE ORACLE / ANTI-SELF-GRADING: the reference dial comes from the release-model reconstruction
  (imported split/mixture/PB) or from a zero-mock production recompute — NEVER from the pure
  `computeReadiness` anchor (retired on the live path) and NEVER by reading the anchor's own output.
  The direction (`failed↓` / `passed↑`) is the pre-19d property proven by the anchor formula `(k +
  S·P)/(m + S)`: with `k=0,m>0` ⇒ `S·P/(m+S) < P`; with `k=m` ⇒ `(m + S·P)/(m+S) > P`.
- PRE-VERIFY before freezing: run the REAL `recomputeReadiness` on the fixture (no-mock, 3-failed,
  3-passed) under `npx tsx --conditions=react-server` and confirm the strict `<`/`>` margins survive
  integer rounding (the no-mock dial must sit far enough inside (0,100) — if it rounds to 0 or 100 the
  strict comparison can't fire; adjust the seeded stability/reps so it lands mid-range). Record the
  observed dials in the Log.
- Evaluator trigger (e) applies: the direction oracle binds on the stated populations. A failing
  direction after wave19e-01 = the anchor is mis-wired = BLOCK and surface (do NOT re-fixture to a
  population where the direction happens to hold, per the wave19b-09 masking lesson in
  lib/server/CLAUDE.md). No fixture-dodging.
- The `pureModelDial(...)` helper (which calls the retired `computeReadiness` anchor) must be REMOVED
  or replaced by the release-model reconstruction — leaving it dead-imported trips typecheck/lint and
  misleads the evaluator.
- Reuse the existing §4 fixture conventions (direct `reviewState.create`, injected `now`, mock seeding
  via `EXAM_SIMULATION`/`COMPLETED` rows, user delete cascades ReviewState+ReadinessSnapshot).
- Non-Goal: touching §2/§3 of the same file, changing the pure model, or altering wave19e-01's server
  wiring. This task only rewrites the §4 block.

## Next
- [x] Un-skip §4 and rewrite against the wave19e-01 restored mock anchor using the zero-mock
      production-recompute baseline. DONE — all criteria met.

## Log
- (planner) Scaffolded. §4 currently `describe.skip` at line 113; retired reference `pureModelDial`
  (lines 138-159) calls the pure-model anchor — replace with release-model reconstruction or a
  zero-mock production baseline. Depends on wave19e-01 landing the live anchor.
- 2026-07-13 · ClPcs-Mac-mini · wave19e-01 landed (done). Pre-verified whole-pool magnitudes by
  calling the REAL pure `releaseDial` (npx tsx --conditions=react-server) with the exact inputs
  `recomputeReadiness` builds for the no-blueprint fixture (20 quota, 22 seen @ R=0.9, nUnseen 0,
  reviewMass 1): release.final=0.594 / independence=0.677 → no-mock dial=59 (indep 68), 3-FAILED
  dial=34 (indep 39), 3-PASSED dial=77 (indep 82) — strictly inside (0,100), strict `<`/`>` survive
  rounding, `dialPercent ≤ dialIndep` all three. Chose the ZERO-MOCK production-recompute baseline
  (fixture category has NO blueprint ⇒ `inputsJson.blocks == []` ⇒ can't reconstruct release.final
  from blocks; the anchor's m=0 identity supplies the honest reference). Rewrote §4: removed the
  now-unused `computeReadiness` import + `pureModelDial` helper, flipped `describe.skip`→`describe`,
  added a `recomputeWith(mockCount,result)` helper, asserted both directions strictly + the guards
  (seenCount≥MIN, no-mock dial in (0,100), `anchored===true`, `mock.m===seeded`, `dialPercent ≤
  dialIndep`). Verified: no `.skip` remains; typecheck 0; `npx vitest list --config
  vitest.integration.config.ts <file>` lists §4; the file runs GREEN (3 passed, 0 skipped).
  Artifacts: lib/server/readiness-snapshot.integration.test.ts.

## Verify
**Last verify:** PASS (2026-07-13T15:47:20Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T15:50:52Z)
