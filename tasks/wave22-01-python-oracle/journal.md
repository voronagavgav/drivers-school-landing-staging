# Task: wave22-01-python-oracle

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-14
**Last compute:** mac-mini

**Artifacts:** `scripts/oracles/gen-wave22-oracles.py` (the reference oracle),
`tasks/wave22-01-python-oracle/PREVERIFY-OUTPUT.txt` (captured stdout — static-judge evidence).

ORACLE-AUTHORING — the FIRST task of wave22; runs BEFORE any TypeScript. Deliverable: a committed,
network-free, **stdlib-only** (`import math`, `import sys` only) reference script
`scripts/oracles/gen-wave22-oracles.py` that INDEPENDENTLY re-encodes (from `specs/wave22-elo-difficulty.md`
Design + Deliverable 1, NOT by importing/shelling out to any TS/JS) the Elo/Rasch item-difficulty
estimator and freezes properties (a)–(f). It prints a `PREVERIFY-OUTPUT.txt`-style stdout so the
static evaluator READS a file rather than running anything.

Source of the model (frozen here; later tasks may NOT edit these values):
- `specs/wave22-elo-difficulty.md` (Goal + Design + Deliverable 1 (a)–(f)).
- Research binding: Pelánek 2016 (Elo for CAP), Prowise Learn uncertainty-adaptive K.

## The model (frozen here — re-encode from the spec, do NOT import TS)
Logit-space Rasch/Elo. Initial `β=0`, `θ=0`.
- **Guess floor**: `g = min(1/optionCount, ELO_GUESS_MAX)` where `ELO_GUESS_MAX = 0.45` (the SAME
  numeric value as `FSRS_GUESS_MAX`; the TS side REUSES `FSRS_GUESS_MAX` per spec — do NOT redeclare).
- **Predicted probability (guess-adjusted, 3PL-lite)**: `P = g + (1 − g)·sigmoid(θ − β)`,
  `sigmoid(x) = 1/(1+exp(−x))`.
- **Plain (no-guess) probability** (frozen alongside for audit): `P_plain = sigmoid(θ − β)`.
- **Uncertainty-adaptive K**: `K(n) = ELO_K_MAX / (1 + n/ELO_K_HALFLIFE)`, separate item counter
  `n_i` and user counter `n_u`. **Pin `ELO_K_MAX = 0.4`, `ELO_K_HALFLIFE = 20`** (logit-space step;
  these are the wave22 pinned constants — task 02 copies them verbatim).
- **Single update** (after a first-attempt answer `y∈{0,1}`):
  - error `e = y − P` (guess-adjusted `P` for the guess-adjusted update; `y − P_plain` for the plain).
  - `θ' = θ + K(n_u)·e`, `β' = β − K(n_i)·e`.
  - THEN increment `n_u += 1`, `n_i += 1` — counters used in the CURRENT step are the PRE-increment
    values, so a brand-new item/user uses `K(0)=ELO_K_MAX`.
- **foldEloStream**: consume answers in the GIVEN order (the server sorts by `answeredAt` ASC, id ASC
  — the fold itself is order-as-given). For each `{userId, questionId, correct, optionCount}`: look up
  current `θ_user`/`β_item` (default 0) and counters (default 0), apply the guess-adjusted single
  update, store back. Return `items: {qid → {beta, n}}`, `users: {uid → {theta, n}}`.

## Goal
PASS = ALL true:

1. `scripts/oracles/gen-wave22-oracles.py` exists; `python3 scripts/oracles/gen-wave22-oracles.py`
   exits 0 using ONLY the stdlib (`math`, `sys`); the file header NAMES `specs/wave22-elo-difficulty.md`
   and contains verbatim the string `reference oracle — the TS impl MUST match this; never regenerate these values from TS`.
2. The script prints, and `verify.sh` captures into `tasks/wave22-01-python-oracle/PREVERIFY-OUTPUT.txt`,
   a labelled `ok <token> got=X exp=X`-style line for every frozen quantity in criteria 3–9, with a
   header line containing `static evidence — read, do not run`. No printed line contains the substrings
   `MISMATCH`, `not ok`, or `FAIL`.
