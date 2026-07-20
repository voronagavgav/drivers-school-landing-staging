# CLAUDE.md — scripts/fsrs-fit/ (offline FSRS-6 weight-fit harness, wave24)

Auto-loaded when working here. Python venv is git-ignored (`.venv/`, wave24-01); use
`scripts/fsrs-fit/.venv/bin/python` (Python 3.14, pins: fsrs==6.3.1 + torch/numpy/pandas/tqdm).
NETWORK only in setup; the fit/eval run offline.

## Learnings (agent-maintained)
- NO-SHELL-OUT GREP vs Python DOCSTRINGS (wave24-02): the per-task verify.sh asserts the python
  doesn't shell out to TS/JS with `grep -nE '^[^#]*(subprocess|tsx|\bnode )' file.py`. `^[^#]*`
  can't cross a `#`, so FULL-LINE `#` comments are safe — but a triple-quoted MODULE DOCSTRING's
  lines do NOT start with `#`, so writing `tsx`/`node `/`subprocess` inside a docstring (or any
  non-`#` line) FALSE-TRIPS the gate as if the code shelled out. Keep those tokens ONLY on
  `#`-prefixed comment lines, or avoid them (say "TS engine"/"pure-Python", not "no tsx/node").
- ORACLE DIRECTION (wave24-02): the TS `retrievability` (`@/lib/fsrs`, oracle-verified vs py-fsrs
  6.3.1 in wave19a) is the TRUSTED anchor — `emit-ts-retrievability.ts` FREEZES the fixture grid,
  `predict.py` is the independent Python re-derivation cross-checked AGAINST it (never regenerate the
  fixture from predict.py). FSRS-6 retrievability: `R=(1+FACTOR·t/S)^(-w20)`,
  `FACTOR=0.9^(-1/w20)-1`; R=1 at t=0, R=0.9 EXACTLY at t=S for any w20 (construction anchors).
  Full-precision Python vs the 6dp-frozen TS grid agrees to maxabsdiff≈4.8e-7 (< 1e-6).
- PY-FSRS 6.3.1 OPTIMIZER API (wave24-03, confirmed via venv introspection — the fitter's external
  canon): `Optimizer(review_logs: list[ReviewLog])` then `.compute_optimal_parameters(verbose=False)`
  → `list[float]` of EXACTLY 21 weights (the shipped default w20 sits at index 20). `ReviewLog(card_id:
  int, rating: Rating, review_datetime: datetime, review_duration: int|None)`; `Rating` enum = 1..4
  (Again/Hard/Good/Easy). Pass tz-aware UTC datetimes, grouped+ascending per card. NEVER hand-roll the
  fit — `fit.py` only adapts CSV→ReviewLog and serialises the optimizer's output. `fsrs.__version__` is
  NOT exposed (the `__init__.__getattr__` only lazy-loads `Optimizer`) — read the version via
  `importlib.metadata.version('fsrs')` (same trap wave24-01 hit). The torch-backed fit was empirically
  STABLE on this host (re-running the same CSV reproduced identical weights), but constraints only assert
  shape/finiteness here; the recovery oracle lives in wave24-07.
- PY-FSRS 6.3.1 SCHEDULER REPLAY (wave24-04, `evaluate.py`): to reconstruct memory state under a
  weight vector, build `Scheduler(parameters=W, learning_steps=(), relearning_steps=(),
  enable_fuzzing=False)` (empty steps = shipped LONG-TERM engine, card graduates straight to Review
  on the first review; no fuzz = deterministic) and drive `card, _ = scheduler.review_card(card,
  Rating, review_datetime=dt)` per review in time order. Between reviews READ `card.stability` and
  `card.last_review` (tz-aware) directly — that IS the state immediately before the next review, so
  `elapsed_days=(dt-card.last_review).total_seconds()/86400`, `p=predict.retrievability(elapsed, S,
  W[20])`. `Scheduler().parameters` (no args) yields the 21-weight FSRS-6 DEFAULT vector (w20 at [20]);
  never hand-copy the literal. Card's first review has no prior state, so a holdout split must keep ≥1
  train review per card (test = its last reviews only). NOTE the py-fsrs Optimizer returns the DEFAULT
  vector UNCHANGED on a tiny sample (~41 reviews) — so a default-vs-fitted eval can show byte-identical
  metrics; that's insufficient-data behaviour, not a wiring bug (the recovery oracle is wave24-07).
- WEIGHT-INJECTABLE ENGINE (wave24-06, `param-engine.ts`): `scheduleW(state, grade, now, weights?,
  retention?)` + `retrievabilityW(state, now, w20)` + `intervalDaysW(S, retention, w20)` are the pure
  weight-parametrized MIRROR of `lib/fsrs` schedule/retrievability — the generator (wave24-07) drives
  THIS, never py-fsrs, so recovery-with-py-fsrs is a genuine external oracle. Formulas are byte-for-byte
  the shipped FSRS-6 with every `w[i]`→`weights[i]`; `FSRS_DEFAULT_WEIGHTS`/`FSRS_TARGET_RETENTION` are
  imported ONLY as default args (never read mid-formula). The oracle (`param-engine.oracle.test.ts`,
  collected by `npm test` since vitest include is `**/*.test.ts`) pins `scheduleW(default)`===`schedule()`
  ≤1e-9 + external ts-fsrs/py-fsrs golden literals, so any drift from the shipped engine reds. Do NOT
  reimplement the DSR math in wave24-07 — import `scheduleW`/`retrievabilityW`. Shared PERTURBATION
  convention: default vector with `w8×1.2, w11×1.2, w20×1.2` (recall-growth base / lapse base / decay).
- W20 IDENTIFIABILITY DEGENERACY (wave24-08 — RESOLVED 2026-07-15, kept for the mechanism): the original
  `gen-synthetic.ts` reviews every card at `dueAt ± 15%` where the interval targets retention R=0.9, so
  EVERY review lands at R≈0.9 (measured recall 0.908 for BOTH default and perturbed populations). With
  no spread on the retrievability axis the forgetting-curve decay `w20` is UNIDENTIFIABLE — the
  perturbation only changes interval LENGTHS, which the fit absorbs into stability S, so the `(S, w20)`
  pair is degenerate and the py-fsrs Optimizer clamps `w20` to its 0.1 lower boundary for BOTH populations
  (default AND perturbed). Confirmed structural, not sampling noise: `w20` stays pinned at 0.1 from 200 →
  2000 reviews/user (60k reviews). Consequence: RECOVERY(ii) `fitted_w20 > 0.1542` and a MEANINGFUL CURVE
  sharpening CANNOT pass — only `w8`/`w11` (recall-growth/lapse base) recover (identifiable from R≈0.9
  data), so RECOVERY(i) log-loss + NULL DO pass. THE FIX THAT SHIPPED (three parts, all justified in
  tasks/wave24-08-validation-run/FINDINGS.md): (1) OVERDUE SPREAD in gen-synthetic.ts — 35% of reviews
  log-uniform 1.5–120× past due (the curve is a FLAT power law: R≈0.74 at 6× late, R≈0.5 needs ~90× — small
  multipliers do NOT sample the tail); (2) 1-year interval cap + finite-dueAt guard (far-overdue SUCCESS
  streaks compound S past the JS Date range → NaN rows on some seeds); (3) CARDS 20→200 in run-validation.ts
  — REALISM, not the remedy (wave24-review correction): the R≈1 absorbing-state logloss~0.0002 degeneracy
  was a PRE-SPREAD artifact (interval-cap-only generator); with the spread, 20 cards recover w20 fine
  (review re-ran: 0.1799). 200 cards kept because ~10 reviews/card = the real-app young-card regime. REJECTED alternative: 5% slip
  noise — FSRS can't represent label noise, the fit chases 0.95·R and loses w20 direction entirely. NULL gate
  is now RELATIVE (null_improvement ≤ max(0.005, 0.35·recovery_improvement)): default-generated logs carry a
  REAL seed-stable ~0.002–0.006 in-population adaptation ({Again,Good}-only ratings ≠ the Anki corpus), so an
  absolute 0.005 sat inside the band; flattery inflates both improvements alike (ratio→1) while genuine
  recovery measured 0.22. Final numbers: recovery logloss 0.206→0.178, fitted w20 0.173 (true 0.185), curve
  err 0.066@200→0.012@2000 ⇒ REAL-USER DATA GATE ≈ ≥1000 reviews/user for full-vector fits, and check the
  user's retrievability SPREAD (an always-on-time reviewer is w20-unidentifiable too), not just count. run-validation.ts uses
  `import.meta.url`→`fileURLToPath` to locate `.venv/bin/python` + the two `.py` scripts, `spawnSync`s
  fit/evaluate, and needs `--conditions=react-server` (it imports `FSRS_DEFAULT_WEIGHTS` from `@/lib/fsrs`).
- Run the TS emitter with `npx tsx --conditions=react-server` (resolves the `server-only` `exports`
  condition in the `@/lib/fsrs` import graph); it's deterministic (no clock/RNG) so re-emission is
  byte-identical → the committed fixture regenerates byte-stably.
- SYNTHETIC GENERATOR (wave24-07, `gen-synthetic.ts`): `generate(config)` → `{card_id, review_time,
  review_rating}[]`; `perturbedWeights()` = default with w8/w11/w20 ×1.2; `toCsv()` + CLI
  (`--seed --users --cards --reviews --weights default|perturbed --out`). Seeded Numerical-Recipes LCG
  (`a=1664525,c=1013904223,m=2^32` via `Math.imul(a,s)+c >>> 0`, `/2^32`) is the ONLY randomness; Dates
  built via `Reflect.construct(Date,[ms])` from a fixed BASE (`Date.UTC(2026,0,1)`), never the wall
  clock. **card_id = `user*cards + cardIndex`** (globally-unique INT — `fit.py` does `int(card_id)`).
  Due-driven cadence: review the earliest-`nextAt` card, `recalled = lcg.next() < retrievabilityW(...)`,
  `rating = recalled?3:1`, `nextAt = dueAt ± 15% jitter` (floored `now+60s`); loop to an EXACT per-user
  `reviews` target (so all users get identical counts — regime band [300,1500] is trivially met). Two
  facts wave24-08 needs: (1) a `new` card's FIRST review is ALWAYS Good (R=1 by construction, `u<1`
  always), so default vs perturbed share the first row per card; (2) they still DIVERGE from the first
  dueAt onward because w20 flows into `intervalDaysW` — the perturbation changes recall AND cadence.
  Purity-comment trap: verify.sh `grep -nE 'Math\.random'` matches the token in DOC COMMENTS too — never
  write the literal `Math.random` in a comment (say "ambient RNG").
