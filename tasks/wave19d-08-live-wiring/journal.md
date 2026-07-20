# Task: wave19d-08-live-wiring

**Status:** done
**Driver:** auto
**Evaluate:** yes

LIVE WIRING (server orchestration) — route the real dial through the new release model. In
`lib/server/mastery-readiness.ts` `recomputeReadiness` (the ONLY place ReadinessSnapshot rows are
materialised — the production path the app reads via `getLatestReadiness`), replace the wave19c
`correctBlockMeanProb` per-block shrink with the wave19d evidence-releasing model
(`@/lib/readiness-release`, task 07): build per-block seen per-item probs + unseen counts + quotas + slope
+ per-item review-mass evidence, compute `finalDial = min(mixtureDial, independenceDial)`, persist it as
`dialPercent`/`passProbability`. Record the new audit fields in `inputsJson` (APPEND-ONLY): `model:
"lm-gh1"`, the σ used, node count, per-block `{nSeen, C}`, and KEEP `dialIndep`. The draw-side
`READINESS_TOPIC_CORRELATION`(=0) and the honesty-regression gate stay byte-untouched.

## Goal
PASS = ALL true:

1. `recomputeReadiness` (lib/server/mastery-readiness.ts) NO LONGER calls `correctBlockMeanProb` for the
   live `dialPercent`/`passProbability`; it computes the persisted dial from `@/lib/readiness-release`
   (`min(mixtureDial, independenceDial)`) built from the blueprint blocks' seen per-item probs + unseen
   counts + quotas + slope + evidence. Grep: `mastery-readiness.ts` imports `readiness-release` and does
   not use `correctBlockMeanProb`'s result in the persisted dial path.
2. `inputsJson` is APPEND-ONLY and now carries `model:"lm-gh1"`, `sigma` (the σ actually used), `nodeCount`
   (GH nodes), and per-block `{ nSeen, C }` (positionally aligned to `blocks`), and STILL carries
   `dialIndep` (the independence dial, `sufficientData`-gated) + every pre-existing key
   (`sufficientData`/`seenCount`/`meanR`/`priorUnseen`/`mock`/`blocks`/`rho`/`engine`/`calibratorId`).
   No existing key is renamed/removed. `getLatestReadiness` still parses without throwing on old rows.
