# Task: wave24-08-validation-run

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-15
**Last compute:** mac-mini

THE WAVE ORACLE. Runs the full pipeline end-to-end on SYNTHETIC ground truth and enforces the
RECOVERY + NULL gates — the "external end-to-end oracle no self-consistent bug can fake" (spec Goal).
Generator (wave24-07, OUR TS engine) ⟂ Fitter (wave24-03, py-fsrs) ⟂ Evaluator (wave24-04) means a bug
in any one shows up as a gate failure. INVESTIGATION task: materialize on-disk artifacts (committed
results JSON + FINDINGS.md + verbatim stdout) so the static evaluator READS produced files.

Spec: `specs/wave24-weightfit-harness.md` Deliverable 4 + Synthetic-data validation (b) RECOVERY GATE,
(c) NULL GATE + the review-count curve.

Depends on: wave24-01..07. Artifacts:
- `scripts/fsrs-fit/run-validation.ts` (or `.sh`) — orchestrates generate→export→fit→evaluate; deterministic seed.
- `tasks/wave24-08-validation-run/VALIDATION-RESULTS.json` — the committed measured numbers.
- `tasks/wave24-08-validation-run/PREVERIFY-OUTPUT.txt` — verbatim orchestrator stdout (static evidence).
- `tasks/wave24-08-validation-run/FINDINGS.md` — Acceptance table + gate verdicts, mirroring the numbers.

## The gates (perturbation = default with w8×1.2, w11×1.2, w20×1.2 ⇒ true w20 = 0.18504)
- **RECOVERY GATE** (on the PERTURBED-generated population, holdout log-loss):
  (i) `fitted_logloss  <  default_logloss` (strict — fitted beats default on held-out reviews).
  (ii) `fitted_w20  >  0.1542` (the fitted forgetting-curve decay moved TOWARD the true 0.18504 from the
       default 0.1542 — DIRECTION, not exact recovery).
- **NULL GATE** (on the DEFAULT-generated population): `fitted_logloss  >=  default_logloss - 0.005`
  (fitting logs that came from the DEFAULT weights must NOT beat defaults by more than the 0.005
  absolute-log-loss noise threshold — guards against an evaluator that always flatters the fit).