3. **(a) single-update grid, guess-adjusted** — for the fixed grid θ∈{−1,0,1}, β∈{−1,0,1}, y∈{0,1},
   g∈{0.2,0.45}, K taken at schedule points n∈{0,10,200}, the script prints `β'` and `θ'` to 6dp for
   each combination (a deterministic nested loop; ≥ 3·3·2·2·3 = 108 lines), each labelled e.g.
   `ok upd_g th=0_be=0_y=1_g0.20_n0 beta=<6dp> theta=<6dp>`.
4. **(a′) plain-vs-guess single-update contrast** — for θ=0,β=0,y=1,K=K(0)=0.4: print BOTH the plain
   update (`P_plain=0.5` → `e=0.5` → `β'=−0.2`, `θ'=+0.2`) and the guess-adjusted update at g=0.2
   (`P=0.2+0.8·0.5=0.6` → `e=0.4` → `β'=−0.16`, `θ'=+0.16`) — literal frozen values to 6dp:
   `beta_plain=-0.200000 theta_plain=0.200000`, `beta_g020=-0.160000 theta_g020=0.160000`.
5. **(a″) K-schedule points** — `K(0)=0.400000`, `K(10)=ELO_K_MAX/(1+10/20)=0.266667`,
   `K(200)=ELO_K_MAX/(1+200/20)=0.036364`, each to 6dp, monotone DECREASING (`K(0)>K(10)>K(200)`).
6. **(b) fold determinism** — a FIXED 40-answer synthetic stream (hard-coded in the script; e.g. 5
   users × 8 items, deterministic pattern, no rng) folded once → the EXACT final `β` and `n` for
   every item and `θ`/`n` for every user, all `β`/`θ` to 6dp. These are the golden maps later TS tasks
   freeze against.
7. **(c) order sensitivity** — the SAME 40-answer multiset SHUFFLED by a fixed permutation folds to a
   DIFFERENT final β for at least one item; the script prints the two β values for that item and a
   `ok order_sensitive differs=true` line (asserts `abs(beta_sorted − beta_shuffled) > 1e-6`). This
   documents WHY the server orders by answeredAt+id — determinism is the guarantee, not order-invariance.
8. **(d) convergence direction** — a constructed stream where item X is answered WRONG repeatedly by
   high-θ users (θ pumped up first via easy correct answers) ends with `β_X > mean(β over all items)`;
   symmetric easy item Y ends `β_Y < mean`. Print `ok converge_hard beta_X=<6dp> mean=<6dp> gt=true`
   and `ok converge_easy beta_Y=<6dp> lt=true`.
