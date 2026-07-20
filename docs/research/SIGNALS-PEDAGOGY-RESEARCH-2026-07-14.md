# Signals-beyond-correctness + pedagogy effect sizes (deep-research, 2026-07-14)

Targeted re-run of the two questions the broad survey left open (workflow `wf_7ca62406-564`,
resumed after a session-limit kill; 10 findings survived 3-vote adversarial verification against
primary sources). Rule of the brief, kept: NOTHING below gets built without a surviving effect
size. Verdicts: BUILD / CAPTURE-ONLY / SKIP.

## BUILD (meta-analytic ground, actionable now or in a near wave)

1. **Interleave confusable topics within practice sessions** (F1/F1a/F1b, HIGH, all 3-0).
   Brunmair & Richter 2019 (Psych Bulletin, 59 papers/238 effects): overall g=0.42 [0.34,0.50];
   honest planning number after trim-and-fill bias correction **g=0.29 [0.20,0.38]**. By material:
   paintings 0.67 · photos 0.35 · math 0.34 · words REVERSED −0.39 (blocking wins). The
   "similarity matters" moderator: benefit is category-DISCRIMINATION-driven — strongest when
   categories are confusable. Confusable ПДР sign families / right-of-way variants are exactly
   that case (our inference from the moderator — the meta contains no driving-MCQ studies).
   Implementation note: our MIXED_PRACTICE already shuffles across topics; the BUILD is
   deliberate mixing of CONFUSABLE topic pairs rather than chapter-blocking in topic practice.
2. **Immediate feedback on wrong answers is the single strongest lever** (F2b, HIGH, 3-0).
   Rowland 2014 moderators: at ≤50% initial accuracy, testing WITHOUT feedback g=0.03 [−0.21,0.27]
   (no reliable benefit!) vs WITH feedback **g=0.73 [0.61,0.86]**. Consequence for us: the
   withheld-feedback EXAM_SIMULATION mode is fine (it's assessment), but practice modes must keep
   immediate feedback + explanation — and any future "hard mode" that hides feedback in PRACTICE
   would be evidence-negative for learning.
3. **Retrieval practice itself** (F2/F3, HIGH, 3-0) — already our core loop, now with numbers:
   Rowland 2014 g=0.50 vs restudy; Pan & Rickard 2018 transfer d=0.40 [0.31,0.50], across-format
   transfer d=0.58 — MCQ practice does transfer to the MCQ exam. No change needed; cite these in
   any honesty/marketing copy review (they support the product thesis).

## CAPTURE-ONLY (real signal, not worth modeling investment at our scale)

4. **Answer-change events** (D3, HIGH, 3-0): first-instinct fallacy is a MYTH — Kruger, Wirtz &
   Miller 2005 (1,561 real exams, 3,291 changes): 51% wrong→right vs 25% right→wrong; 54% of
   changers net-improved. So: never ship "trust your first instinct" copy; capture change counts
   (cheap additive telemetry, e.g. TestAnswer.changeCount) for future modeling. Whether change
   COUNT predicts knowledge state is an OPEN question (nothing survived).
5. **Response-time features in knowledge tracing** (D1, MEDIUM, single vendor benchmark): SAINT+
   vs SAINT on EdNet: AUC 0.7816→0.7914 (+1.25% relative) from elapsed+lag time. Real but small;
   AT-DKT gets similar gains without RT. We already log latencyMs — keep logging, don't model.

## SKIP (failed replication)

6. **Expressive writing for test anxiety** (F6, HIGH, 3-0): Ramirez & Beilock 2011 FAILED both
   Camerer et al. 2018 SSRP replication attempts (effects slightly negative) + a well-powered
   classroom null (N=173, BF01≈11). Do NOT build writing-before-exam interventions. (Our existing
   calm layer — breathing pacer, graded exposure — was never justified by this literature and
   stays on product-taste grounds, not evidence claims; never cite anxiety-intervention evidence
   in copy.)

## CONTESTED (judgment call, flagged as such)

7. **Practice format MCQ vs recall** (F2a, MEDIUM, survived 2-1): Rowland 2014 exposure-controlled
   subset says recall >> recognition (cued 0.72 / free 0.81 / recognition 0.36); Adesope 2017 says
   MC g=0.70 > short-answer 0.48. Genuinely contested between the two metas. Our format is fixed
   by the exam (MCQ) and transfer d=0.58 covers us; a future "type the rule" recall sub-mode is a
   plausible experiment, not evidence-mandated.

## STILL OPEN (zero surviving claims — default NO-BUILD)
Confidence-elicitation value + optimal sampling rate (our 1-in-5 has no published anchor either
way) · van der Linden hierarchical speed-accuracy effect sizes · pretesting/errorful-generation
effect sizes · mock-exam cadence before a fixed-date exam · mindfulness/breathing pre-exam
interventions. Also: whether answer-change COUNT predicts knowledge state.

## Caveats (verbatim class from the harness)
Report is SILENT, not negative, on the open items; SAINT+ is a single vendor-authored benchmark
(no CIs); the words/tastes interleaving subgroups rest on few studies; the ПДР mapping of the
similarity moderator is our inference, not a tested subgroup.
