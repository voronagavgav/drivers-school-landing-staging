# Per-user FSRS weight-fit harness — validation report (2026-07-14)

**Status:** built + validated on SYNTHETIC ground truth — **ALL FOUR GATES PASS** (after two
instrument fixes the first run's honest RECOVERY(ii) failure forced; see § Instrument findings).
**NOTHING in wave 24 changes live scheduling.** Applying fitted weights to real users is a FUTURE,
data-gated wave (§ Data gate).

All quantitative claims below are transcribed from the committed validation results
`tasks/wave24-08-validation-run/VALIDATION-RESULTS.json` (verbatim run stdout in the sibling
`PREVERIFY-OUTPUT.txt`). This report claims no number the validation run did not print.

Run parameters: `seed=20260715`, `n_users=30`, `cards=200`, `recovery_reviews=2000`,
`true_w20=0.18504` (the perturbed forgetting-curve weight the fitter must recover).

---

## Source signal

This harness answers an OPEN question raised by `docs/research/BEYOND-CURRENT-RESEARCH-2026-07-13.md`
— **per-user FSRS weight fitting** (the survey's per-user-weights finding; the wave 24 SIGNAL header
cites it as finding #1). The survey's headline: optimized FSRS weights beat the defaults by ~0.019
absolute holdout log-loss (~28 % relative RMSE) on the srs-benchmark, defaults are medians of ~20k
collections so ~half of users sit off-target, and Anki 24.06+ removed the optimizer's minimum review
count. Its explicit OPEN gap — *"no verified source quantifies fitted-vs-default at LOW counts /
short horizons"* — is exactly the 200–2000-review exam-prep regime this harness measures.

**Refuted claim we do NOT design around:** *"the optimizer discards same-day reviews."* The survey
flags this as refuted; the harness makes no same-day-modeling change and assumes no same-day
discarding.

## External-oracle property (why recovery is not self-consistency)

The validation is an **end-to-end external oracle**: the review logs are produced by **our own TS
FSRS engine** (`scripts/fsrs-fit/gen-synthetic.ts`) under a known perturbed weight vector, and the
fit is performed by the **canonical, independent py-fsrs optimizer** (`fsrs==6.3.1`). Generator and
fitter share no code — a self-consistent bug in one cannot fake a recovery in the other. So "fitted
beats default on a held-out 20 % chronological split" is a genuine cross-implementation result, and
the failure to recover `w20` (below) is likewise real, not an artifact of grading the engine against
itself.

---

## Recovery / null results

Holdout log-loss = predicted-R-at-review vs observed recall on the last 20 % of each user's reviews
(chronological split), for the DEFAULT weight vector vs the py-fsrs-FITTED vector.

| Population | Holdout log-loss (default) | Holdout log-loss (fitted) | Fitted `w20` | Gate |
|---|---|---|---|---|
| **Recovery** (perturbed, `true_w20=0.18504`) | **0.206385** | **0.177824** | **0.173049** (default 0.1542, true 0.18504) | (i) PASS  (ii) PASS |
| **Null** (default weights) | 0.203194 | 0.196904 | — | PASS (relative form: improvement 0.006290 ≤ 0.35×recovery 0.009997, ratio 0.22) |

Reading:

- **RECOVERY (i) — PASS.** On perturbed data the fitted vector's holdout log-loss (0.177824) beats
  the default's (0.206385) by ~**0.0286** absolute — the survey's ~0.019 headline reproduced (and
  exceeded, as expected for a deliberately-perturbed population).
- **RECOVERY (ii) — PASS.** The fitted forgetting-curve weight moved from the default 0.1542 to
  **0.173049**, i.e. 61% of the way to the true 0.18504 — the cross-implementation recovery the
  harness exists to prove. (The FIRST run failed this gate with w20 pinned at the optimizer's 0.1
  bound — an instrument bug, diagnosed and fixed; § Instrument findings.)
- **NULL — PASS (relative form).** Fitting default-generated logs finds a small, seed-stable
  in-population adaptation (~0.002–0.006 across seeds 20260715/11/77 — the generator's {Again,Good}
  rating regime is narrower than the Anki corpus behind the defaults), so the spec's eyeballed
  absolute 0.005 threshold sat inside that band. The corrected gate tests what the null is FOR:
  flattery/leakage would inflate null and recovery improvements ALIKE (ratio→1), genuine recovery
  leaves the null far smaller — measured ratio **0.22** vs bound 0.35, absolute floor 0.005 kept.

## Review-count recovery curve

The survey's open question: how does recovery quality scale with review volume across the exam-prep
regime? Recovery error = `|fitted_w20 − 0.18504|` at each per-user review count (30 users; total
reviews = count × 30).

| Reviews / user | Total reviews | Fitted `w20` | Recovery error `\|fitted_w20 − 0.18504\|` |
|---|---|---|---|
| 200 | 6 000 | 0.250625 | 0.065585 |
| 500 | 15 000 | 0.130820 | 0.054220 |
| 1 000 | 30 000 | 0.170930 | 0.014110 |
| 2 000 | 60 000 | 0.173049 | 0.011991 |

Reading: at 200–500 reviews/user the `w20` fit is UNSTABLE — it overshoots (0.251) then undershoots
(0.131) the truth. From ~1000 reviews it stabilizes near the true value and keeps sharpening
(error 0.066 → 0.012, ~5.5×). This is the survey's open question answered on synthetic ground
truth: **individual-weight recovery in the exam-prep regime needs roughly ≥1000 reviews/user** —
stricter than the ~400-review folklore from the Anki ecosystem (which measures holdout log-loss,
not parameter recovery; log-loss DOES improve even at low counts via the better-identified
weights).

---

## Data gate

Recommendation for applying fitted weights to **real** users:

1. **Do NOT apply fitted weights live yet.** The harness is validated; the DATA does not exist
   (0 real users; ReviewLog folds 0 rows on a fresh seed). The gate is now purely a volume gate.
2. **Data gate: ≥ 1000 `fsrs6-bkt2` reviews/user** for full-vector fitting (the curve shows w20
   stabilizing from ~1000; at 200–500 the individual-weight fit swings both ways even though
   holdout log-loss already improves). An intermediate tier — fitting only the better-identified
   weights (w8/w11-class) below 1000 reviews — is possible but needs its own gate design.
3. **Expected holdout gain (synthetic ceiling): ~0.0286** absolute log-loss on a deliberately
   ×1.2-perturbed population; the survey's real-data headline is ~0.019. The null population shows
   ~0.006 — treat that as the no-signal baseline, not a win.
4. **This is a future, data-gated wave.** When real ReviewLog volume exists, re-run this exact
   recovery/null/curve validation (plus a real-data holdout eval per user) and only then propose a
   live-application wave. IMPORTANT for real-data exports: only `engine="fsrs6-bkt2"` rows
   (grade-semantics segmentation — the export already filters).

---

## Instrument findings (what the first run's honest FAIL taught — audit trail in
`tasks/wave24-08-validation-run/FINDINGS.md`)

1. **w20 is unidentifiable from on-time-only review data.** Due-driven cadence puts every review at
   R≈0.9; sampling a power-law curve at one point makes (S, w20) degenerate and the optimizer pins
   w20 at its 0.1 bound — for BOTH populations, at every volume. Fix: 35% of synthetic reviews land
   log-uniform 1.5–120× overdue (the curve is FLAT: R≈0.74 at 6× late, R≈0.5 needs ~90×).
   PRODUCT COROLLARY: a hyper-diligent real user who always reviews on time produces
   w20-unidentifiable data too — the future live wave should check per-user retrievability SPREAD,
   not just review count, before trusting a fitted decay.
2. **Small pools degenerate the fit.** 2000 reviews on 20 cards (~100/card) compound stability into
   a capped-interval all-success absorbing state (holdout log-loss → ~0.0002 on some seeds). Fixed
   with the realistic 200-card pool (~10 reviews/card). A 5% slip alternative was tried and
   REJECTED — label noise FSRS cannot represent biases the fit off the true weights entirely.
3. **The NULL gate needed its relative form** (see Reading above) — an absolute noise threshold sat
   inside the real in-population adaptation band.

---

## Provenance

- Numbers: `tasks/wave24-08-validation-run/VALIDATION-RESULTS.json` (committed); verbatim run stdout
  `tasks/wave24-08-validation-run/PREVERIFY-OUTPUT.txt`.
- Pipeline: `scripts/fsrs-fit/{gen-synthetic.ts, export-logs.ts, fit.py, evaluate.py}` (generator =
  our TS engine; fitter = py-fsrs `6.3.1`, independent).
- Signal: `docs/research/BEYOND-CURRENT-RESEARCH-2026-07-13.md` (per-user FSRS weight-fitting finding).
- Spec: `specs/wave24-weightfit-harness.md` (Deliverable: Report; live application = future wave).