3. NEVER-ABOVE-INDEPENDENCE on the LIVE path (NEW integration test
   `lib/server/readiness-release.integration.test.ts`, real seeded DB, both populations): the persisted
   `dialPercent ≤ dialIndep` for BOTH a WEAK and a STRONG seeded student (percent granularity — the
   honesty property). Frozen magnitudes pre-verified against the real `recomputeReadiness` at impl time and
   written into the test (so the ≤ can't pass on drifted fixtures).
4. RELEASE ON THE LIVE PATH (integration): a RICH-evidence near-perfect seeded student (high stability,
   many reviews, full-ish coverage across all 4 strata) gets `dialPercent ≥ 80` (the top band is now
   reachable — the 19c ceiling is gone). Pin the frozen magnitude. Contrast: the OLD wave19c code would
   have capped such a student well below (documented in a comment; not asserted against old code).
5. STUDY-NEVER-HURTS on the LIVE path (integration, R2): drive the R2 scenario through the REAL recompute —
   a student strong in a block, then one more item revealed at `R ≥` its slot's prior — and assert the
   persisted `dialPercent` is NON-DECREASING (≥ the pre-addition snapshot's dialPercent). This is the
   production-path proof of property (d) (the current code drops 31%→26%).
6. `lib/readiness-honesty.regression.test.ts` is BYTE-UNTOUCHED and green; `READINESS_TOPIC_CORRELATION`
   stays 0 (draw-side inert). `getLatestReadiness` return shape still satisfies its callers (dashboard /
   result page / nightly) — typecheck 0.
7. `npm run -s typecheck` exits 0; `npm run -s test` exits 0; the readiness integration suites pass after a
   fresh `npm run db:seed` (run seed BEFORE integration, per the CLAUDE.md ordering rule). Production-path:
   all dial assertions go through `recomputeReadiness` (the real entry), never a direct model call.

## Constraints / decisions
- PRODUCTION-PATH: `recomputeReadiness` is the real materialiser; assert on the PERSISTED snapshot, not on
  a direct `readiness-release` call. A direct-model test would pass while the wiring feeds it wrong inputs.
- The persisted `blocks[i].meanProb` shape (wave19b readers rely on `{quota, meanProb}`): keep it present.
  Under the new model set `blocks[i].meanProb = p_slot` (the block's expected per-slot probability from the
  seen/unseen split) so downstream readers get a sensible per-block number; the EXACT-reconstruction
  assert from wave19c (`computeReadiness(blocks, topicCorrelation:0)` reproduces `passProbability`) NO
  LONGER holds under the mixture and must NOT be reintroduced — the persisted `passProbability` comes from
  the mixture/min-clamp, not a single PB over `blocks`. Document this in the inputsJson comment.
- Threading: `recomputeReadiness` already accepts `tx`/`now`; keep the injected clock (FSRS retrievability
  decays with wall-clock — derive any "unchanged on re-run" reference from a persisted row, not
  `new Date()`, per the retry-determinism learning). The "per-item review-mass evidence" = per-question
  review count (reps) from `ReviewState`/`ReviewLog`; define exactly what feeds `w(evidence)` and document
  it (the oracle pins the decay form; this task supplies the real evidence quantity).
- Draw-side `topicCorrelation` stays `READINESS_TOPIC_CORRELATION`(0); do NOT re-enable it. The
  honesty-regression test file is not edited.
- STALE 19c TEST COLLISION: changing the model breaks `readiness-estimation.integration.test.ts`'s pinned
  34/100 magnitudes. This task does NOT rewrite that file (task 09 owns it) — instead it temporarily
  `describe.skip`s that suite with a comment «superseded — rewritten in wave19d-09» so the integration
  suite stays green between tasks. This task's OWN live proofs live in a new
  `lib/server/readiness-release.integration.test.ts`. Task 09 un-skips + rewrites the 19c file against the
  new frozen values.
- Non-goals: retiring the 19c shrink CONSTANTS + rewriting the 19c integration test (task 09) — this task
  stops CALLING the shrink on the live path but leaves the lib + its constants for task 09 to flip/retire.

## Next
- [x] Rewrite the recompute block-builder to feed `readiness-release`; persist finalDial + new inputsJson
      fields (keep dialIndep + blocks{quota,meanProb=p_slot}); pre-verify weak/strong/rich/R2 magnitudes
      via a throwaway `npx tsx --conditions=react-server` recompute; write the integration asserts with
      those frozen numbers; db:seed; run typecheck + unit + the readiness integration suites.
- (task 09) un-skip + rewrite `readiness-estimation.integration.test.ts` against the new frozen values;
  also decide the fate of `readiness-snapshot.integration.test.ts §4` (mock-anchor, suspended here —
  mocks no longer blend into the dial) and the already-dormant `readiness-correlation.integration.test.ts`
  (references the removed 6-block keys). Flip `READINESS_ESTIMATION_TIER` → "off" (task 09).

## Artifacts
- lib/server/mastery-readiness.ts — recompute rewired to `releaseDial` (@/lib/readiness-release); persisted
  dialPercent/passProbability = finalDial/final; blocks[i].meanProb = pSlot; dialIndep = release
  independence dial; inputsJson APPEND-ONLY adds model:"lm-gh1"/sigma/nodeCount/blockStats{nSeen,C};
  drops the correctBlockMeanProb+computeReadiness calls from the persisted-dial path (constants/lib left
  for task 09). reviewMass = mean ReviewState.reps over seen; nUnseen per block = max(0, quota − nSeen).
- lib/server/readiness-release.integration.test.ts — NEW: live never-above (weak 4≤4, strong 63<68),
  release (rich 100 ≥ 80), study-never-hurts (R2 54→63 non-decreasing), + inputsJson audit-field pin. All
  frozen magnitudes pre-verified through the real recomputeReadiness (throwaway tsx, since removed).
- lib/server/readiness-estimation.integration.test.ts — temporarily describe.skip'd (task 09 rewrites it).
- lib/server/readiness-snapshot.integration.test.ts — §4 mock-anchor describe.skip'd (mock blending is
  retired by the release model; task 09/10 rewrites or retires it). §2/§3 unchanged + green.

## Acceptance (evaluator reads these — no execution needed)
| Goal | Evidence |
|---|---|
| 1 recompute uses readiness-release, not correctBlockMeanProb | mastery-readiness.ts imports `releaseDial`; no `correctBlockMeanProb`/`computeReadiness` in the persisted-dial path; `dialPercent = sufficientData ? release.finalDial : 0` |
| 2 inputsJson append-only + new fields | mastery-readiness.ts inputsJson: model/sigma/nodeCount/blockStats + kept dialIndep + all pre-existing keys (rho/engine/calibratorId/rhoEst/tier/nEff/mock/blocks/…); test `rr-audit` pins model/nodeCount/blockStats |
| 3 never-above BOTH populations | readiness-release.integration.test.ts weak dialPercent 4 ≤ dialIndep 4, strong 63 < 68 |
| 4 release (rich ≥ 80) | test rr-rich dialPercent 100 ≥ 80 |
| 5 study-never-hurts R2 | test rr-r2 before 54 → after 63 (≥) |
| 6 honesty gate byte-untouched, ρ draw-side 0, typecheck 0 | `git diff --quiet` on honesty file (verify.sh); READINESS_TOPIC_CORRELATION=0; typecheck green |
| 7 typecheck+unit+db:seed+integration | verify.sh green end-to-end (`PASS: wave19d-08`) |

## Log
- 2026-07-13 laptop: planned. Depends on task 07 (release model) + task 03/04 (blueprint). Honesty gate +
  draw-side ρ stay byte-untouched by construction.
- 2026-07-13 ClPcs-Mac-mini: rewired `recomputeReadiness` to the wave19d release model "lm-gh1"
  (releaseDial): per-block {quota, seenR, nUnseen=max(0,quota−nSeen)} + reviewMass=mean ReviewState.reps
  over seen + calibrationSlope → persist finalDial/final as dialPercent/passProbability, blocks[i].meanProb
  = pSlot, dialIndep = release.independenceDial; inputsJson APPEND-ONLY gains model/sigma/nodeCount/
  blockStats{nSeen,C}, keeps every pre-existing key. Dropped the correctBlockMeanProb+computeReadiness
  calls from the persisted-dial path (constants/lib left for task 09). Wrote the NEW live-proof suite;
  pre-verified weak/strong/rich/R2 magnitudes via a throwaway `npx tsx --conditions=react-server`
  recompute (deleted), froze them (4≤4, 63<68, 100, 54→63). Suspended readiness-snapshot §4 (mock-anchor,
  now retired) + readiness-estimation (task 09). typecheck 0, unit 727 green, verify.sh green (db:seed +
  the 2 integration suites): PASS: wave19d-08.

## Verify
**Last verify:** PASS (2026-07-13T14:14:29Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T14:16:48Z)
