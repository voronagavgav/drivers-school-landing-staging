# Grade-side pipeline deep-dive (2026-07-13, read-only Explore agent)

⚠ ORCHESTRATOR ADDENDUM before consuming: (1) the report is INTERNALLY INCONSISTENT on the
forgetStability cap — §3 claims a slip "cannot go BELOW prior s / does NOT reset memory", but the
§(b) quantification correctly reads the code (`min(sForget, prior)` takes the SMALLER: s=50 + one
mis-click → s≈0.3, interval 50d → ~7h). The §(b) reading matches schedule.ts; CONFIRM NUMERICALLY
(playbook step 2) before speccing R4 — this is the campaign's central quantity. (2) D1 (option-count)
is usefully DOWNGRADED by the report's own Bayes table: negligible at production-bulk priors,
~1–2% portfolio effect — cheap fix, not urgent. (3) The agent did NOT actually run the dev.db
queries it drafted (latency/option-count distributions) — run them first thing.

(full agent report follows)

## Pipeline map (condensed from the agent report)
- CAPTURE (test-runner → submitAnswer test-engine.ts:348-465 → recordReview study.ts:98-204):
  captured+used = correct, latencyMs (cap-only), confidence (~1-in-5 FNV-1a probe, cap-only),
  per-topic easyMs/hardMs overrides (study.ts:428-437 reads TopicMastery.medianLatencyMs — WIRED but
  the medianLatencyMs POPULATION path is undeployed, so globals 5s/30s rule in practice).
  NOT captured: per-question optionCount (deriveGrade has the param, study.ts never passes it →
  g=0.25 always); answer-change counts (upsert allows changes, only FIRST attempt hits FSRS);
  time-of-day/circadian.
- INFERENCE (lib/fsrs/grade.ts:1-101): correct → BKT π = p0(1−s)/(p0(1−s)+(1−p0)g), s=0.1;
  π≥0.93→Easy, ≥0.75→Good, else Hard; caps AFTER posterior: latency ≥hardMs Easy→Good, confidence≤2
  →Hard; wrong → Again(1) UNCONDITIONAL (no posterior). priorKnow = retrievability if lastReviewedAt
  else 0.5 (never R=1).
- UPDATE (schedule.ts): new→[Easy]review/[else]learning; two-corrects-to-graduate (INTENTIONAL,
  first-attempt-only per session×question); forgetStability = max(MIN, min(sForget, prior_s)) —
  §(b) quantification: s=50 + one Again → s≈0.3, next interval ~7h (vs 50 d) — the R4 damage number
  (CONFIRM by running the real schedule() before speccing).
- CONSUMERS of `correct ⟺ grade≥2`: lib/calibration.ts:40 + lib/server/learning-health.ts:78 (the
  full dependency map the R4 fix must preserve). ReviewLog.grade = Wave-C training corpus (engine
  tag "fsrs6-bkt1" segments).

## Risk table (agent severities, pending numeric confirmation)
- D1 CONFIRMED (impact downgraded by its own math): optionCount never threaded; negligible at
  p0≥0.5, ~1–2% portfolio; cheap fix (COUNT options per question, thread recordReview→deriveGrade).
- D2 SUSPECT→likely CONFIRMED pending probe: slip declared 0.1, wrong→Again crushes s=50→≈0.3
  (~7h interval); queue churn + false-lapse telemetry hits the BEST-known items most. Fix shape:
  posterior-weighted wrong (π_wrong high → Hard(2)) — preserves grade≥2 ⟺ correct? NO — a wrong
  graded Hard(2) BREAKS the invariant → the fix needs an invariant migration plan (calibration.ts +
  learning-health.ts must switch to an explicit `correct` column read, ReviewLog already stores it?
  CHECK — if not, additive column first). THIS is why R4 was parked; the spec must lead with it.
- D3 SUSPECT: confidence-probe determinism fine, no bias correction in calibration fit; audit
  correlations when real data exists (slope clamp [0.6,1] mutes it today).
- D4 CONFIRMED: per-topic latency bands wired but never populated (Wave-11 leftover) — populate
  medianLatencyMs from ReviewLog or keep globals after validating vs real latency distribution.
- D5 CONFIRMED (signal gap): answer-change counts uncaptured — cheap additive ReviewLog metric.
- D6 CONFIRMED intentional: confidence veto is post-posterior hard cap — needs a boundary TEST, not
  a code change.

## Property verdicts (agent)
(a) posterior monotone in prior — sound; caps are policy. (b) = D2 above (THE number to confirm).
(c) guess-floor error concentrated at weak priors, negligible at bulk. (d) sampling deterministic,
bias unmeasured. (e) latency globals unvalidated vs data. (f) two-corrects-to-graduate intentional,
mild learning-queue inflation, low priority.

## Ranked plan the agent proposes (orchestrator to re-rank after probes)
P0 D6 boundary tests · P1 D1 optionCount threading · P2 D2 slip-consistent wrong grade (invariant
migration!) · P3 D3 bias audit (data-gated) · P4 D4 latency-band population · P5 D5 change-count
capture. Note the report's ship-checklist framing "Wave 19b" is stale naming — the campaign prefix
will be wave20*.
