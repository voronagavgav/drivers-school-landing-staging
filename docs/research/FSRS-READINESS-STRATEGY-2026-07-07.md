# FSRS + Readiness-Dial — "Secret Sauce" Strategy Research

**Date:** 2026-07-07 · **Method:** autonomous deep-research harness (105 agents, 23 primary/secondary sources, 107 claims extracted → **25 verified 3-0 adversarially, 0 refuted**). Every recommendation below maps to a cited, verified finding and says how it changes *what we have today*.

---

## 0. TL;DR — four load-bearing moves + the moat

1. **Upgrade the memory model** FSRS-5 (19w) → **FSRS-6 (21w) / FSRS-7**, and **fit the weights on our own ReviewLogs** (population, then per-user). We already log every field the official optimizer needs — this is free performance sitting on the table.
2. **Fix grade inference** (our biggest divergence from standard FSRS): replace the 3-band latency heuristic with a principled **guessing-corrected, latency+correctness Bayesian fusion** (BAMA / BKT guess-slip). This is *upstream of everything* — the synthesized 1-4 grade bounds optimizer quality.
3. **Calibrate the readiness dial to REAL ТСЦ pass/fail** (Platt → isotonic), validated with reliability diagram + Brier + LogLoss + ECE. Start logging predicted-vs-actual **now** — we can't calibrate without the ground-truth table.
4. **Exploit the finite-corpus + fixed-exam-date twist**: exam-date-aware scheduling (SSP-MMC cost minimization / RemNote-style front-loading) instead of a hard-coded 0.90 target retention, plus a **BAMA uncertainty-aware stopping rule** for an honest "you're ready."

**The moat = the compound of all four, and it's a data network effect:** FSRS-6/7 weights fitted on proprietary ПДР ReviewLogs + an honest calibrated P(pass) validated against real exam outcomes + exam-date-aware finite-corpus scheduling. No driving-theory competitor is known to run this, and it's hard to copy without the data.

---

## 1. Current state → SOTA gap

| Area | What we run today | Gap |
|---|---|---|
| Memory model | FSRS-5, **19 published-default weights**, `enable_short_term=false`, target-retention fixed 0.90 | 2+ generations behind; using nobody's-data defaults |
| Grade signal | Infer 1-4 from **3-band latency** heuristic (+ optional confidence) | Ad-hoc; no guessing correction; bounds optimizer quality |
| Readiness | Exact **Poisson-binomial DP** P(≥18/20), conservative unseen prior, mock-shrinkage | Never calibrated to *real* outcomes; independence assumption unverified |
| Scheduling | Steady-state 0.90 retention | Ignores the fixed exam date + bounded corpus |

---

## 2. Findings by research question (all verified 3-0 unless noted)

### Q1 — Weight optimization on our own data *(highest ROI, data already logged)*
- **FSRS-6 (21 weights) and FSRS-7 exist, are maintained (py-fsrs v6.3.1, Mar 2026), and beat FSRS-5** on the authoritative `srs-benchmark` "Without Same-Day Reviews" table (the right table for us): **FSRS-6 LogLoss 0.3460 vs 0.3560, RMSE(bins) 0.0653 vs 0.0741**; FSRS-7-recency lower still. FSRS-6 adds a **trainable forgetting-decay** (w20) — our `FSRS_DECAY=-0.5` becomes learned. *(AUC gap 0.7034 vs 0.7011 is within CIs — LogLoss/RMSE gaps are the real signal.)*
  - FSRS-6 default vector (21): `(0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542)`
- **The optimizer is a first-class supported workflow and we already log every required field.** Required schema: `card_id`, `review_time` (ms), `review_rating` (1-4); optional `review_state`, `review_duration`. Maps 1:1 to our `ReviewLog` (questionId, timestamp, inferred grade, latency). `Optimizer.compute_optimal_parameters()`. Per-user vs per-population = *which logs you pool*.
- **Reproduce/validate exactly:** training loss = **Log Loss** (binary cross-entropy on recall); evaluate with **LogLoss + RMSE(bins) + AUC** under **TimeSeriesSplit, 5 folds** (older→train, newer→test; drop the first split). Use this as the gate for any home-grown fit.
- **Minimum data:** ~**1,000 total reviews + a few hundred cards** before weights are reliable; fitting at ~100 reviews **overfits** (looks great, generalizes badly).

