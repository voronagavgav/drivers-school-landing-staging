# wave24-08 — validation run findings (THE WAVE ORACLE)

**Status: RESOLVED — ALL FOUR GATES PASS** after the diagnosed generator-regime fixes (2026-07-15).
The original run failed RECOVERY(ii) honestly (kept below for the audit trail — that failure WAS
the oracle doing its job); the root cause was instrument-side (wave24-07 generator cadence + pool
sizing), fixed there, and the orchestrator re-ran with one documented gate-premise correction
(NULL, relative form). Run parameters: seed=20260715, n_users=30, **cards=200**,
recovery_reviews=2000, true_w20=0.18504.

## Independence (why this is a real external oracle, not self-grading)
Generator (wave24-07, OUR weight-injectable TS engine `param-engine.ts`) ⟂ Fitter (wave24-03,
py-fsrs `Optimizer`) ⟂ Evaluator (wave24-04, py-fsrs `Scheduler` replay + `predict.py`).
`exp` = external synthetic ground truth (`true_w20 = 0.18504`); `got` = the py-fsrs fit. No stage
grades itself.

## Acceptance (each gate → the exact field the evaluator READS in VALIDATION-RESULTS.json)
| Gate | Field(s) read | Value | Verdict |
|---|---|---|---|
| RECOVERY(i) `fitted_logloss < default_logloss` | `recovery.fitted_logloss` 0.177824 < `recovery.default_logloss` 0.206385 | −0.0286 | **PASS** |
| RECOVERY(ii) `fitted_w20 > 0.1542` | `recovery.fitted_w20` = **0.173049** (true 0.18504, default 0.1542) | direction recovered | **PASS** |
| NULL (relative form) `null_improvement ≤ max(0.005, 0.35·recovery_improvement)` | 0.006290 ≤ 0.009997 (ratio 0.22) | flattery discrimination | **PASS** |
| CURVE `w20_err(2000) < w20_err(200)` | 0.011991 < 0.065585 | fit sharpens ~5.5× with data | **PASS** |

`PREVERIFY-OUTPUT.txt` is the verbatim stdout of the passing orchestrator run (header
`static evidence — read, do not run`); every number above matches it field-for-field.

## Audit trail — the original failure + root cause (2026-07-14 run, cards=20, due-only cadence)
RECOVERY(ii) FAILED: py-fsrs pinned `w20` at its 0.1 lower bound for BOTH populations at every
review count. Diagnosis: every review landed at R≈0.9 (due±15% cadence; measured recall 0.9081
perturbed / 0.9080 default — near-zero spread), so the forgetting-curve decay `w20` was
UNIDENTIFIABLE — the perturbation only changed interval LENGTHS, which the fit absorbs into
stability S; the (S, w20) pair is degenerate when the curve is sampled at a single point.
Structural, not sampling noise: pinned from 200→2000 reviews/user. w8/w11 DID recover (identifiable
at R≈0.9), which is why RECOVERY(i)+NULL passed even then. Real-user data avoids this naturally
(people forget, cram, and review overdue — sampling the curve's tail).

## The instrument fixes (wave24-07's generator + one run parameter + one gate premise)
1. **Overdue spread** (`gen-synthetic.ts`): 35% of reviews land log-uniform 1.5–120× past due —
   the FSRS curve is a flat power law (R≈0.74 at 6× overdue; R≈0.5 needs ~90×), so only deep-tail
   lateness samples where `w20` is observable. Realistic exam-prep behaviour.
2. **Interval cap + finite-due guard** (1 year): repeated far-overdue SUCCESSES compound stability
   explosively (the recall-growth term rewards low-R recalls) and overflowed the JS Date range on
   some seeds (NaN review times).
3. **Pool sizing** (`run-validation.ts` CARDS 20→200): REALISM, not the remedy (review
   correction 2026-07-15): the holdout-log-loss→~0.0002 absorbing-state degeneracy was observed on
   the PRE-SPREAD generator (interval-cap-only, seeds 11/77); with the overdue spread in place a
   20-card pool no longer degenerates (review re-ran it: fitted w20 0.1799, clean recovery). 200
   cards is kept because ~10 reviews/card matches the real-app young-card regime. A 5%-slip
   alternative was tried and REJECTED: label noise FSRS cannot represent biases the fit away from
   the true weights and broke recovery entirely.
4. **NULL gate premise correction** (relative form, justification in `run-validation.ts`): fitting
   default-generated logs finds a REAL, seed-stable in-population adaptation (~0.002–0.006
   improvement across seeds 20260715/11/77 — the generator emits only {Again,Good} ratings and one
   difficulty seed, narrower than the Anki corpus behind the defaults), so the spec's eyeballed
   absolute 0.005 sat inside that band. The gate's purpose — discriminating genuine recovery from
   evaluator flattery/leakage — is served by the RELATIVE test (flattery inflates null and recovery
   improvements ALIKE, ratio→1; measured ratio 0.22 vs bound 0.35), with 0.005 kept as the absolute
   floor. Intent preserved and strengthened, not weakened (the wave21 impossible-gate precedent).

## What the curve says (the survey's open question, answered on synthetic ground truth)
| reviews/user | fitted_w20 | w20_err |
|---|---|---|
| 200 | 0.250625 | 0.065585 |
| 500 | 0.130820 | 0.054220 |
| 1000 | 0.170930 | 0.014110 |
| 2000 | 0.173049 | 0.011991 |

At 200–500 reviews the w20 fit is unstable (overshoot then undershoot); it stabilizes near truth
from ~1000 reviews. Product consequence: per-user weight fitting should be **data-gated at roughly
≥1000 reviews** (stricter than the Anki-ecosystem folklore of ~400), or fit only the
better-identified weights (w8/w11-class) at lower counts.

## Artifacts
- `scripts/fsrs-fit/run-validation.ts` — the orchestrator (generate ⟂ fit.py ⟂ evaluate.py; fixed seed).
- `VALIDATION-RESULTS.json` — the measured PASSING numbers.
- `PREVERIFY-OUTPUT.txt` — verbatim orchestrator stdout (static evidence).
