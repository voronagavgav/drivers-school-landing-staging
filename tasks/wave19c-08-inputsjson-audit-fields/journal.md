# Task: wave19c-08-inputsjson-audit-fields

**Status:** done
**Driver:** auto
**Updated:** 2026-07-12
**Last compute:** mac-mini

## Goal
Append audit + calibration fields to the `ReadinessSnapshot.inputsJson` written by `recomputeReadiness`
(`lib/server/mastery-readiness.ts`). APPEND-ONLY — never rename/remove existing keys; old rows tolerated.

1. The `inputsJson` object gains (spec §Server wiring):
   - `rhoEst`: the estimation-side ρ actually applied (= `READINESS_TOPIC_CORRELATION_ESTIMATION`, 0.3).
   - `tier`: the live tier string (`READINESS_ESTIMATION_TIER`, "mean" | "quantile" | "off").
   - per-block `nEff`: each block's effective sample size `effectiveN(n_t, rhoEst)` rounded to 4dp. Store
     it so a block is `{ quota, meanProb, nEff }` OR add a parallel `nEff` array positionally aligned to
     `blocks` — pick one and document it; keep `blocks` positional per the wave19b convention.
   - `dialIndep`: the UNCORRECTED independence dial as a percent integer in [0,100] — computed by running
     `computeReadiness` on the RAW (pre-correction) block meanProbs with `topicCorrelation: 0`, then
     `Math.round(passProbability*100)` (gated by `sufficientData` the same way `dialPercent` is: 0 when
     insufficient). This lets the PassOutcome calibration view compare tiers vs real outcomes.
2. Keep the existing keys (`sufficientData, seenCount, meanR, priorUnseen, mock, blocks, rho, engine,
   calibratorId`) present and unchanged (`rho` = draw-side, stays 0; distinct from new `rhoEst`).
3. `npm run -s typecheck` exits 0; `npm test` exits 0; `npm run test:integration` exits 0.
4. A snapshot written by `recomputeReadiness` (exercised via the wave19c-09 integration test) has
   `JSON.parse(inputsJson)` containing keys `rhoEst === 0.3`, `tier === "mean"`, a per-block `nEff`, and a
   numeric `dialIndep` — verified through the REAL server action, not a hand-built object.

## Constraints / decisions
- APPEND-ONLY: readers must tolerate old rows lacking these keys (`getLatestReadiness` treats missing as
  absent). Do not remove `rho`/`engine`/`calibratorId`.
- `rhoEst` (estimation ρ, 0.3, the one that shrinks evidence) is a DIFFERENT field from `rho` (draw-side,
  0, dead). Both appear; do not conflate.
- `dialIndep` is computed from the RAW pre-correction block meanProbs — this task must retain the raw
  meanProb + n_t per block that wave19c-07 threads through, then run a second `computeReadiness`
  (topicCorrelation 0) on the raw blocks. Do NOT reuse the corrected blocks for `dialIndep`.
- `nEff` rounded to 4dp (spec) — round only for the audit field; the live correction uses full precision.
- Persisted `blocks` remain positional (no key), consistent with wave19b — a test reconstructs the live
  `passProbability` from `blocks` (which are now the CORRECTED meanProbs) alone.

## Next
- [x] Retain raw meanProb + n_t per block; compute `dialIndep` from raw blocks; append `rhoEst`/`tier`/
      per-block `nEff`/`dialIndep` to inputsJson; typecheck; unit + integration.
- Goal fully met. (wave19c-09 integration test then asserts the parsed keys through the real action.)

## Artifacts
- `lib/server/mastery-readiness.ts` — `recomputeReadiness`: `blockDetails` retains raw meanProb + nSeen
  per block; positional `blocks` unchanged (`{quota,meanProb}`); `dialIndep` = uncorrected independence
  dial from a second `computeReadiness` on RAW blocks (topicCorrelation 0), gated by `sufficientData`;
  `nEff` = parallel 4dp `effectiveN(nSeen, ρ_est)` array aligned to `blocks`; inputsJson APPEND-ONLY gains
  `rhoEst`(0.3), `tier`("mean"), `nEff`, `dialIndep`.

## Log
- 2026-07-12 mac-mini: planned.
- 2026-07-12T23:11Z ClPcs-Mac-mini: appended audit + calibration fields to `recomputeReadiness`'s
  inputsJson. Imported `effectiveN`; split the per-block map into `blockDetails` (retains rawMeanProb +
  nSeen) → positional `blocks` derived from it (2-key shape preserved per wave19b convention). Added
  uncorrected `dialIndep` (raw blocks, topicCorrelation 0, sufficientData-gated), parallel `nEff` (4dp),
  `rhoEst`/`tier`. typecheck 0; `npm test` 694 pass; db:seed + `npm run test:integration` 267 pass. All
  verify.sh grep gates green (new keys present, existing append-only keys preserved, effectiveN used).
  Status→done.

## Verify
**Last verify:** PASS (2026-07-12T20:12:47Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T20:15:16Z)
