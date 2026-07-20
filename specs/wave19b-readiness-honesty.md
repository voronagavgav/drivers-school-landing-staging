# SIGNAL — Wave 19b: Readiness dial honesty + grade-inference redesign

Source: readiness deep-dive 2026-07-12 (full report appended below) + `docs/research/FSRS-READINESS-STRATEGY-2026-07-07.md` (Wave B prescriptions). Wave 19a (FSRS-6 + calibration ground-truth pipeline, tasks 01–09) is complete/in-flight and MUST NOT be overlapped — 19b builds ON TOP of it.

## Goal
Make the readiness dial statistically honest and the FSRS grade signal principled, using only what is calibratable WITHOUT real traffic (per-user weight fits + exam-date scheduling are Wave C, data-gated — OUT OF SCOPE).

## Deliverables (priority order)

### 1. Beta-binomial variance inflation (dial honesty — the ~20% over-statement fix)
- Problem: `poissonBinomialAtLeast` (lib/readiness-model.ts) treats within-topic items as independent; correlated failures (ρ≈0.35 per research) over-state P(pass) reliability by ~20% — worst exactly for the uniformly-weak student the dial most needs to warn.
- Fix (research §3, "ship-first" tier): keep the PB mean; inflate variance per topic by the design effect `1+(n−1)·ρ`; apply in the tail computation. Expose ρ as a constant with a conservative default; add `measureTopicCorrelation` (pure fn over ReviewLog-shaped rows) so ρ becomes empirical as data accrues (wired to the same admin calibration view from wave19a-08, read-only).
- ORACLE: frozen expected values computed OUTSIDE the implementation (reference beta-binomial tail values pinned at plan time, e.g. from scipy.stats.betabinom or hand-derived small cases: n, k, μ, ρ → P). Monotonicity properties: ρ=0 must reproduce today's PB result EXACTLY (regression anchor); increasing ρ must never increase P(pass) above the ρ=0 value for a below-threshold-mean student.
- The dial/UI + snapshot inputsJson must record ρ used (auditability, matches existing inputsJson discipline).

### 2. Bayesian guessing-corrected grade inference (replaces latency-band heuristic)
- Problem: lib/fsrs/grade.ts derives FSRS grade from raw latency bands (5s/30s global); a lucky fast guess on a 4-option MCQ (~25% base rate) grades Easy(4) and inflates stability → dial optimism upstream of everything.
- Fix (research Wave B, BAMA/BKT-style): fuse correctness with a guess floor — posterior P(knows | correct, R_prior) with guess=0.25 (constant, per 4-option ПДР items; derive per-question from option count if trivially available); latency and confidence become secondary evidence, not the primary axis. Spec must pin the exact update math (research doc §4 specifies it) with numeric examples FROZEN as oracle vectors.
- Constraints: grade output stays in FSRS 1..4 domain; keep the confidence-probe veto semantics (Wave 12b) — confidence ≤2 can still cap the grade; deterministic (no Date.now/Math.random; injected clock as house rule).
- Regression: FSRS-6 reference-vector oracle (wave19a-01) must stay green — grade inference changes INPUTS to the scheduler, never the scheduler math.
- Migration honesty: existing ReviewState rows were built under the old heuristic — do NOT retro-rewrite states; the new inference applies forward only. Document this in the module header.

### 3. Blueprint block bucketing fix (heterogeneous DP is currently lossy on the live seed)
- Problem: `groupCandidatesByBlock` buckets by `displayOrder − 99` but the real seed sits at section+101 (observed: ДОРОЖНІ ЗНАКИ→134, РОЗМІТКА→135; CLAUDE.md learning) → nearly all questions fall to the remainder block, so the per-block p-vector degenerates.
- Fix: bucket by a robust mapping (verify against live dev.db: `sqlite3 dev.db "SELECT displayOrder,title FROM Topic …"`), NOT a hardcoded ±99/±101 — prefer matching topics to blueprint blocks by section number stored/derived explicitly. Un-skip (or rewrite honestly) the exam-blueprint integration test that currently SKIPS because of this.
- ORACLE: with the fix, a seeded student strong-in-signs/weak-in-rest must produce a DIFFERENT (and directionally correct) P(pass) than the homogeneous fallback — pin the direction, and pin exact values on a synthetic fixture.

### 4. Constants + honesty copy cleanup (small, bundled)
- Consolidate READINESS_MIN_SEEN / READINESS_MIN_ANSWERS redundancy (both 20; one unused in the readiness path) — single source, grep-verified no dangling references.
- Dial disclaimer copy (UI honesty): one calm Ukrainian sentence under the dial stating what the number is (оцінка ймовірності скласти за поточними знаннями, не гарантія) — consistent with the Wave 5 legal stance and the «не гарантія» verify-gate patterns (same-line negation trap — see CLAUDE.md).
- inputsJson: add engine/version tag (fsrs6, betaBinomial ρ, calibrator id) so future recalibration can segment snapshots by model version.

## Out of scope (do NOT plan)
- Per-user FSRS weight fitting, exam-date-aware scheduling, POMDP stopping rule (Wave C, data-gated).
- Anon offer gate `!user.isAnonymous` (owned by specs/wave-conversion-funnel.md — do not duplicate).
- Any change to the stable-key content architecture, user-progress-destructive migration, or the FSRS-6 scheduler math itself.

## House rules that bind every task
- Pure logic in lib/ (no server-only/db imports, injected clock/rng), unit-tested with EXTERNAL oracles frozen at plan time (oracle rule — never derived by calling the implementation).
- DB orchestration in lib/server/*; hand-authored additive migrations only if schema changes (expect none for 19b).
- typecheck + full unit suite green per task; integration where the production path changes (recompute → snapshot).
- Browser verify (npm run audit:browser) if any UI surface changes.

---
[FULL DEEP-DIVE REPORT 2026-07-12 — appended for the planner's context]

Full report: docs/research/READINESS-DEEP-DIVE-2026-07-12.md