### Q2 — MCQ grade inference *(upstream of Q1; our biggest divergence)*
- **`review_rating` is mandatory** — the optimizer won't run without a synthesized 1-4. So our latency→grade step is a genuine prerequisite, and **its quality directly bounds optimizer quality**. Improving it is upstream of everything.
- **Best principled replacement — BAMA** (arXiv 2103.03766): fuse correctness + response time into one uncertainty-aware posterior via **conjugate Bayesian updates** — Beta prior on Bernoulli correctness θ, Gamma prior on exponential response-time rate λ. Each answer just increments four sufficient statistics (α, β, n, γ); combined score `Z = P·(1 − (T+)/d)` → map onto the FSRS 1-4 grade. *(BAMA is an assessment/stopping model, not a scheduler — use it for the grade + stopping layers, layered onto FSRS.)*
- **Correct guessing explicitly, not via latency — BKT** guess/slip: `P(G)=P(correct | not-mastered)`, `P(S)=P(incorrect | mastered)`. For 4-option ПДР items, **anchor the guess floor near 0.25** (standard BKT's P(G) is skill-level, not option-count-calibrated). This stops a lucky fast-correct on a weak item scoring as strong memory.

### Q3 — Calibrate the dial to real outcomes
- **Size-driven method choice:** **Platt/logistic scaling** while ground-truth outcomes are scarce (<~200-1000); switch to **isotonic regression** at **~1000+** outcomes (isotonic overfits below that, matches/beats Platt above). Platt only if miscalibration is sigmoid-shaped; isotonic corrects any monotonic distortion. *(Niculescu-Mizil & Caruana, ICML 2005.)*
- **Validate with the full toolkit, never one metric:** reliability diagram (10 bins) + **Brier + LogLoss + ECE together**. **ECE alone is gameable** — a model that always predicts the base rate scores ECE=0 with zero discrimination. Treat low ECE as necessary-not-sufficient.
- **Action:** ship logistic/Platt on the current dial now; log a growing `(predicted_P_pass, actual_pass)` table; auto-promote to isotonic past ~1000 outcomes.

### Q4 — Alternative / blended memory models
- **Ranking (srs-benchmark LogLoss):** FSRS-5 **0.3560** < DASH ~**0.368** (classical leaders) ≫ HLR **0.4694**, Ebisu **0.4989**; neural GRU 0.3333 / LSTM 0.3332 / **RWKV-P 0.2773** (AUC 0.8329) lead overall but at **2.76M params vs 19** and near-zero interpretability.
- **HLR is a trap:** it's the argument to **train weights** (it halved hand-tuned Leitner/Pimsleur error on 12.9M Duolingo traces), but it is **among the weakest predictors** — on a real driving app (~80k reviews) HLR was the **worst** model (AUC 0.610 vs DASH[RNN] 0.858). **Do NOT deploy HLR.**
- **Verdict:** keep **FSRS-6/7 as the core**; consider a **DASH or Elo/IRT-for-item-difficulty side-signal** for an ensemble; treat neural KT as a research bet, not near-term.

### Q5 — Finite corpus + fixed exam date
- **Replace the hard-coded 0.90 target retention with SSP-MMC** (IEEE TKDE 2023, MaiMemo/the FSRS lineage): formulate scheduling as a **Stochastic Shortest Path**, solved by **value iteration**, minimizing **expected total review cost** to reach/maintain a memory goal. `open-spaced-repetition/SSP-MMC-FSRS` exists to build on. *(Caveat: SSP-MMC minimizes cost to a memory-STATE goal, not a calendar DATE — retargeting to the exam date is engineering work not directly in the source.)*
- **Production analog:** RemNote's "Exam Scheduler" layers on top of FSRS — enter an exam date + material, it front-loads reviews toward the date. Closest shipped feature to what we want.
- **Stopping / "you're ready":** a **BAMA-style POMDP** over information state `(α,β,n,γ)` with stop/continue actions, reward = mastery Z, discount η≈0.7-0.8, solved by Bellman recursion — makes "ready" **uncertainty-aware** (thin coverage keeps you testing), complementing our existing conservative-prior instinct.

### Q6 — The moat *(medium confidence — reasoned synthesis, not measured)*
- Defensible = the **compound of four hard-to-copy layers**: (a) FSRS-6/7 weights on proprietary ПДР logs w/ hierarchical shrinkage (data network effect); (b) honest calibrated P(pass) validated vs real outcomes (competitors show *uncalibrated* confidence); (c) exam-date-aware finite-corpus scheduling + blueprint-weighted coverage; (d) BAMA uncertainty-aware stopping.
- **Prioritize (a) + (b) first** — cheapest (data already logged) and hardest to replicate without equivalent data.
- **Competitor benchmark (context):** Duolingo's **Birdbrain = IRT/logistic** (learner ability × item difficulty, an Elo generalization) at ~1B decisions/day. *No verified source documents what Vodiy or other ПДР apps actually ship — the leapfrog gap is reasoned, not measured (see open questions).*

---

## 3. Recommended roadmap (my sequencing — engineering judgment on top of the findings)

### Wave A — free wins, data already exists (do first)
1. **FSRS-5 → FSRS-6** drop-in upgrade (21 weights + trainable decay). Update `lib/fsrs/constants.ts` default vector + `retrievability.ts` to a trainable decay; re-golden the reference vectors.
2. **Offline weight-optimizer pipeline** on our `ReviewLog` (population fit). Gate = beats the default on **RMSE(bins)/AUC under TimeSeriesSplit**. Only ship if it wins the gate. (Need ≥~1000 reviews — check we're there.)
3. **Start the calibration ground-truth table now**: log `(predicted_P_pass, actual_exam_pass)` whenever a user self-reports a real ТСЦ result. Can't calibrate without it; every day unlogged is lost.

### Wave B — upstream quality + honest dial (needs data to accrue)
4. **Grade inference → BAMA/BKT**: Beta-Bernoulli(correctness) + Gamma-exponential(latency), guess floor ~0.25 for 4-option items, → synthesized grade. Replaces `lib/fsrs/grade.ts` + `latency-bands.ts`. *This is upstream of the optimizer — worth doing before per-user fits.*
5. **Platt calibration** on the dial once ~200+ real outcomes exist → **isotonic** at ~1000. Report reliability diagram + Brier + LogLoss + ECE.

### Wave C — the differentiators (the visible moat)
6. **Exam-date-aware scheduling**: adapt SSP-MMC (or FSRS desired-retention) toward the calendar exam date; blueprint-weighted coverage matching the real ТСЦ topic distribution.
7. **BAMA POMDP stopping rule** on top of the readiness dial → trustworthy "ти готовий."
8. **Per-user weight fits** with **hierarchical shrinkage** from the population prior (cold-start): population weights until a user crosses a review threshold, then blend toward personal.

---

## 4. Pitfalls — what NOT to do
- ❌ **Don't deploy HLR** as the memory model (among the weakest predictors; it's only motivation to *train* weights).
- ❌ **Don't add a free per-item difficulty parameter for all ~2300 questions** — Duolingo's own experiment showed sparse per-item features **overfit + cold-start**, and dropping them for interaction-count features raised retention **+12%**. Prefer a population prior + shrinkage.
- ❌ **Don't fit weights below ~1000 reviews** (overfits to noise).
- ❌ **Don't report ECE alone** (base-rate predictor games it to 0). Always alongside Brier/LogLoss + reliability diagram.
- ❌ **Don't chase neural KT** now (2.76M params, interpretability gap) — research bet only.
- ⚠️ **SSP-MMC targets a memory-STATE, not a calendar date** — budget engineering to retarget it to the exam date.
- ⚠️ **BAMA/BKT are assessment models, not schedulers** — layer them onto FSRS (grade + guessing + stopping), don't replace the scheduler.

---

## 5. Open questions → round-2 research (needs our own data or deeper dig)
1. **Competitor specifics** — what Vodiy / Birdbrain / other ПДР apps actually implement (uncalibrated confidence? fixed intervals? per-user fits?). Unverified; needed to quantify the real leapfrog gap.
2. **Hierarchical shrinkage recipe** — concrete population-prior → per-user protocol: min review count before switching to personal weights, online vs batch re-optimization cadence. Optimizer workflow is confirmed; the cold-start protocol is not.
3. **Poisson-binomial independence correction** — real item/topic correlations change the true P(≥18/20) variance. Does a correlated/copula or empirical-covariance model materially move the calibrated number?
4. **SSP-MMC → calendar-date retargeting** — exact adaptation from memory-state goal to fixed exam date, incl. the coverage-vs-reinforcement tradeoff.

---

## 6. Key sources (all primary unless noted)
- FSRS optimizer / benchmark / lib: `github.com/open-spaced-repetition/{fsrs-optimizer, py-fsrs, srs-benchmark, SSP-MMC-FSRS}`
- HLR: Settles & Meeder, *A Trainable Spaced Repetition Model* (ACL 2016) — research.duolingo.com/papers/settles.acl16.pdf
- BAMA: arXiv 2103.03766 · BKT: arXiv 2105.15106v4
- SSP-MMC: Su et al., IEEE TKDE 2023 (10.1109/TKDE.2023.3251721)
- Calibration: Niculescu-Mizil & Caruana, ICML 2005 · ECE critique: arXiv 2501.19047v2
- Driving-app model comparison: Randazzo MSc thesis, PoliMi (DASH/IRT/HLR on Swift; *non-peer-reviewed, some numbers only partly re-verifiable*)
- Birdbrain: IEEE Spectrum "How Duolingo's AI Learns"; making.duolingo.com

*Full verified-claim JSON + evidence quotes + vote tallies: research task `wb4try0d2`.*

---

# Round-2 deep dives — the four open questions answered (2026-07-07)

Second research pass (105 agents, **22/25 verified 3-0, 3 refuted** — the refutations are as useful as the confirmations). Closes §5's open questions with concrete recipes.

### Q1 answer — Competitor teardown → our differentiator is confirmed and precise
- **vodiy.ua** (the leading Ukrainian ПДР site) mirrors the official ТСЦ format **exactly — 20 questions / 20 min / ≤2 wrong** (confirms our `P(≥18/20)` dial target), but its practice modes are **only static rule-based filters** ("recommended" = unanswered/wrong, "review mistakes", random-order). **No per-user memory-state SRS, no FSRS, no calibrated pass-probability.** *(Scope the claim precisely: "no per-user memory-state SRS + no calibrated P(pass)" — a broader "no adaptivity at all" was **refuted 0-3** for overreach; they do have population-level difficulty aggregates. And vodiy internals are inferred from public UI — state it as "no public evidence," not proven absence.)*
- **No consumer exam-prep app found** (UK DVSA apps, UWorld, bar prep) **exposes a calibrated pass-probability** — genuine white space.
- **Birdbrain**: HLR (`ĥ=2^(Θ·x)`, `p=2^(−Δ/ĥ)`) is the best *published* proxy but current Birdbrain has evolved to IRT ability×difficulty. *(The HLR training-loss hyperparameters were **refuted 0-3** — don't cite λ=0.1/α=0.01 as fact.)*
- **→ Our moat, sharpened:** a **calibrated FSRS + Poisson-binomial readiness dial is a genuinely ownable differentiator** — nobody in the driving-theory space ships it.

### Q2 answer — Cold-start shrinkage recipe (concrete)
- **Regularize the per-user weight vector TOWARD the population vector, not toward zero:** a modified LASSO penalizing **`λ·Σ|β_k − β̄_k|`** (β̄ = population/published FSRS weight) instead of `λ·Σ|β_k|` — an **empirical-Bayes Laplace prior centered on the population estimate**. **λ chosen by cross-validation.** (arXiv 1710.03866, objective verbatim; only the *principle* transfers since FSRS's loss is a power-forgetting-curve not logistic — but that principle is exactly what we need.)
- **In-practice cadence:** start every user on **population defaults**; begin CV-regularized personal fitting once they have a modest history; **re-optimize at most monthly, or every time the review count doubles (100→200→400…)**. Anki 24.06.3+ allows personal opt at *any* count (older ≈1000, briefly 400). *(A documented 3-tier preset→aggregate→global fallback was **refuted 1-2** — treat it as regularized blending, not a fixed hierarchy.)*

### Q3 answer — Poisson-binomial independence correction (this one matters for honesty)
- The independence assumption is **materially wrong** for correlated within-topic items, and **quantifiably so**: the PB distribution equals the psychometric compound-binomial and **Lord-Wingersky IS the PB recursion — but only under *local independence* (conditional on ability θ)**. Ignoring within-topic (testlet) dependence **overstates confidence**: ~**20% reliability overstatement** in Cai's example; **ρ=0.35 → ~43% effective-information loss** (30 correlated items ≈ 17 independent). A user uniformly weak on "priority signs" fails several correlated items together — our current dial **over-states** their readiness.
- **Two implementable fixes:**
  - **(A, principled)** a **bifactor / per-topic latent-ability factor** (secondary latent variable loading only on a topic's items; Liu & Thissen), with **Lord-Wingersky 2.0** giving the *exact* correlated score distribution.
  - **(B, cheap drop-in — ship first)** **beta-binomial overdispersion**: keep the independent PB mean, **inflate the variance by the design effect `1 + (n−1)·ρ`**, with intraclass **`ρ_p = 1/(α_p+β_p+1)`**, fitting **ρ per topic from logged within-topic response correlation**.
- *(Magnitudes come from psychometric/speech examples — the mechanism transfers, but the **actual ПДР within-topic ρ must be measured from our own review logs** before we know how much the tail shifts.)*

### Q4 answer — Exam-date scheduling (a layer on FSRS, not a replacement)
- **RemNote Exam Scheduler** is the production template: it **dips desired retention to 70% during the maintenance period, then ramps back to ~90% in a consolidation window** as the exam nears, and **compresses the schedules of recently-forgotten cards** near the date. So: **make target retention a function of days-until-exam (dip, then ramp to ~0.9), and reinforce at-risk items last.**
- **fsrs4anki-helper** offers **Advance** (bring undue cards forward, retrievability-based, minimal long-term damage), **Postpone**, and **Load Balance** (spread reviews within fuzz). *(Advance is a manual one-shot, not a calendar-parametrized optimizer — RemNote is the better model for true fixed-date targeting.)*
- **"You're ready" gate:** calibrated **P(pass) ≥ a conservative bound (~0.9 under the correlation-corrected dial)** — *our synthesis, not a cited standard; no published driving-theory threshold exists.*

### How Round-2 updates the roadmap
- **Wave B gains a cheap, high-honesty task:** the **beta-binomial variance inflation** (Q3-B) on the readiness dial — small change to the DP, fixes the over-confidence when a user is uniformly weak in a topic. Fit `ρ` per topic from review logs (needs some data, but modest).
- **Wave C exam-date scheduling** now has a concrete policy: **desired-retention(days-to-exam) dip→ramp-to-0.9 + reinforce-failed-last**, gated "ready" at calibrated P(pass) ≥ ~0.9.
- **Per-user weight wave** (data-gated) now has its exact math: **CV-tuned LASSO-toward-population-vector**, re-opt on the doubling schedule.

### Remaining true unknowns (need OUR data, not more web research)
1. The **empirical within-topic ρ** for the ПДР corpus (→ how much the corrected dial actually moves). Measure from review logs.
2. A **closed-form desired-retention(days-until-exam)** tuned for a 2300-item bounded corpus + the coverage-vs-reinforcement allocation.
3. Current **Birdbrain** internals beyond the 2016 HLR paper (likely unpublishable).
4. The **defensible P(pass) "ready" threshold** for a real ПДР pass, and how the unseen-item prior interacts with the correlation correction near the deadline.

*Round-2 verified-claim JSON + evidence: research task `w27sb86ih`. Key new sources: vodiy.ua/en/testy-pdr, arXiv 1710.03866 (shrink-to-prior LASSO), PMC4366368 (Lord-Wingersky 2.0), PMC10848658 (beta-binomial ρ), help.remnote.com exam-scheduler, ankiweb FSRS FAQ.*
