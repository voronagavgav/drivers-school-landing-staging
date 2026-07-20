# Task: wave24-02-retrievability-oracle-crosscheck

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-15
**Last compute:** mac-mini

ORACLE-FIRST — runs BEFORE the evaluator (wave24-04). The holdout evaluator reimplements the FSRS-6
retrievability (prediction) math in python. This task authors that math (`scripts/fsrs-fit/predict.py`)
and PINS it against our TS `retrievability` (`lib/fsrs/retrievability.ts`) — which is itself already
oracle-verified against py-fsrs 6.3.1 (wave19a `reference-vectors.test.ts`), so TS is the trusted
external anchor here (the gen-19a/20 cross-check discipline). No later task may loosen these vectors.

Spec: `specs/wave24-weightfit-harness.md` Deliverable 1 (cross-check half) + Holdout-eval design
("prediction math reimplemented in the python evaluator … cross-checked against our TS retrievability").

Depends on: wave24-01 (venv). Artifacts (ALL produced ✓):
- `scripts/fsrs-fit/predict.py` — FSRS-6 retrievability under an arbitrary w20 (the evaluator imports it). ✓
- `scripts/fsrs-fit/emit-ts-retrievability.ts` — prints the SAME grid via `@/lib/fsrs` `retrievability`. ✓
- `scripts/fsrs-fit/fixtures/retrievability-grid.json` — the frozen 6dp grid (25 rows, committed). ✓
- `tasks/wave24-02-retrievability-oracle-crosscheck/PREVERIFY-OUTPUT.txt` — captured cross-check stdout. ✓

## The math (external, from the FSRS-6 formulas — do NOT import TS into predict.py)
Retrievability under decay weight `w20`:
`R(t, S; w20) = (1 + FACTOR·t/S)^(-w20)` where `FACTOR = 0.9^(1/(-w20)) - 1` (= `0.9^(-1/w20) - 1`),
`t` = elapsedDays ≥ 0, `S` = stability > 0; `R = 1` when `t == 0` or S has no prior review.
Two EXACT construction anchors (independent of the numeric w20 value — a wrong FACTOR/DECAY fails them):
- `R(0, S; w20) == 1.000000` for all S, w20.
- `R(S, S; w20) == 0.900000` for all S, w20 (elapsed == stability ⇒ R = 0.9 by construction).

Frozen grid (w20 = FSRS_DEFAULT_WEIGHTS[20] = **0.1542**):
`stability ∈ {1, 10, 50, 100, 365}` × `elapsedDays ∈ {0, 1, 10, stability, 2·stability}`.
The `r` literals in `fixtures/retrievability-grid.json` are the TS `retrievability` output rounded to
6 decimal places (frozen from the trusted TS anchor, NOT hand-typed) — `emit-ts-retrievability.ts`
regenerates them and the values must be byte-stable on re-run.

## Goal
PASS = ALL true:

1. `scripts/fsrs-fit/predict.py` defines a `retrievability(t, S, w20)` (or equivalent) implementing the
   formula above from the FSRS-6 math; it does NOT import/shell out to any TS/JS (no `subprocess`,
   `tsx`, or `node ` on non-comment lines).
2. `scripts/fsrs-fit/predict.py --self-check` (run via the wave24-01 venv python) asserts the two EXACT
   anchors to ≤ 1e-9: `R(0,S;w20)=1` and `R(S,S;w20)=0.9` across the grid's S values and
   w20 ∈ {0.1542, 0.12, 0.20}; prints `ok anchor elapsed0 R=1` and `ok anchor elapsedS R=0.9`
   (no `FAIL`/`MISMATCH`), exits 0.
3. `scripts/fsrs-fit/fixtures/retrievability-grid.json` exists with 25 entries
   `{stability, elapsedDays, r}` (each `r` at 6dp); every `elapsedDays==0 ⇒ r==1.0` and every
   `elapsedDays==stability ⇒ r==0.9`.
4. `npx tsx --conditions=react-server scripts/fsrs-fit/emit-ts-retrievability.ts` re-emits the grid and
   its values equal `fixtures/retrievability-grid.json` to 6dp (byte-stable regeneration).
