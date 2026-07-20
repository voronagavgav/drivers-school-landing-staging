# Task: wave24-04-evaluate-py

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** mac-mini

The HOLDOUT EVALUATOR. Per-user chronological split (train on first 80% of reviews, evaluate on the last
20%); reports log-loss + calibration RMSE(bins) of predicted-R-at-review vs observed recall, for BOTH the
default weight vector and a fitted one. The FSRS state evolution under a weight vector is delegated to
the py-fsrs `Scheduler` (external canon — never reimplement the update loop); ONLY the retrievability→
probability step is ours, and it IMPORTS the wave24-02 `predict.py` (already oracle-cross-checked vs TS).

Spec: `specs/wave24-weightfit-harness.md` Deliverable 1 (evaluate.py) + Design (Holdout eval).

Depends on: wave24-01 (venv), wave24-02 (predict.py). Artifacts: `scripts/fsrs-fit/evaluate.py` (authored),
`tasks/wave24-04-evaluate-py/PREVERIFY-OUTPUT.txt` (captured, verify green).

## The metric math (external anchors — hand-computed, frozen here)
- Per test review: `p` = predicted retrievability at review time (from the card's replayed memory state
  S + elapsed since prior review, via `predict.retrievability(elapsed, S, w20)`); `y = 1` if the review
  was recalled (grade ≥ 2, matching `lib/server/calibration.ts` `correct = grade ≥ 2`) else `0`.
- **Log-loss** = `-mean( y·ln(p) + (1-y)·ln(1-p) )` (p clamped to [1e-15, 1-1e-15]).
- **Calibration RMSE(bins)** = bin test reviews into 10 equal-width `p` bins in [0,1]; per non-empty bin
  compute |mean(p) − mean(y)|; RMSE = sqrt(mean over non-empty bins of that squared gap).
Frozen log-loss oracle vectors (independent of any impl — verify by hand from the formula):
- `logloss(p=[0.9], y=[1]) == 0.105361` (= −ln 0.9, 6dp).
- `logloss(p=[0.9,0.9,0.9], y=[1,1,0]) == 0.837769` (= −(2·ln0.9 + ln0.1)/3, 6dp).

## Goal
PASS = ALL true:

1. `scripts/fsrs-fit/evaluate.py` exists; it IMPORTS `predict` (the wave24-02 module) for retrievability
   and uses the py-fsrs `Scheduler` for state replay (grep shows both `import predict`/`from predict` and
   `from fsrs import Scheduler` / `fsrs.Scheduler`). It does NOT reimplement the FSRS stability/difficulty
   UPDATE loop locally (no local `def` recomputing next-stability from grade).
2. `scripts/fsrs-fit/evaluate.py --self-check` (venv python) asserts the two frozen log-loss anchors to
   ≤ 1e-6 and prints `ok logloss single=0.105361` and `ok logloss triple=0.837769` (no `MISMATCH`),
   exits 0.
3. `evaluate.py --in <csv> --out <json>` on `scripts/fsrs-fit/fixtures/sample-revlog.csv` exits 0 and
   writes a JSON with a `default` object holding finite `logloss`, `rmse_bins`, `n_train`, `n_test`.
4. When passed `--weights <fitted.json>` (a wave24-03 fit output), the output JSON ALSO has a `fitted`
   object with finite `logloss`/`rmse_bins` over the SAME test split (identical n_test to `default`).
5. The split is CHRONOLOGICAL per user: the test set is the last 20% of each user's reviews by
   review_time (never random); the smoke prints `ok split n_train=<a> n_test=<b>` with b ≈ round(0.2·N).
6. Captured verbatim into `PREVERIFY-OUTPUT.txt` (header `static evidence — read, do not run`): the
   self-check anchors + the smoke's default/fitted metrics.

## Constraints / decisions
- State evolution = py-fsrs canon: build a `Scheduler(parameters=W, ...long-term/no-fuzz config...)`,
  replay each card's reviews in time order to obtain the memory state (S, last_review) immediately
  BEFORE each held-out test review, then predict R from it. This keeps the FIT and the STATE MODEL
  external; only the loss/calibration + the retrievability call are ours.
- Use the SAME py-fsrs Scheduler config as wave19a/wave24-03 (short-term disabled, no fuzz) so the
  replayed state matches our shipped long-term engine's semantics.
- `predict.retrievability` MUST be the wave24-02 module (do not re-derive the curve) — its w20 comes from
  `W[20]` of whichever weight vector is being evaluated (default vs fitted differ in w20).
- Do NOT gate the fitted-beats-default inequality HERE — that is the recovery/null ORACLE of wave24-07.
  This task only proves the evaluator computes finite, formula-correct metrics for both vectors.
- Imports nothing from `lib/`; touches no product code.

## Next
- [x] Author evaluate.py (Scheduler replay → predict.retrievability → logloss/rmse), self-check anchors,
      run the smoke for default + fitted, capture output.
- (none — Goal met, verify.sh green.)

## Acceptance (evaluator reads these, no execution needed)
| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | imports predict + py-fsrs Scheduler, no local FSRS update loop | `scripts/fsrs-fit/evaluate.py` L37 `from fsrs import Card, Rating, Scheduler`, L39 `import predict`; state only READ (`card.stability`/`card.last_review`), advanced via `scheduler.review_card` (collect_predictions) — no local next-stability `def` |
| 2 | `--self-check` prints both frozen anchors, exits 0, no MISMATCH | `PREVERIFY-OUTPUT.txt` L2-3 `ok logloss single=0.105361` / `ok logloss triple=0.837769` |
| 3 | `--in/--out` writes default{logloss,rmse_bins,n_train,n_test} finite | `PREVERIFY-OUTPUT.txt` `ok eval default logloss=0.042467 rmse_bins=0.041465 n_test=7`; JSON schema-checked green by verify.sh |
| 4 | `--weights` adds fitted{} over SAME split (identical n_test) | verify.sh JSON assert `d["default"]["n_test"]==d["fitted"]["n_test"]` passed; both n_test=7 |
| 5 | chronological per-card split, ~20% held out | `ok split n_train=34 n_test=7` (round(0.2·41)=8 ≈ 7); split_test_count takes each card's LAST reviews only |
| 6 | captured verbatim into PREVERIFY-OUTPUT.txt (static-evidence header) | present, header `static evidence — read, do not run` |

Note: fitted == default metrics here because the py-fsrs Optimizer returns the DEFAULT
21-weight vector unchanged on this 41-review sample (insufficient data). Constraints require
only finiteness + identical n_test; the fitted-beats-default inequality is deferred to wave24-07.

## Log
- 2026-07-14 planner: task created.
- 2026-07-15 ClPcs-Mac-mini: authored `scripts/fsrs-fit/evaluate.py` — per-card chronological
  holdout split (`split_test_count`, last round(0.2·n) reviews, ≥1 train kept so every test
  review has a prior state), py-fsrs `Scheduler` (short-term off, no fuzz) replay to read
  S/last_review before each test review, `predict.retrievability(elapsed, S, w20)` for p,
  `y=rating≥2`; local `logloss`/`rmse_bins` (10 equal-width bins) only. `--self-check` hits both
  frozen anchors (0.105361 / 0.837769). Ran verify.sh → PASS wave24-04; captured to
  PREVERIFY-OUTPUT.txt. Confirmed the identical default/fitted metrics are the optimizer returning
  defaults on the tiny sample (not a wiring bug): default and fitted weight vectors are byte-equal.

## Verify
**Last verify:** PASS (2026-07-15T05:49:24Z)

## Evaluation
**Last evaluation:** PASS (2026-07-15T05:52:35Z)
