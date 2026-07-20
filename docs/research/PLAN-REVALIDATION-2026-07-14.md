# Study-plan re-validation under wave20 grading (2026-07-14)

Simulation probe with the REAL engine (`schedule`/`deriveGrade`/`slipAdjustedLapse`/
`computeStudyPlan`, deterministic LCG, cat-B pool 1739, measured option mix 21/47/20/11.5%,
due-first answering at the plan's own prescribed quota). OLD = pre-wave20 grading (g=0.25,
wrong→Again). NEW = wave20 (honest g, slip-adjusted lapses).

## Verdict 1: wave20's effect on the plan is NEGLIGIBLE-to-FAVORABLE — no re-tuning needed

| horizon, p=0.75 | d1 quota | week-1 quotas | total answered | infeasible days |
|---|---|---|---|---|
| 45d OLD | 39 | 39,39,40,41,42,43,43 | 4570 | 42 |
| 45d NEW | 39 | 39,39,40,41,41,42,43 | 4545 | 42 |
| 60d OLD | 29 | 29..32 | 4887 | 38 |
| 60d NEW | 29 | 29..31 | 4817 | 38 |
| 90d OLD | 20 | 20..21 | 5299 | 35 |
| 90d NEW | 20 | 20..21 | 5190 | 35 |

Accuracy sensitivity (60d): p=0.6 OLD 6062 answered vs NEW **5557 (−8.3%)**; p=0.9 OLD 4061 vs
NEW 4212 (+3.7%). WHY: the slip-adjusted lapse SAVES review churn (wrongs on known items no longer
come back in 61h), and at realistic accuracy that offsets or beats the honest guess floor's shorter
first intervals (Hard S0=1.29d vs Good 3.17d). The review's scope-note worry ("materially raises
near-term queue volume") is empirically MILD: week-1 quotas are equal-or-lower under wave20; the
onboarding first-plan numbers («~N днів × M питань») are IDENTICAL. The wave20-06 GRADE-SHIFT-NOTE
per-card numbers stand, but the SYSTEM-level effect nets out.

## Verdict 2: a PRE-EXISTING plan-formula defect, surfaced by the same probe (NOT wave20's doing)

`computeStudyPlan`'s `dailyQuota = ceil((unseen + due)/daysLeft)` models the work as ONE-SHOT, but
due cards REGENERATE (every answered card re-enters the due pool at its next interval). On the real
pool the displayed quota therefore EXPLODES as the exam approaches — identically under OLD and NEW:

- last-5-days displayed quotas (45d horizon): 204, 245, 295, 381, **603 питань/день**;
- 35–42 of the horizon's days show quota > MAX_DAILY_QUOTA(40) ⇒ the dashboard tells a user who is
  DOING EVERYTHING RIGHT «Не встигнете за N дн.: потрібно ~600 питань на день» — punitive, false
  (due flow is maintenance, not one-shot work), and against the calm-first thesis. The
  `workRemaining === 0` maintenance branch is unreachable in practice (with 1739 seen cards, due is
  never 0).

This is the actual follow-up defect. Fix = wave21 (`specs/wave21-plan-honesty.md`): model unseen
(one-shot) and due (flow) separately — `quota ≈ ceil(unseen/daysLeft) + dailyReviewLoad`, feasibility
and message classes re-derived, near-exam caught-up users get maintenance framing, never the
«не встигнете» threat (pass-likelihood is the DIAL's job, not the plan's).