5. CROSS-CHECK: `predict.py` evaluated on the frozen grid (w20=0.1542) agrees with the TS-frozen `r`
   values to `max abs diff < 1e-6`; the check prints `ok crosscheck maxabsdiff=<v>` with v < 1e-6 and
   NO `MISMATCH`. Captured verbatim into `PREVERIFY-OUTPUT.txt` (header
   `static evidence — read, do not run`).
6. `npm run -s typecheck` exits 0 (emit-ts-retrievability.ts compiles; imports only from `@/lib/fsrs`).

## Constraints / decisions
- predict.py depends on python stdlib `math` only (no numpy needed for scalar retrievability) — keep it
  importable by the evaluator (wave24-04) without extra pins.
- `retrievability` must PARAMETRIZE on w20 (the evaluator scores predictions under BOTH the default and
  a FITTED weight vector whose w20 differs) — that is why the anchors are asserted across multiple w20.
- Do NOT edit `lib/fsrs/` — read `retrievability.ts`, mirror the formula. The gen-19a discipline
  applies: freeze from the trusted TS output, never regenerate the fixture from predict.py.
- Math oracle: the `## Acceptance` table maps each criterion → the produced file the static judge reads;
  expected values come from the FSRS-6 formula anchors + the TS-frozen grid, the Python is the checked side.

## Next
- [x] All 6 Goal criteria met; every criterion maps to a produced file in the Acceptance table.
- wave24-02 is COMPLETE. No further increment — the four deliverable files exist and verify.sh PASS.

## Acceptance
Each Goal criterion is confirmed by READING a produced file (no execution needed). Expected values come
from the FSRS-6 formula anchors (`R(0,S)=1`, `R(S,S)=0.9`) and the frozen TS grid. verify.sh regenerates
PREVERIFY-OUTPUT.txt from the venv python + TS emitter on every run, so its `ok …` lines are freshly
captured verbatim stdout:

| # | Criterion | Read this |
|---|-----------|-----------|
| 1 | predict.py pure-Python `retrievability(t,S,w20)`, no TS shell-out | `scripts/fsrs-fit/predict.py` (stdlib `math`/`json`/`sys`; verify.sh grep passes) |
| 2 | anchors `R(0,S)=1`, `R(S,S)=0.9` to ≤1e-9 across w20∈{0.1542,0.12,0.20} | PREVERIFY: `ok anchor elapsed0 R=1 maxabsdiff=0.0` + `ok anchor elapsedS R=0.9 maxabsdiff=0.0` |
| 3 | grid = 25 rows `{stability,elapsedDays,r}`@6dp, anchors hold | `fixtures/retrievability-grid.json` + PREVERIFY `ok grid points=25 anchors ok` |
| 4 | TS emitter re-emits the grid byte-stably | PREVERIFY `ok ts_regen maxabsdiff=0` (TS re-emit vs frozen fixture) |
| 5 | predict.py vs TS-frozen grid < 1e-6 | PREVERIFY `ok crosscheck maxabsdiff=4.779055293724355e-07` |
| 6 | typecheck exits 0 | PREVERIFY `ok typecheck exit=0` |

## Log
- 2026-07-14 planner: task created.
- 2026-07-15 ClPcs-Mac-mini: authored the four deliverables — `scripts/fsrs-fit/predict.py` (pure-Python
  FSRS-6 retrievability `R=(1+FACTOR·t/S)^(-w20)`, `FACTOR=0.9^(-1/w20)-1`, stdlib only,
  `--self-check`/`--crosscheck` modes), `emit-ts-retrievability.ts` (prints the 25-row grid via `@/lib/fsrs`
  `retrievability`), `fixtures/retrievability-grid.json` (frozen from the TS emitter, byte-stable re-emit),
  and `PREVERIFY-OUTPUT.txt` (verbatim `ok …` line per runnable criterion). Anchors 0.0/0.0; cross-check
  maxabsdiff=4.78e-7 (<1e-6); ts_regen 0; grid=25; typecheck exit 0. verify.sh → PASS. All 6 Goal criteria
  met; Acceptance table maps each to its produced file.

## Verify
**Last verify:** PASS (2026-07-15T05:38:22Z)

## Evaluation
**Last evaluation:** REJECT (2026-07-15T05:41:17Z)
Addressing this is the next increment. Reason:
(no VERDICT marker emitted — defaulting to REJECT) (3 consecutive marker-less judge runs — harness fault, task parked blocked)
