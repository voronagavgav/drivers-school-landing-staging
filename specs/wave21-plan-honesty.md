# SIGNAL — Wave 21: study-plan honesty (fix the one-shot work model)

Source: `docs/research/PLAN-REVALIDATION-2026-07-14.md` (read it first — simulation numbers with the
real engine). Wave20's grading shift needs NO plan re-tuning (verdict 1). The defect is
PRE-EXISTING (verdict 2): `computeStudyPlan` (`lib/study-plan.ts`) treats due reviews as one-shot
work, so on the real cat-B pool the dashboard's displayed daily quota explodes toward the exam
(last 5 days: 204→603 питань/день) and 35–42 days of every horizon show the punitive
«Не встигнете…» message to users doing everything right. The maintenance branch
(`workRemaining === 0`) is unreachable in practice (due never hits 0 with a seen pool).

## Goal
The plan surface must stay HONEST and CALM on the real pool: unseen questions are one-shot work,
due reviews are a FLOW. A caught-up user near the exam sees maintenance framing with a truthful
review count — never an impossible quota or a «не встигнете» threat (pass-likelihood is the dial's
job, the plan only paces work).

## The model fix (design, settled by the probe — refine constants, not the shape)
`computeStudyPlan` input gains the review-flow signal; quota becomes
`dailyQuota = ceil(unseenCount / max(1, daysLeft)) + reviewLoad` where `reviewLoad` is the expected
DAILY due arrivals (server supplies it — see wiring). Feasibility = `ceil(unseen/daysLeft) +
reviewLoad ≤ MAX_DAILY_QUOTA`, BUT the message classes change:
- unseen > 0, feasible → the current pacing copy (same tone), quota as above.
- unseen > 0, infeasible → the honest can't-cover-everything copy MUST NOT threaten failure —
  reframe: покрити все не встигнете, тому пріоритезуйте (the queue already picks weakest-first);
  quota display CLAMPS to MAX_DAILY_QUOTA (never render a 3-digit daily demand).
- unseen == 0 (caught up) → MAINTENANCE class regardless of due count: «повторюйте ~{reviewLoad} на
  день до іспиту» — calm, truthful, no feasibility threat. This replaces the unreachable
  workRemaining===0 branch as the real steady state.
- examDate null / exam today branches keep their current semantics (exam-today quota also clamps).
`reviewLoad` (server, `getStudyPlan` in `lib/server/study.ts`): estimate expected daily due arrivals
from the user's ReviewState rows — `sum over seen cards of 1/max(1, stability)` rounded, computed in
the SAME JS join loop that already scans states (no new queries); cap at the category's seen count.
Rationale: a card at stability S is reviewed ~1/S per day in steady state. dueCount (snapshot
backlog) stays an input only for the exam-today branch.

## Deliverables (priority order)
1. **Python reference oracle** (`scripts/oracles/gen-wave21-oracles.py`, stdlib-only, committed
   FIRST): freezes (a) quota/feasible/message-CLASS over a grid incl. the explosion fixture
   (unseen=0, due=200, reviewLoad=45, daysLeft=3 → maintenance class, quota=reviewLoad, feasible
   irrelevant/true) and the old formula's failure on it (documented, not asserted); (b) clamp
   property: displayed quota ≤ MAX_DAILY_QUOTA whenever unseen>0-infeasible or exam-today-overflow;
   (c) monotonicity: quota non-increasing in daysLeft at fixed inputs; (d) reviewLoad estimator
   values on fixed stability vectors (6dp); (e) boundary census: daysLeft 0/1, unseen 0, dueCount 0,
   reviewLoad 0, defaultGoal interplay on the no-date branch (UNCHANGED — regression-pin it).
   Emit PREVERIFY-OUTPUT.txt-style stdout (static-judge evidence).
2. **Pure model** (`lib/study-plan.ts`): new input field(s) + the class logic above; message strings
   stay calm Ukrainian (mind the «не » same-line negation gate class — keep any «не гарантія»-like
   tokens off guarded words; do NOT introduce «не встигнете» in the unseen-infeasible copy).
   Existing unit tests re-frozen ONLY from the python oracle. Type ripple: `StudyPlan`/callers
   compile (dashboard reads dailyQuota/message/feasible — shape unchanged if fields are additive).
3. **Server wiring** (`getStudyPlan`): compute reviewLoad in the existing state-scan loop
   (stability must join the `select`), pass through; no new DB queries (assert query count via the
   existing pattern if a gate wants it). Onboarding first-plan path unchanged semantics for a
   fresh user (unseen=pool, reviewLoad=0 ⇒ quota == old formula's d1 value — pin this equality as
   the no-regression anchor: fresh-user plans are IDENTICAL to today).
4. **Simulation direction gate** (unit, pure): re-run a compact version of the re-validation sim
   (deterministic LCG, small synthetic pool ~120 cards, 30-day horizon, p=0.75) through the NEW
   computeStudyPlan: the DISPLAYED quota must never exceed MAX_DAILY_QUOTA once unseen==0, and the
   message class in the last 5 days must be maintenance — the exact property the old formula fails
   (pre-verify with a tsx probe; freeze from the run, expected values justified by the model, not
   read from the impl).
5. **Copy/UI check** (dashboard + onboarding): planMinutes math uses the new quota (clamped);
   onboarding «встигаєш спокійно» line unaffected for fresh users (equality anchor in 3); browser
   audit assertion for the plan card stays green.
6. **Verify-wave**: typecheck 0 · unit · db:seed then integration (0 skipped) · build · restart
   :3100 · audit:browser. FSRS vectors/wave20 oracles/readiness oracles byte-untouched (this wave
   touches NO lib/fsrs code).

## Out of scope
- Any lib/fsrs change (wave20 is closed; grading stays as shipped).
- Exam-date-aware review ALLOCATION (the beyond-current white-space item — separate future wave).
- dailyGoal semantics, streaks, notification copy.

## House rules
Pure logic in lib/ (injected clock, no Date.now). Oracle rule: expected values from the python
reference, never the TS impl. Evaluator artifacts: Acceptance table + PREVERIFY-OUTPUT.txt for
numeric criteria. db:seed BEFORE test:integration in any whole-wave gate. Model tiering: Opus bulk.
