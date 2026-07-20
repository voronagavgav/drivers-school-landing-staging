# Readiness / student-gauging system — deep-dive report (2026-07-12)

Prepared by read-only Explore agent at git HEAD a9c775e; consumed as the Wave 19b signal appendix.

## Executive summary
Readiness = exact Poisson-binomial DP P(≥18/20) seeded from FSRS retrievability. At audit time the engine was FSRS-5 (19 weights, fixed decay −0.5) with wave19a migrating to FSRS-6 (21 weights, trainable w20=0.1542). Three architectural weaknesses: (1) uncalibrated dial (never fitted to real exam outcomes — wave19a Part 2 builds the PassOutcome ground-truth pipeline); (2) independence assumption in the PB DP over-states readiness ~20% for correlated within-topic items (ρ≈0.35 per research); (3) grade inference via global latency bands (5s/30s), no guessing correction (~25% MCQ base rate) — lucky fast guesses inflate stability.

## 1. Pipeline end-to-end
- FSRS engine: lib/fsrs/constants.ts (weights, FSRS_TARGET_RETENTION=0.9, FSRS_EASY_LATENCY_MS=5000, FSRS_HARD_LATENCY_MS=30000, FSRS_CONFIDENT_MIN=3, FSRS_LOW_CONFIDENCE_MAX=2); retrievability.ts:28-46 `R=(1+FACTOR·elapsed/S)^DECAY` clamped [0,1], R=1 if never reviewed/elapsed=0; grade.ts:35-57 `deriveGrade` wrong→1, correct: ≥30s→2, ≤5s→4, else→3; confidence probe (~1-in-5) can veto to Hard or unlock Easy.
- Topic mastery: lib/mastery.ts bands weak/learning/strong; recomputeTopicMastery (lib/server/mastery-readiness.ts:71-146): per-topic meanR, coverage, band via accuracy proxy `correct=round(meanR×seen)`; weak: ≥4 answered ∧ acc<0.6; strong: ≥4 ∧ acc≥0.85. Materialized to TopicMastery per session finish.
- Readiness: lib/readiness-model.ts (pure, lines 44-223) computeReadiness: per-item p_i=perItemPassProb(R_i, calibrationSlope); pool mean with honesty clamp `effective_prior=min(unseenPrior=0.5, seenMeanProb)`; blueprint blocks → heterogeneous p-vector else constant μ; poissonBinomialAtLeast(18, ps) O(n·k) DP; mock shrinkage Beta anchor `(k+S·P_model)/(m+S)`, S=READINESS_ANCHOR_STRENGTH=4, window=last 10 category EXAM_SIMULATION; dialPercent=round(P×100).
- Server: lib/server/mastery-readiness.ts:160-319 recomputeReadiness → ReadinessSnapshot rows (passProbability, dialPercent, coverage, calibrationSlope, inputsJson audit {sufficientData, seenCount, meanR, priorUnseen, mock, blocks}); sufficientData = seenCount ≥ READINESS_MIN_SEEN(20); insufficient → dialPercent=0, UI "gathering data". Bottleneck = lowest-meanR seen topic (findFirst orderBy meanR asc — ties arbitrary).
- UI: dashboard lens hero (app/(app)/dashboard/page.tsx:233-240), DIAGNOSTIC /result dial (result/page.tsx:123-130), exam-access offer gated dialReal (⚠ line 61 no !user.isAnonymous — owned by wave-conversion-funnel spec), admin readiness-shadow.

## 2. Honesty debt table
| Issue | Current | Consequence | Priority |
|---|---|---|---|
| P(pass) uncalibrated | no real-outcome fit | true prob could be ±20% | wave19a-05..09 (in-flight) High |
| Independence assumption | PB DP independent items | ~20% over-statement, worst for uniformly-weak | 19b #1 High |
| Grade inference | latency bands, no guess correction | lucky guesses inflate stability | 19b #2 Medium |
| Blueprint bucketing | displayOrder−99 vs live seed +101 | items fall to remainder block; heterogeneous DP degenerates; integration test SKIPs | 19b #3 Medium |
| Per-topic latency bands | global 5s/30s | fast topics over-grade | Low (Wave 11 leftover) |
| Stale snapshots | recompute on finishSession + nightly | yesterday's dial mid-day; conservative | Lowest |
| MIN_SEEN vs MIN_ANSWERS | both 20, one unused | dead constant | 19b #4 |

## 3. Test coverage
- readiness-model.test.ts (167 ln): PB DP golden math, honesty monotonicity, prior clamp, mock shrinkage — no end-to-end blueprint heterogeneity.
- mastery.test.ts (67 ln): band thresholds, never-strong-below-min.
- readiness-snapshot.integration.test.ts (224 ln): production path materialization, insufficient gate, mock-anchor direction (relative oracle vs pure model).
- fsrs: grade/retrievability/schedule + reference-vectors (ts-fsrs@5.4.1 oracle; FSRS-6 vectors = wave19a-01).
- calibration.integration.test.ts: confidence-calibration slope [0.6,1.0] — NOT P(pass) calibration.
- Missing: real exam-outcome flow (wave19a-06..09 builds), calibration-metrics oracles (wave19a-05), correlation-violation measurement.

## 4. What the dial claims vs means
Shows 0–50 не готовий / 50–80 майже / 80–100 готовий; sufficientData gate at 20 seen. Actually means P(pass | uniform random draw, independent items, FSRS R ≈ correctness, mocks generalize, blueprint ≈ official distribution) — none of the conditionals stated in UI; disclaimer copy queued in 19b #4.

## 5. Key edge cases
- Mock window is per-category (correct — no cross-category carryover).
- Single-topic grinder + 0 mocks → optimistic dial (correlation fix #1 addresses the worst of it).
- Block unseen honesty clamp exists per-block (`min(rawUnseenProb, seenMeanProb)`).
- Every seeded Question.difficulty=1 → difficulty-based ordering runtime-vacuous today.
- READINESS_MOCK_WINDOW=10, READINESS_ANCHOR_STRENGTH=4, CALIBRATION_* (MIN_SAMPLES=20, EXPECTED_ACCURACY [0.25,0.5,0.75,0.95], SLOPE_MIN=0.6).

## 6. File references
lib/readiness-model.ts · lib/server/mastery-readiness.ts · lib/fsrs/{constants,grade,retrievability,schedule}.ts · lib/mastery.ts · prisma/schema.prisma (ReviewState 301-327, ReadinessSnapshot 432-450, PassOutcome 453-467) · components/readiness-dial.tsx · app/(app)/dashboard/page.tsx:233-240 · app/(app)/test/[id]/result/page.tsx:51-161 · docs/research/FSRS-READINESS-STRATEGY-2026-07-07.md · specs/wave19a-fsrs-secret-sauce.md