9. **(e) guess-adjustment direction** — two identical streams differing ONLY in optionCount (2 vs 5),
   the same item answered CORRECT by the same user sequence: the 2-option item's β moves LESS (smaller
   magnitude decrease from 0) than the 5-option item's. Print `ok guess_weakens delta2=<6dp>
   delta5=<6dp> lt=true` where `abs(delta2) < abs(delta5)` (2-option correct is weaker evidence because
   g=0.45 makes P higher → smaller e). **(f) K decay**: also print the first three `|Δβ|` for one
   repeatedly-answered item and assert they are monotone non-increasing (`ok k_decay monotone=true`).

## Constraints / decisions
- STDLIB ONLY (`math`, `sys`). No numpy, no rng — build synthetic streams deterministically.
- Numbers frozen from the SPEC's formulas, never from the TS impl (which does not exist yet).
- The pinned constants `ELO_K_MAX=0.4`, `ELO_K_HALFLIFE=20`, `ELO_GUESS_MAX=0.45`,
  `ELO_MIN_ITEM_ANSWERS=200`, init β=0/θ=0 are DECIDED here and copied by task 02; if a value is
  refined, update this journal + task 02 together.
- Non-goal: no per-user θ persistence math, no IRT 2PL/3PL, no distractor modeling.
- Evaluator reads `PREVERIFY-OUTPUT.txt` (static evidence); it does NOT run the script.

## Acceptance (evaluator reads these — no execution needed)
Maps each Goal criterion → the concrete file+anchor the judge READS in
`tasks/wave22-01-python-oracle/PREVERIFY-OUTPUT.txt` (captured stdout; header line 1
`static evidence — read, do not run`). `verify.sh` green; no oracle-tampering — every frozen number
is derived from the SPEC's formulas inside `gen-wave22-oracles.py`, not from any TS (which does not
exist yet).

| Goal | Where the judge reads it |
|------|--------------------------|
| 1 script exists, stdlib-only, header names spec + covenant | `scripts/oracles/gen-wave22-oracles.py` L1–36 (docstring names `specs/wave22-elo-difficulty.md` + verbatim `reference oracle — the TS impl MUST match this; never regenerate these values from TS`); imports L21–22 = `math`,`sys` only |
| 2 clean captured stdout, evidence header, no MISMATCH/not ok/FAIL | PREVERIFY-OUTPUT.txt L1 header + whole file (no failure marker); `RESULT: ALL 12 PROPERTY CHECKS PASSED` |
| 3 (a) 108-line guess-adjusted grid | PREVERIFY-OUTPUT.txt `ok upd_g …` lines (exactly 108) |
| 4 (a′) plain-vs-guess literals | `ok a_prime beta_plain=-0.200000 theta_plain=0.200000 beta_g020=-0.160000 theta_g020=0.160000` |
| 5 (a″) K schedule monotone | `ok k_schedule K(0)=0.400000 K(10)=0.266667 K(200)=0.036364 decreasing=true` |
| 6 (b) fold determinism golden maps | `ok fold_item q0..q7 …` + `ok fold_user u0..u4 …` (final β/θ/n to 6dp) |
| 7 (c) order sensitivity | `ok order_sensitive differs=true item=q0 beta_sorted=0.040006 beta_shuffled=-0.033619` |
| 8 (d) convergence direction | `ok converge_hard … gt=true` + `ok converge_easy … lt=true` |
| 9 (e)+(f) guess weakens + K decay | `ok guess_weakens delta2=-0.454524 delta5=-0.632620 lt=true` + `ok k_decay monotone=true deltas=0.160000,0.140216,0.123783` |

## Log
- 2026-07-14 ClPcs-Mac-mini — Wrote `scripts/oracles/gen-wave22-oracles.py` (stdlib-only) re-encoding
  the frozen Elo/Rasch estimator from `specs/wave22-elo-difficulty.md` (§Design): `sigmoid`, `k_at`,
  `guess_floor`, `predict`(3PL-lite)/`predict_plain`, `elo_update` (pre-increment counters),
  `fold_elo_stream` (order-as-given). Emits all (a)–(f): 108-line guess grid, a′/a″ literals, fixed
  40-answer fold (5u×8i) golden maps, order sensitivity, convergence, guess-adjustment, K-decay.
  Two fixes: (1) my first "shuffle" (item-outer re-block) provably left β INVARIANT — it preserved
  BOTH the per-item user-order AND per-user item-order, so each user's θ when hitting an item was
  identical → identical β; switched to a genuine REVERSAL of the sorted stream (differs=true, first
  diff at q0 |Δβ|=0.074). (2) verify anchors `order_sensitive differs=true` / `k_decay monotone=true`
  must be CONTIGUOUS substrings — reordered the prints so the boolean follows the label immediately.
  `bash tasks/wave22-01-python-oracle/verify.sh` → `PASS: wave22-01`. Captured
  `PREVERIFY-OUTPUT.txt` (12 checks, all pass). Status → done.

## Next
- [x] Write `scripts/oracles/gen-wave22-oracles.py` implementing the frozen model + (a)–(f) prints.
- Task complete — hand off the golden maps to wave22-03 (TS oracle test) / wave22-04 (lib/elo.ts).

## Verify
**Last verify:** PASS (2026-07-14T11:17:37Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T11:20:24Z)
