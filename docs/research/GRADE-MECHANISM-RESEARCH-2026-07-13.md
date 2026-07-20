# Grade-side mechanism research (deep-research, 2026-07-13) + local blend-space direction check

Adversarially verified (19 sources → 85 claims → 25 verified 3-vote → 23 confirmed, 2 refuted).
Workflow `wf_d1eda549-afc`. Feeds the wave20 spec DIRECTLY. Companion probes:
`GRADE-SIDE-PROBES-2026-07-13.md`.

## The verdict: option (ii) — thin pure layer outside the frozen scheduler

1. **Prior art is mainstream (HIGH, 3-0)** — Baker/Corbett/Aleven Contextual-Guess-and-Slip:
   per-response slip estimation instead of per-skill constants; the carelessness follow-ons show
   P(slip) RISES with mastery evidence (0.10→0.18→0.20→0.27) — errors on high-mastery items are
   disproportionately slips. The ITS answer to "wrong on high-R": dampen proportional to inferred
   slip probability, do NOT treat as unconditional forgetting.
2. **Do NOT skip the update entirely (HIGH, 3-0)** — CGS models that let heavy slippers keep
   assessed mastery predicted post-test far worse (r=0.289 vs 0.430; caveat: gap not statistically
   significant, one of two candidate explanations) — skipping discards evidence of NON-ROBUST
   knowledge. Dampened-but-nonzero penalty is the family to build.
3. **Binary-broken confirmed externally (HIGH, 3-0)** — FSRS treats Again="fail",
   Hard/Good/Easy="pass" with SInc≥1 (w15 only shrinks growth, never reverses); Again routes to the
   dedicated post-lapse crush formula. No fed grade can produce a mild penalty ⇒ the layer must
   live OUTSIDE `schedule()`.
4. **Contamination + the invariant answer (HIGH, 3-0)** — official FSRS docs: logging Hard on a
   failed recall inflates ALL intervals (the optimizer trains on review_logs). Therefore: **the
   logged grade stays the TRUE outcome Again(1)**; the layer adjusts only the applied memory
   state; rows are segmented by the engine tag. CONSEQUENCE: `correct ⟺ grade≥2` is PRESERVED —
   no calibration.ts / learning-health.ts migration needed. Never feed OR log Hard-on-wrong.
5. **Guess math exact + monotone (HIGH, 3-0)** — BKT posteriors verified against van de Sande 2013
   / Corbett & Anderson 1995; P(L|correct) strictly decreasing in g ⇒ honest g=1/optionCount
   auto-satisfies "2-option correct never outranks 5-option".
6. **2-option g=0.5 sits ON the degeneracy boundary (HIGH, 3-0)** — BKT needs P(G)+P(S)<1 for
   direction-sanity; Baker et al. impose the STRONGER P(G)<0.5, P(S)<0.5 (nonsense parameters
   otherwise). g=0.5+s=0.1=0.6<1 is non-degenerate but violates the strict P(G)<½ bound ⇒ shade
   2-option g below 0.5 (cap constant, e.g. 0.45) and RE-DERIVE the Good/Easy thresholds rather
   than keeping the g=0.25-calibrated 0.75/0.93 blindly.
7. **Psychometrics: guess correction is option-count-dependent (HIGH, 3-0)** — classical penalty
   1/(M−1); 3PL estimates the lower asymptote per item. A single fixed g for a mixed 2/3/4/5 bank
   is provably wrong.
8. **HLR = prior art for continuous-signal propagation (HIGH, 3-0)** — Duolingo trains on
   fractional recall rates, no discrete crush; architectural precedent for the blended update
   (analogy only — HLR replaces grades entirely).
9. **DAS3H offers nothing (HIGH, 3-0)** — binary correctness only, zero guess/slip machinery.

## Refuted / unresolved (never design around these)
- "Optimizer drops same-day repeat reviews" — REFUTED 1-2 (unresolved; determines whether a
  same-session-retry disambiguator is corpus-safe — treat as UNKNOWN).
- "Optimizer semantically requires logged grade = true memory state" — REFUTED 1-2 (the
  contamination warning itself stands from official docs).

## Research's open question, SETTLED LOCALLY (blend-probe on the real engine, 2026-07-13)

No external source adjudicates the blend space. Local direction check (real `schedule()`, g=1/3,
π = P(knows|wrong) at the item's own R):

| case | π | S'again | S'hard | LINEAR | LOG |
|---|---|---|---|---|---|
| s=50 R=0.973 wrong | 0.843 | 2.55 | 63.40 | 53.8 | **38.2** |
| s=100 R=0.973 wrong | 0.843 | 3.32 | 123.9 | 104.9 | **70.1** |
| s=5 R=0.509 wrong (half-forgotten) | 0.135 | 1.82 | — | **8.02 ⚠ GROWS above prior 5** | **2.82 ✓ crushes** |
| repeated wrongs (s=50) | 0.843→0.574→0.574 | — | — | 53.8→33.3→12.0 | 38.2→14.9→6.8 ✓ converges |

**LINEAR IS EXCLUDED** — it violates "wrong never grows memory" at low π (the S'hard arm dominates
linearly). **LOG-SPACE (geometric) blend passes all checked limits**, with ONE structural cap
required: at π>0.926 (reachable: 2-option item at R≈0.99 → π≈0.93) even the log blend exceeds
prior S — the layer MUST clamp `S' = min(prior.stability, exp(π·ln S'hard + (1−π)·ln S'again))`,
mirroring forgetStability's own `min(sForget, prior)` cap. This makes never-grow-on-wrong TRUE BY
CONSTRUCTION (a frozen property for the oracle).

State-machine design note (spec decision, CGS-consistent): blend ONLY stability (+ dueAt derived
from it); take state/lapses/difficulty from the TRUE Again path (relearning, lapse++, D raised) —
the wrong IS a wrong; only the interval crush is the defect. This keeps lapse telemetry honest and
builds convergence in (higher D dampens future growth).

## Wave20 mechanism shape (input to the spec, frozen properties to be pinned by a Python oracle)
- `deriveGrade`: wrong → Again(1) UNCHANGED (grade = truth; invariant intact).
- NEW pure layer (lib/fsrs): slip-adjusted lapse update — compute both schedule(prior,1,now) and
  schedule(prior,2,now), return the Again result with stability := min(prior.stability, geometric
  blend by π), dueAt recomputed from the blended stability. π = gradePosterior({correct:false,
  priorKnow:R, optionCount}) — already exists.
- optionCount threaded submitAnswer→recordReview (free — options already loaded), with
  g capped (2-option shade below 0.5, constant + rationale in constants.ts).
- Good/Easy thresholds re-derived for honest g (fixed-posterior semantics vs per-option cutoffs —
  the spec's calibration decision; direction gates first).
- REVIEW_ENGINE_VERSION → "fsrs6-bkt2" (grade semantics unchanged but APPLIED-STATE semantics
  changed; pin update is conscious).
- FSRS-6 reference vectors stay byte-identical (the layer composes OUTSIDE schedule()).
