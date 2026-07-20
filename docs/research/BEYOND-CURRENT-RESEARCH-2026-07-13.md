# Beyond-current improvements survey (deep-research, 2026-07-13)

Adversarially verified web research (22 sources → 101 claims → 25 verified 3-vote → 21 confirmed,
4 refuted). Workflow `wf_17d46edc-6d6`. This is the FORWARD backlog input — separate from the
wave20 defect track. Confidence labels are the harness's post-verification ratings.

## Top-3 by leverage-per-complexity

### 1. Elo-based per-item difficulty (HIGH confidence — highest leverage/complexity)
Fixes uniform `difficulty=1`. Under ADAPTIVE item selection (our queue), naive %-correct FAILS to
recover item difficulty (correlation ~0, doesn't improve with more students) while Elo matches
joint-max-likelihood IRT quality with trivial online updates (Pelánek 2016, Computers & Education).
~200 answers/item → reliable difficulty; ~10 answers/student → skill r≈0.8 (simulated, Rasch
assumptions). Prowise Learn proves production Elo-CAP at 160k items / 1M daily responses. Avoid
full 3PL IRT at our scale (short tests <25–40 items bias estimates; the "needs ~3000 respondents"
claim was REFUTED — don't cite it). Feeds: FSRS initial difficulty, per-item guess/slip, queue
ordering.

### 2. Per-user FSRS weight fitting (HIGH confidence)
srs-benchmark (~10k collections, ~350M reviews): FSRS-7 default log-loss 0.3629 vs optimized
0.3437 (~0.019 absolute; RMSE(bins) 0.0910→0.0655, ~28% relative). Default weights are MEDIANS of
20k collections ⇒ by construction ~half of users sit off their retention target. Anki 24.06+
removed the optimizer's minimum review count (24.04: 400; older: 1000) — so 200–2000-review
exam-prep users are fittable. Our ReviewLog already captures everything needed. OPEN: no verified
source quantifies fitted-vs-default at LOW counts/short horizons — needs our own holdout eval
before shipping. (Also REFUTED: "optimizer discards same-day reviews" — don't design around that.)

### 3. Exam-date-aware review allocation (MEDIUM confidence — GENUINE WHITE SPACE)
Nobody found in the literature maximizes blueprint-weighted P(pass) at a fixed calendar date — the
thing our readiness model already computes. Proven building blocks: SSP-MMC (KDD 2022, MaiMemo
220M reviews) reformulates SR as stochastic-shortest-path minimizing review cost to a target
memory state — saves 12.6% study time vs the THRESHOLD (fixed-retrievability, FSRS-family)
baseline; sibling TKDE 2023 paper: 64% recall-prediction-error / 17% cost reduction. MEMORIZE
(PNAS 2019): optimal review intensity is CLOSED-FORM u*(t)=q^(-1/2)·(1−m(t)) — trivially cheap —
but optimizes indefinite retention, no date term. LECTOR (arXiv 2025): exam-success objective
validated but +2.0% relative over SSP-MMC, simulation-only. THE OPPORTUNITY (explicitly a
speculative synthesis — components proven, combination unpublished): greedy marginal-gain
allocator ranking items by d[P(pass at exam date)]/d[review], objective = our stratified
Poisson-binomial dial, dynamics = FSRS-6 retrievability projections. Caveats: all effect sizes
simulation-based; SSP-MMC's 12.6% is vs a weaker retrievability estimator than FSRS-6, so the
marginal gain on top of FSRS is likely smaller.

## Confirmed but DEFER

- **Distractor/option tracing** (HIGH): which-wrong-option demonstrably carries learner-model
  signal (Li et al. JLA 2025, five DKT models converted to option-tracing; lineage Ghosh AIED
  2021) — but proven at MILLION-record K-12 scale. Action NOW: log the chosen option
  (ReviewLog lacks selectedOptionId — TestAnswer has it, join suffices? verify before adding a
  column); model LATER.
- **Neural/ensemble knowledge tracing** (HIGH): DEFER INDEFINITELY. FSRS-6 (21p) 0.3460 log-loss,
  FSRS-7-recency (35p) 0.3414; RWKV-P 0.2773 (~20% better) but 2.76M params (~130,000×),
  population-trained on a non-comparable protocol. Tuned FSRS is the right ceiling at our scale.
  (REFUTED: the small-margin GRU/LSTM numbers; also "FSRS-7 declared final" 1-2.)
- **Learner clustering / AFM mixtures** (HIGH): dead end for scheduling — Duolingo EDM 2015:
  mixture beats plain AFM by ~1% log-loss and the model class can't represent spacing at all.

## Holes the survey did NOT close (zero claims survived verification)

- **Question D — signals beyond correctness** (response-time models, confidence-elicitation
  frequency/UI-cost, answer-changing): nothing survived. Do NOT treat as "literature is empty" —
  re-research or pilot with own data.
- **Question F — pedagogy** (interleaving vs blocking, retrieval format, pretesting, feedback
  timing, mock-exam spacing, test-anxiety interventions with pass-rate effects): nothing survived.
  Sources were fetched (Brunmair & Richter 2019 interleaving meta-analysis; Rowland 2014 testing
  effect) but claims died in verification — a targeted re-run could recover these.

## Refuted — never cite

1. GRU/LSTM-vs-FSRS "small margin" numbers (0-3).
2. "FSRS optimizer uses only first review per day / discards same-day reviews" (0-3).
3. "3PL needs ~3000 respondents minimum" (0-3).
4. "FSRS-7 declared final version, no major releases planned" (1-2).

## Key sources
srs-benchmark (open-spaced-repetition) · fsrs4anki tutorial · Pelánek 2016 C&E (Elo) · Prowise
Learn 2025 (CAEAI) · Li et al. 2025 JLA (option tracing) · Streeter EDM 2015 (Duolingo AFM
mixture) · SSP-MMC KDD 2022 + TKDE 2023 + SSP-MMC-FSRS repo · MEMORIZE PNAS 2019 · LECTOR arXiv
2508.03275 · expertium.github.io/Benchmark.html.

## Orchestrator notes (mine, not the harness's)
- The white-space item (#3) composes DIRECTLY with what we built in waves 19d/19e: the dial is the
  objective function; `releaseDial` + `retrievability` give the dynamics. A simulation-first spike
  (pure TS, frozen oracles, no product surface) can measure the pass-rate lift on synthetic
  students before any UI commitment.
- #1 (Elo) needs population answer volume we don't have yet (~200/item × 2322 items) — but the
  ESTIMATOR can ship early and converge as data arrives (it's online); gate the CONSUMERS
  (difficulty→FSRS/queue) on per-item sample thresholds.
- #2 (weight fitting) is gated on real ReviewLog volume (today: 44 rows) — build the offline
  fit+holdout harness when real users exist.
- Question D/F holes matter for the wave20 defect track too (latency/confidence caps) — the
  mechanism research (wf_d1eda549-afc, still running) partially overlaps D.
