# SIGNAL — Wave 23: exam-date review-allocator SPIKE (sim-first, NO product surface)

Source: `docs/research/BEYOND-CURRENT-RESEARCH-2026-07-13.md` finding #7 (medium confidence,
flagged WHITE SPACE): no published system schedules reviews to maximize blueprint-weighted P(pass)
at a fixed calendar date — the objective our readiness dial already computes. Proven components:
SSP-MMC (cost-to-target-state minimization, 12.6% time savings vs threshold scheduling,
simulation); MEMORIZE (closed-form optimal intensity, but indefinite-retention objective); LECTOR
(exam-success objective validated, +2.0% relative, simulation-only). The COMBINATION is unpublished
— so this wave is a MEASUREMENT SPIKE: build the pure allocator + an honest simulation, measure the
lift, and produce a GO/NO-GO report. No learner-facing change; product wiring is a future wave
gated on the measured lift.

## Goal
Answer ONE question with committed evidence: at equal review budget, how much does greedy
marginal-gain allocation (rank candidate reviews by d[P(pass at exam date)]/d[review]) improve
simulated exam-day pass probability over the CURRENT queue policy, across student profiles and
horizons? Decision gate for a future product wave: mean lift ≥ 2 percentage points of pass-prob on
the below-threshold population (the students the app exists for) with no profile harmed by >0.5pp.

## Design (settled shape)
- **Objective**: reuse the REAL dial machinery — `releaseDial` (`@/lib/readiness-release`) over the
  official 4-strata blueprint with the wave19e anchor semantics OMITTED (no mocks in sim; m=0 ⇒
  identity anyway). Do NOT reimplement PB/mixture/split (import; the oracles already pin them).
- **Dynamics**: real `schedule`/`retrievability` (FSRS-6), wave20 grading (honest g, slip-adjusted
  lapses) — the sim must run the SHIPPED pipeline, not an idealization.
- **Allocator** (pure `lib/exam-allocator.ts`): given the student's per-item states, the exam date,
  and a daily budget B, score each candidate item by the EXPECTED dial delta of reviewing it today:
  ΔP_i = E_outcome[P_pass(states with item i updated) − P_pass(states)] where the outcome
  expectation uses p_correct = R_i (retrievability at review time) and the real grade path for
  correct/wrong. Exact recomputation per candidate is affordable (pool ≤ ~2k, dial is fast) but the
  spike may score on a per-block factorization if profiling demands — ONLY with an oracle proving
  the factorized score preserves the exact top-B ranking on the frozen fixtures.
- **Baseline**: the current production policy — `selectReviewQueue` semantics (due-first ranking +
  weakness weighting + new-item share) at the same budget B.
- **Simulation harness** (pure, deterministic LCG): student profiles = {weak/median/strong priors ×
  horizons 14/30/60d × budgets 15/30/day}, ≥50 seeded replicas per cell; each day both policies
  pick B items for THEIR copy of the student, answers sampled at p=retrievability (plus the guess
  floor for unseen: p = g of the item), states update via the real pipeline; at exam date score
  BOTH with the same `releaseDial` call. Report mean/CI pass-prob per cell + the decision-gate
  verdict. ⚠ DIRECTIONAL-ORACLE DISCIPLINE (the wave19b lesson, evaluator trigger (e)): if the
  allocator LOSES on the below-threshold population, that is the FINDING — report NO-GO honestly;
  never re-fixture to a population where it wins.
- **Report**: `docs/research/EXAM-ALLOCATOR-SPIKE-2026-07-14.md` — tables, the gate verdict,
  and the product-wave recommendation (or the reasons it fails).

## Deliverables (priority order)
1. **Python reference oracle** (`scripts/oracles/gen-wave23-oracles.py`): freezes (a) ΔP_i values
   6dp for a hand-built 6-item/2-block fixture (reimplements the PB tail + split independently —
   may crib the gen-19d oracle's helpers by COPY, never importing TS); (b) allocator ranking on
   that fixture (exact order); (c) expected-outcome blend arithmetic (E over correct/wrong paths);
   (d) budget boundary: B ≥ candidates ⇒ all reviewed, B=0 ⇒ no-op; (e) baseline-policy fixture
   ranking (the queue formula on the same fixture, cross-checked against lib/test-engine/queue
   semantics as documented — NOT by importing it).
2. **Pure allocator** (`lib/exam-allocator.ts`) matching the oracle; purity gates.
3. **Simulation harness** (`scripts/spikes/exam-allocator-sim.ts`, tsx-runnable, deterministic;
   NOT in the unit suite — but a COMPACT version of one cell ships as a unit test pinning the sim's
   determinism byte-exactly, seed 42, so the reported numbers are reproducible by anyone).
4. **The measurement run + report** (investigation task — journal + FINDINGS.md + the committed
   report with verbatim sim stdout as PREVERIFY-OUTPUT evidence; the evaluator learnings about
   investigation tasks apply in full).
5. **Verify-wave** (typecheck · unit · integration untouched-green · build; no browser audit needed
   — zero UI — but assert lib/fsrs + readiness + wave20/21/22 oracles byte-untouched).

## Out of scope
- ANY product wiring (queue changes, UI, notifications) — future wave, gated on the report.
- SSP-MMC value iteration (the greedy allocator is the spike; if greedy shows lift, the future wave
  can explore the DP refinement).
- Weight fitting (wave24), Elo consumers.

## House rules
Standard: python-first oracles, pure lib separation, PREVERIFY artifacts, Opus bulk, db untouched
(this wave needs NO DB — everything synthetic/pure except reading constants).
