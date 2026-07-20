# Task: wave19a-05-calibration-metrics

**Status:** done
**Driver:** auto
**Updated:** 2026-07-12
**Last compute:** laptop

PURE MODULE + KNOWN-ORACLE TESTS (Part 2 §H). Build `lib/calibration-metrics.ts` — the pure calibration-metrics
+ Platt-fit module over predicted-P(pass) ↔ actual-pass points. No clock/DB/rng. The plan-time FROZEN oracle
values below (Brier, LogLoss — both bin-convention-free, hand-computed here) are the external gate; they live in
verify.sh so the implementation cannot game them.

## Goal
PASS = ALL true:

1. `lib/calibration-metrics.ts` is PURE — grep over the file finds none of `server-only`, `@/lib/db`,
   `@prisma/client`, `lib/generated`, `Math.random`, `Date.now`, `new Date`.
2. It exports, taking `points: { p: number; y: 0|1 }[]` (or `{predicted, actual}` — document the shape):
   - `reliabilityDiagram(points, bins = 10)` → array of per-bin `{ meanPredicted, observedFraction, count }`
     (empty bins omitted or zero-count; document which).
   - `brierScore(points)` → mean squared error `mean((p - y)^2)`.
   - `logLoss(points)` → `-mean(y·ln(p) + (1-y)·ln(1-p))`, with p CLAMPED to `[eps, 1-eps]` (document eps) so it
     never returns ±∞.
   - `ece(points, bins = 10)` → `Σ_b (count_b/N)·|meanPredicted_b − observedFraction_b|`.
   - `fitPlatt(points)` → `{ A, B }` fitting `P' = sigmoid(A·logit(p) + B)` (document the objective — logistic
     MLE / Platt); `applyPlatt(p, { A, B })` → the recalibrated probability.
3. EXTERNAL FROZEN ORACLE (hand-computed at plan time; verify.sh enforces to tolerance 1e-6). For the point set
   `P = [ {p:0.9,y:1}, {p:0.8,y:0}, {p:0.3,y:0}, {p:0.6,y:1} ]`:
   - `brierScore(P) === 0.225` exactly  (= (0.01+0.64+0.09+0.16)/4).
   - `logLoss(P) ≈ 0.6455747490`  (= (−ln0.9 − ln0.2 − ln0.7 − ln0.6)/4, natural log).
4. Unit tests in `lib/calibration-metrics.test.ts`, each export with a KNOWN oracle, incl. the two literals above
   AND the research "ECE is gameable" fact as an EXPLICIT test + comment: a base-rate-only predictor (every
   `p = 0.5` on a set with observed base rate 0.5) has `ece ≈ 0` yet `brierScore = 0.25` and
   `logLoss ≈ 0.6931472` (= −ln0.5) — i.e. ECE≈0 does NOT imply a good forecaster. A perfectly-calibrated bin
   (meanPredicted == observedFraction) contributes 0 to ECE.
5. Platt oracle (not a magic literal — a recovery/monotonicity property): `applyPlatt` is monotonic increasing in
   `p`; fitting on an ALREADY-calibrated large synthetic set recovers near-identity (`|A−1| < 0.25`, `|B| < 0.25`);
   fitting on a systematically OVER-confident set yields a calibrator that reduces LogLoss vs the raw predictions.
6. `npm run -s typecheck` exits 0; `npm run -s test` exits 0 with `lib/calibration-metrics.test.ts` collected
   (assert via `npx vitest list` captured to a var, then grep).

## Constraints / decisions
- PURE `lib/` module — DB orchestration (reading `PassOutcome`) is NOT here; it lives in the admin page /
  server layer (wave19a-08). This module takes plain arrays and returns plain numbers/objects.
- The Brier and LogLoss literals are computed at PLAN time and pinned in verify.sh — the implementer must match
  them, cannot rewrite them. Do NOT change these tolerances/values to make a buggy impl pass.
- LogLoss clamping: pick a documented `eps` (e.g. 1e-15) applied symmetrically so `p=0`/`p=1` inputs are finite;
  the frozen oracle points avoid the clamp region so the literal is exact regardless of eps.
- zod is NOT needed here (pure math over already-typed arrays); input-validation of the action payload is
  wave19a-06's concern.
- Non-goals: isotonic regression (deferred), reading the DB, auto-promotion logic, the capture action, any UI.

## Next
- [x] Write `lib/calibration-metrics.ts` (pure) + `lib/calibration-metrics.test.ts` with the frozen oracles; run
      typecheck + test.
- Goal fully met — verify.sh PASSES (frozen Brier=0.225 / LogLoss≈0.6455747490, purity, exports, 13 unit tests
  incl. the 'ECE is gameable' base-rate oracle + Platt monotonicity/recovery/LogLoss-reduction). Nothing left.

## Artifacts
- lib/calibration-metrics.ts — pure metrics + damped-Newton Platt fit
- lib/calibration-metrics.test.ts — 13 oracle tests

## Log
- 2026-07-07 laptop: planned.
- 2026-07-12 ClPcs-Mac-mini: wrote lib/calibration-metrics.ts (reliabilityDiagram/brierScore/logLoss/ece/
  fitPlatt/applyPlatt; point shape {p,y} with {predicted,actual} aliases; LOGLOSS_EPS=1e-15) + 13-test oracle
  suite. Naive Newton diverged on the near-separable sharpened Platt set (A→−6e12) — hardened fitPlatt with an
  L2 ridge (1e-6, keeps Hessian PD) + backtracking line search on the regularised NLL. Fixed the p=1/y=0 clamp
  oracle to bound magnitude (float rounding of 1−(1−eps) makes −ln(eps) inexact). verify.sh PASSES: typecheck 0,
  631 unit tests green, frozen Brier/LogLoss matched. Status→done.

## Verify
**Last verify:** PASS (2026-07-12T13:35:18Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T13:36:17Z)