- **REVIEW-COUNT CURVE** (measured + reported; endpoint gated): fit at 200/500/1000/2000 reviews/user,
  record `w20_err(n) = |fitted_w20(n) − 0.18504|`. Gate: `w20_err(2000) < w20_err(200)` (recovery
  sharpens with data — the survey's open question, answered on synthetic ground truth).

## Goal
PASS = ALL true:

1. `tasks/wave24-08-validation-run/VALIDATION-RESULTS.json` exists and holds, as numbers:
   `recovery.default_logloss`, `recovery.fitted_logloss`, `recovery.fitted_w20`,
   `null.default_logloss`, `null.fitted_logloss`, and a `curve` array of
   `{reviews, fitted_w20, w20_err}` for reviews ∈ {200,500,1000,2000}. Plus `seed` (the fixed generator
   seed) and `n_users`.
2. RECOVERY (i): `recovery.fitted_logloss < recovery.default_logloss`.
3. RECOVERY (ii): `recovery.fitted_w20 > 0.1542`.
4. NULL: `null.fitted_logloss >= null.default_logloss - 0.005`.
5. CURVE endpoint: the `curve` entry for reviews=2000 has `w20_err < ` the reviews=200 entry's `w20_err`.
6. `PREVERIFY-OUTPUT.txt` is the VERBATIM stdout of ONE orchestrator run (header
   `static evidence — read, do not run`) and its printed headline numbers MATCH VALIDATION-RESULTS.json
   (verify.sh cross-checks default/fitted logloss + fitted_w20 appear in both).
7. `FINDINGS.md` contains an `## Acceptance` table mapping each gate → the exact field in
   VALIDATION-RESULTS.json the judge READS, states GATES PASS, and notes the generator⟂fitter⟂evaluator
   independence (so exp = external synthetic ground truth, got = py-fsrs fit — no self-grading).

## Constraints / decisions
- ⚠ CORRECTNESS ORACLE, not a product-direction spike: the ground truth is KNOWN, so a gate FAILURE means
  a pipeline BUG (generator, export, fitter wiring, or evaluator), NOT a real negative result. Do NOT
  "report NO-GO and move on" and do NOT re-fixture to force a pass — leave the task active/blocked with
  the failing number documented until the bug is found. The research (finding #1, HIGH confidence) says
  fitted beats default by ~0.019 log-loss, so recovery SHOULD pass on a correctly-perturbed population.
- Deterministic generation (fixed seed pinned in VALIDATION-RESULTS.json); the py-fsrs fit may be mildly
  stochastic, which is exactly why every gate is an INEQUALITY with a noise margin, never an exact-value
  assertion. The committed JSON is the measured run the judge reads (re-running is not required to pass).
- Keep `n_users` modest (e.g. 30–60) so the 4 review-count fits are tractable; the gates are on aggregate
  holdout metrics, not per-user.
- No product code, no scheduling change, nothing imports fitted weights. Fitted vectors live ONLY in
  throwaway temp files + the committed results JSON (numbers, not wired anywhere).

## Next
- [x] Author run-validation.ts, execute the full grid once, commit VALIDATION-RESULTS.json + verbatim
      stdout + FINDINGS.md.
- [ ] BLOCKED on wave24-07: RECOVERY(ii) `fitted_w20 > 0.1542` fails — the fit pins `w20` at the 0.1
      boundary because the generator reviews every card at due±15% (all data at R≈0.9, recall 0.908),
      making the forgetting-curve decay unidentifiable. Fix belongs in `gen-synthetic.ts`: add
      review-timing variance so some reviews land far from due (sampling low-R forgetting-curve points),
      then re-run this orchestrator UNCHANGED. Do NOT re-seed/re-fixture run-validation.ts to force green.

## Log
- 2026-07-14 planner: task created.
- 2026-07-15 ClPcs-Mac-mini: Authored `scripts/fsrs-fit/run-validation.ts` (generate ⟂ fit.py ⟂
  evaluate.py orchestrator, fixed seed 20260715, n_users=30, cards=20, recovery/null at 2000 reviews/user,
  curve at 200/500/1000/2000). Ran the full grid once (exit 0, ~2.5 min). Results (committed to
  VALIDATION-RESULTS.json): RECOVERY(i) PASS (fitted logloss 0.235134 < default 0.249826); NULL PASS
  (fitted 0.232070 ≥ default 0.234205 − 0.005); **RECOVERY(ii) FAIL** (fitted_w20 = 0.100001, needs
  > 0.1542); CURVE nominally passes but ONLY on a 1.3e-6 boundary artifact (w20 pinned at 0.1 at every
  review count — meaningless). Diagnosed root cause: the generator's due-driven cadence (due±15%, every
  review at R≈0.9; measured recall 0.9081 perturbed / 0.9080 default) gives ZERO retrievability spread,
  so `w20` is unidentifiable — the (S, w20) pair is degenerate and the optimizer clamps w20 to 0.1 for
  BOTH perturbed AND default populations. w8/w11 DO recover (they're identifiable from R≈0.9 data), which
  is why RECOVERY(i)+NULL pass. Per this task's Constraint + the CROSS-TASK-COUPLING learning, the
  failing behavior lives in `gen-synthetic.ts` (wave24-07's deliverable), NOT in run-validation.ts (this
  task's deliverable) — so parked BLOCKED on wave24-07 with the failing number documented, not forced.
  Materialized FINDINGS.md (Acceptance table + root cause + recommended generator fix) +
  PREVERIFY-OUTPUT.txt (verbatim stdout).

## Artifacts
- `scripts/fsrs-fit/run-validation.ts` — orchestrator (generate ⟂ fit.py ⟂ evaluate.py; fixed seed
  20260715); deterministic generation, py-fsrs fit/eval; writes VALIDATION-RESULTS.json + prints gate
  verdicts. Run: `npx tsx --conditions=react-server scripts/fsrs-fit/run-validation.ts`.
- `tasks/wave24-08-validation-run/VALIDATION-RESULTS.json` — measured numbers (RECOVERY(ii) fails).
- `tasks/wave24-08-validation-run/PREVERIFY-OUTPUT.txt` — verbatim orchestrator stdout (static evidence).
- `tasks/wave24-08-validation-run/FINDINGS.md` — Acceptance table + gate verdicts + root-cause diagnosis.

## Verify
**Last verify:** FAIL (2026-07-15T06:45:15Z)
Fixing this is the next increment. Error excerpt (last 20 lines):
```
Traceback (most recent call last):
  File "<stdin>", line 5, in <module>
AssertionError: RECOVERY(ii) FAIL: fitted_w20 0.10000134733675531 !> 0.1542
FAIL: a validation gate did not hold
```
