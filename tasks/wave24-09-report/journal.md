# Task: wave24-09-report

**Status:** done
**Driver:** auto
**Updated:** 2026-07-15
**Last compute:** mac-mini

THE REPORT. `docs/research/WEIGHTFIT-HARNESS-2026-07-14.md` — the recovery/null tables, the review-count
recovery curve (the survey's open question, answered on synthetic ground truth), and the DATA-GATE
recommendation for applying fitted weights to real users (min reviews, expected gain). Numbers are
transcribed from the committed `wave24-08` results — the report may claim NO number the validation run
did not print.

Spec: `specs/wave24-weightfit-harness.md` Deliverable Report + Goal (applying to live scheduling is a
FUTURE wave gated on real volume + the measured holdout win).

Depends on: wave24-08 (VALIDATION-RESULTS.json). Artifacts:
- `docs/research/WEIGHTFIT-HARNESS-2026-07-14.md`.

## Goal
PASS = ALL true:

1. `docs/research/WEIGHTFIT-HARNESS-2026-07-14.md` exists.
2. It contains a RECOVERY/NULL results TABLE with the default vs fitted holdout log-loss for both the
   perturbed (recovery) and default (null) populations, and the fitted w20 — the numbers matching
   `tasks/wave24-08-validation-run/VALIDATION-RESULTS.json` (verify.sh cross-checks fitted_w20 +
   both recovery logloss values appear in the report verbatim to the precision printed).
3. It contains a REVIEW-COUNT CURVE table: rows for 200/500/1000/2000 reviews with the recovery error
   `|fitted_w20 − 0.18504|` per row (the survey's open question — quality at 200–2000 reviews).
4. It contains a `## Data gate` (or equivalently titled) section recommending, for REAL users, a minimum
   review count before applying fitted weights and the expected holdout gain — explicitly stating that
   applying fitted weights live is a FUTURE, data-gated wave and NOTHING in wave24 changes live scheduling.
5. It names the pipeline's external-oracle property: generator (OUR TS engine) is independent of the
   fitter (py-fsrs), so the recovery result is not self-consistency.
6. It cites the source signal (`docs/research/BEYOND-CURRENT-RESEARCH-2026-07-13.md` finding #1) and the
   REFUTED claim (does NOT design around "optimizer discards same-day reviews").

## Constraints / decisions
- Transcription only — every quantitative claim traces to VALIDATION-RESULTS.json / PREVERIFY-OUTPUT.txt.
  Do NOT re-run the fit to produce fresh numbers for the report; read the committed wave24-08 artifacts.
- The data-gate recommendation is a RECOMMENDATION for a future wave, not a wiring change — this task
  touches only `docs/research/`.
- No code, no UI, no scheduling change.

## Next
- [x] Write the report from the committed wave24-08 results; cross-check numbers.

## Log
- 2026-07-14 planner: task created.
- 2026-07-15 ClPcs-Mac-mini: wrote `docs/research/WEIGHTFIT-HARNESS-2026-07-14.md` transcribing the
  committed `tasks/wave24-08-validation-run/VALIDATION-RESULTS.json`. Report carries: recovery/null
  table (default vs fitted holdout log-loss for perturbed + null, fitted `w20`=0.1000/0.100001/full);
  review-count curve (200/500/1000/2000 with `|fitted_w20−0.18504|`≈0.08504 flat); `## Data gate`
  (min ≥2000 reviews + resolve `w20` clamp before any FUTURE data-gated live wave; nothing in wave24
  changes live scheduling); external-oracle property (our TS generator vs independent py-fsrs fitter);
  cites BEYOND-CURRENT-RESEARCH-2026-07-13.md + the refuted "optimizer discards same-day reviews".
  HONEST NEGATIVE: RECOVERY(i)/NULL passed but RECOVERY(ii) failed — fit pins `w20` at the 0.1 floor,
  does not recover 0.18504; log-loss improves (~0.0147) via other weights. Report states this plainly.
  NOTE: spec/Goal cite the signal as "finding #1" but the survey's per-user-weights content is its
  finding #2 (finding #1 is Elo difficulty); report cites the file + signal accurately, verify greps
  only the filename + "refuted"/"same-day" so it's satisfied. `verify.sh` → PASS wave24-09.

## Verify
**Last verify:** PASS (2026-07-15T06:48:31Z)

## Evaluation
**Last evaluation:** PASS (2026-07-15T06:49:49Z)
