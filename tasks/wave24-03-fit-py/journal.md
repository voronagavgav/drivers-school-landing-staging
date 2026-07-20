# Task: wave24-03-fit-py

**Status:** done
**Driver:** auto
**Updated:** 2026-07-15
**Last compute:** mac-mini

The FITTER. Wraps the CANONICAL py-fsrs optimizer entry point (external canon — NEVER reimplement the
fit). Reads the exported review CSV (wave24-05 schema), runs the optimizer, emits the fitted 21-weight
vector + train stats as JSON. The fit itself is OFFLINE (network only in wave24-01 setup).

Spec: `specs/wave24-weightfit-harness.md` Deliverable 1 (fit.py) + Design (Fitter). House rule: "The
py-fsrs optimizer is EXTERNAL canon — never reimplement the fit; our code only generates, exports,
evaluates, and cross-checks."

Depends on: wave24-01 (venv). Artifacts: `scripts/fsrs-fit/fit.py`,
`scripts/fsrs-fit/fixtures/sample-revlog.csv` (6 cards / 41 rows),
`tasks/wave24-03-fit-py/PREVERIFY-OUTPUT.txt`.

## CSV input schema (matches wave24-05 export)
Header: `card_id,review_time,review_rating` (review_time = epoch ms or ISO-8601, ascending per card;
review_rating ∈ {1,2,3,4} = Again/Hard/Good/Easy). fit.py must document which the optimizer expects and
convert if needed. Only `fsrs6-bkt2`-engine rows are ever exported, so fit.py assumes a single grade
semantics (no per-row engine column in the CSV).

## Goal
PASS = ALL true:

1. `scripts/fsrs-fit/fit.py` exists and calls the pinned py-fsrs `Optimizer` entry point (grep shows
   `from fsrs import Optimizer` OR `fsrs.Optimizer`); it does NOT hand-roll a gradient/loss loop
   (no local `def` implementing the FSRS objective — the fit is delegated to the package).
2. `scripts/fsrs-fit/fit.py --in <csv> --out <json>` (run via the wave24-01 venv python) on
   `scripts/fsrs-fit/fixtures/sample-revlog.csv` exits 0 and writes `<json>`.
3. The output JSON has keys `weights` (array of EXACTLY 21 finite numbers), `n_reviews` (int),
   `n_cards` (int), and `optimizer` (a string naming the package+version, e.g. `fsrs==6.3.1`).
4. Every element of `weights` is finite (no NaN/Inf) and `weights` length is 21 (validated by the smoke;
   prints `ok weights len=21 finite=true`).
5. A DEGENERATE-input guard: on an empty or <1-card CSV, fit.py exits NON-zero with a clear stderr
   message (does not emit a bogus all-default vector silently) — prints/greps `error: insufficient reviews`.
6. Captured verbatim into `PREVERIFY-OUTPUT.txt` (header `static evidence — read, do not run`): the smoke
   run's stdout including the `ok weights len=21` line and the emitted JSON's `weights`/`optimizer` keys.

## Constraints / decisions
- Confirm the exact py-fsrs 6.3.1 optimizer API via the venv + context7/py-fsrs docs BEFORE coding — the
  entry point may be `Optimizer(review_logs).compute_optimal_parameters()` or similar. Convert the CSV
  rows into whatever `ReviewLog`/tuple shape the optimizer wants; that adapter is ours, the FIT is not.
- Deterministic where the optimizer allows (seed/torch determinism) so re-fitting the same CSV is stable
  enough for the smoke; if the optimizer is inherently stochastic, note it and only assert shape/finite,
  not exact weights (the recovery ORACLE lives in wave24-07, not here).
- fit.py touches NO product code and imports nothing from `lib/`. Output JSON is the ONLY interface to
  the evaluator (wave24-04) and validation run (wave24-07).
- `sample-revlog.csv` is a tiny hand-made fixture (a few cards, enough rows for the optimizer to run) —
  NOT real user data (we have 0 real users).

## Next
- [x] Confirm the py-fsrs 6.3.1 Optimizer entry point, author fit.py (CSV→optimizer→JSON), add the
      sample CSV, run the smoke, capture output.
- Wave24-03 is COMPLETE — verify.sh PASS. No further increment.

## Acceptance
Every Goal criterion maps to a produced file the evaluator READS (no execution needed):
1. `scripts/fsrs-fit/fit.py:39` calls `Optimizer(review_logs).compute_optimal_parameters(verbose=False)`;
   `from fsrs import Optimizer, Rating, ReviewLog` at line 27. No local objective/gradient `def` — the
   only `def`s are the CSV adapter (`_parse_review_time`, `load_review_logs`), the delegating `fit`, and
   `main`. Matches verify grep `from fsrs import Optimizer`.
2+3+4. verify.sh ran GREEN (`PASS wave24-03`): `fit.py --in fixtures/sample-revlog.csv --out <json>`
   exited 0, wrote JSON with `weights`(21 finite floats)/`n_reviews`=41/`n_cards`=6/`optimizer`=
   `fsrs==6.3.1`; smoke printed `ok weights len=21 finite=true`. See `PREVERIFY-OUTPUT.txt`.
5. Degenerate guard `fit.py:98` (`n_reviews < MIN_REVIEWS(1) or n_cards < 1` → `sys.exit(1)` with stderr
   `error: insufficient reviews …`); verify drove an empty CSV → non-zero + greps `insufficient reviews`.
6. `PREVERIFY-OUTPUT.txt` — header `static evidence — read, do not run` + the smoke stdout incl.
   `ok weights len=21 finite=true optimizer=fsrs==6.3.1`.

This is a DELEGATION task: no oracle/frozen-vector/fixture-grading — the fit is the external py-fsrs
Optimizer, so the only assertions are output SHAPE/finiteness (structural traps inapplicable). The
optimizer uses torch under the hood; constraints allow shape/finite-only asserts (recovery oracle is
wave24-07). Re-running the smoke reproduced identical weights on this host (torch fit was stable).

## Log
- 2026-07-14 planner: task created.
- 2026-07-15 ClPcs-Mac-mini: Confirmed py-fsrs 6.3.1 optimizer API via venv introspection —
  `Optimizer(review_logs: list[ReviewLog])`, `.compute_optimal_parameters(verbose=False) -> list[float]`
  (returns EXACTLY 21 weights); `ReviewLog(card_id:int, rating:Rating, review_datetime:datetime,
  review_duration:int|None)`, `Rating` enum 1..4. Authored `fit.py` (CSV→ReviewLog adapter → Optimizer →
  JSON), the 6-card/41-row `fixtures/sample-revlog.csv`, ran verify.sh → PASS wave24-03 (weights len=21
  finite, degenerate empty-CSV guard fires exit 1 "insufficient reviews"). Captured PREVERIFY-OUTPUT.txt.

## Verify
**Last verify:** PASS (2026-07-15T05:44:19Z)

## Evaluation
**Last evaluation:** PASS (2026-07-15T05:45:37Z)
