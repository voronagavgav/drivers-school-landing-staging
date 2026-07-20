# SPEC — Wave 19d: official blueprint + evidence-releasing correction

Replaces the wave19c estimation-side shrink, which is a confirmed DEFECT (no asymptotic release:
n_eff caps at 1/ρ ⇒ perfect-student dial ceiling 59%, «готовий» band unreachable — see
`docs/SESSION-HANDOFF-2026-07-13.md` and `docs/research/RISK-NOTES-2026-07-13.md`). Inputs, all
verified: `docs/research/OFFICIAL-EXAM-STRUCTURE-2026-07-13.md` (R1 — official strata),
`docs/research/HIERARCHICAL-RELEASE-RESEARCH-2026-07-13.json` (3-0-voted math: Lahiri-Mukherjee
seen/unseen split, factor-mixture ICC, Kish-misapplication diagnosis, calibration division of labor),
RISK-NOTES R2/R3 (frozen counterexamples).

## Binding properties (THE oracle set — every one gets a frozen test; evaluator trigger (e) applies)
(a) NEVER-ABOVE-INDEPENDENCE, all populations: final dial = min(corrected, independence) BY
    CONSTRUCTION — the research's mixture-honesty proof covers only threshold-above-mean; weak
    students are protected by the outer clamp, exactly like the standing gate
    `lib/readiness-honesty.regression.test.ts` (byte-untouched, must stay green).
(b) ASYMPTOTIC RELEASE: as per-item review counts and block coverage grow, corrected dial →
    independence dial. Frozen oracle: p̂=0.95 across blocks, rich evidence ⇒ dial within 2pp of the
    independence dial; the top band (80+) reachable by a genuinely strong student. (The 19c ceiling
    counterexample — p̂=1.0, nSeen=1000 → 59% — must now FAIL against the new code, i.e. pin the NEW
    value ≈ independence.)
(c) SPARSE DISCOUNT: n_seen=2 in an 11-slot block must NOT certify it — unseen slots sit near the
    clamped prior, not the seen mean. Frozen oracle values at plan time.
(d) STUDY-NEVER-HURTS (R2 fix): answering a new item at R ≥ the prior its slot carried must never
    lower the dial. The frozen R2 counterexample (10@0.95 + new@0.6: 31%→26% today) must show
    non-decreasing dial under the new model.
(e) INSTRUMENT RANGE: perfect+rich ⇒ dial ≥ 95; hopeless (all R≈0, rich evidence) ⇒ dial ≤ 2.
(f) SINGLE UNCERTAINTY BUDGET (R3): calibrationSlope participates in the release property — at
    slope=1 and rich evidence the correction vanishes; the slope's own discount applies ONCE
    (per-item, as today), and no block-level shrink re-discounts it. Document the division of labor:
    input side = sampling/coverage uncertainty only; residual shared MODEL error = output-side Platt
    ONLY (never stack both for the same error component — research finding 8).

## Deliverable 1 — OFFICIAL blueprint (R1)
- Rebuild `CATEGORY_B_BLUEPRINT` as the official 4 strata: **ПДР 10 · безпека руху 4 ·
  будова/експлуатація 4 · домедична 2** (source doc above; no finer official quotas exist).
- Topic→stratum mapping: explicit, data-driven from the live seed's topic titles/sections (verify
  against dev.db; the fine ПДР sections §§ знаки/розмітка/перехрестя… fold into the ПДР-10 stratum).
  Mapping lives in ONE place (lib/exam-blueprint.ts), unit-pinned per topic, with an UNMAPPED-topic
  fallback to the ПДР stratum + a test that every seeded topic maps.
- `EXAM_SIMULATION` ticket composition (lib/server/test-engine.ts) uses the same strata — the
  simulator now mirrors the real ТСЦ draw (this changes exam-sim composition; existing exam tests
  that assume the old 6-block shape must be updated HONESTLY, not fixture-dodged).
- Timeout rule note (official: unanswered at timeout = fail): assert our exam finish already treats
  unanswered as wrong (it does — pin it, don't change it).

## Deliverable 2 — per-block seen/unseen split (Lahiri-Mukherjee form; kills R2)
Per stratum block: expected per-slot probability = pool-weighted
  `p_slot = (Σ_seen perItemPassProb(R_i, slope) + n_unseen · C) / n_pool`
where C = the block's unseen-slot extrapolation = posterior-predictive mean of a Jeffreys-updated
Beta over the block's seen evidence, CLAMPED `C ≤ min(seenMean, READINESS_UNSEEN_PRIOR·slope-adj)`
(the existing global honesty clamp, now applied per block). Seen items are NEVER shrunk (release
comes free); C→seenMean-clamped-prior as coverage grows; C stays near prior at n_seen=2 (property c).

## Deliverable 3 — ICC as evidence-decaying factor mixture (release, property b)
- One latent factor per student (logit-normal, variance σ² = σ₀²·w(evidence), with w decaying in
  total per-item review mass; exact decay form pinned by the oracle task from the research's m^(−1/2)
  credible-gap rate — engineering device per finding 7, NOT claimed exactly calibrated).
- Conditional on each Gauss-Hermite node (~20 nodes), per-slot probs shift on the logit scale by the
  node value; the EXISTING exact PB recursion runs unchanged per node; dial = node-weighted average.
- Outer guarantee: final = min(mixtureDial, independenceDial) — never rely on the mixture's
  direction for weak students (the 19b lesson, now structural).
- σ₀ ties to READINESS_TOPIC_CORRELATION_ESTIMATION's successor constant; ρ→σ₀ mapping documented
  and pinned. All of it recorded in inputsJson (append-only): `model:"lm-gh1"`, σ used, node count,
  per-block nSeen/C, and `dialIndep` stays.

## Deliverable 4 — retire the 19c shrink path
`correctBlockMeanProb` tier machinery: live path stops calling it (constants flip to tier "off" /
new model key); the lib + oracle tests REMAIN (correct math, documented as superseded — same
treatment as the 19b β-binomial lib). The 19c integration test's pinned 34/100 magnitudes are
superseded — rewrite that test against the new model's frozen values (this IS an honest oracle
update: the model is being replaced wholesale; document in the journal).

## Oracle discipline
A dedicated oracle task FIRST (before any impl): a committed Python/scipy reference script
(`scripts/oracles/gen-19d-oracles.py` style) that computes every (a)–(f) frozen value from the
formulas above, values embedded as literals with the script named as source. TS impl must match to
≥8dp. No oracle may be regenerated from the TS implementation.

## Out of scope
Grade-side slip/Again inconsistency (R4 — own investigation later; `correct = grade≥2` invariant
makes it delicate). Per-user weight fits / exam-date scheduling (Wave C, data-gated). UI copy beyond
what exists. PassOutcome/ReviewLog schema (already hardened).

## House rules
Pure math in lib/ (injected clock/rng; no Date.now/Math.random; purity greps match comments). DB
orchestration in lib/server/*. The wave19b honesty gate and the neutralized draw-side
READINESS_TOPIC_CORRELATION=0 stay byte-untouched. typecheck + unit + integration + build + browser
audit green per the wave gate. Evaluator REJECT trigger (e): direction/limit oracles bind on their
stated population — never re-fixture.
