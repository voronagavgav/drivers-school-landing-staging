# Session handoff — 2026-07-12 → 13 (readiness/calibration campaign)

Resume anchor. Everything committed + pushed to `voronagavgav/Driving` @ `main`.
Authoritative detail: `PLAN.md` (2026-07-12/13 entries) · specs `wave19b-readiness-honesty.md`,
`wave19c-estimation-side-rho.md` · research `docs/research/READINESS-DEEP-DIVE-2026-07-12.md`,
`RHO-CORRECTION-RESEARCH-2026-07-12.json`.

## What shipped (one autonomous campaign, Danil directive: "make readiness perfectly designed and calibrated")
1. **Wave 19a Part 2** — calibration ground-truth pipeline: `PassOutcome`, `lib/calibration-metrics.ts`
   (Brier/LogLoss/ECE/Platt, frozen oracles), `recordExamOutcome` (self-only, honesty-law-gated),
   capture UI, admin `/admin/calibration`.
2. **Wave 19b** — honesty redesign: BKT guess/slip grade inference (latency demoted to cap-only),
   blueprint section bucketing fixed (stable questionKey; exam-blueprint test un-skipped),
   constants consolidation, dial disclaimer, inputsJson version tags. **Adversarial review caught the
   headline ρ tail-inflation as direction-INVERTED (raised weak students' dials); neutralized
   (`READINESS_TOPIC_CORRELATION=0`) + binding gate `lib/readiness-honesty.regression.test.ts` +
   evaluator REJECT trigger (e) for fixture-population dodging added to ~/mesa driver.sh.**
3. **Wave 19c** — the CORRECT correction, research-grounded (deep-research, 3-0 votes/claim):
   estimation-side Kish n_eff + Jeffreys shrink, min-clamped; tier **mean** LIVE, quantile parked;
   `dialIndep` recorded per snapshot. Proof + gates: dial ≤ independence baseline for every student.
   Review: 0 defects, 1 minor nit (fixed: pinned 0/0 + 34/100 magnitudes).
4. **Collection hardening (2026-07-13)**: `PassOutcome.readinessSnapshotId` (engine-version
   segmentation for future recalibration) + `ReviewLog.engine` (= `REVIEW_ENGINE_VERSION`
   "fsrs6-bkt1", lib/fsrs/constants.ts — BUMP on any grade-semantics change) + nightly-readiness
   launchd agent staged in `ops/`.

## Verify state at wrap
typecheck 0 · **694 unit · 269 integration (0 skipped)** · build green · migrate-diff drift EMPTY ·
browser audit **82/82** (fresh build + restarted :3100 server) · 19b honesty gate byte-intact.

## ✅ RESOLVED LATER SAME SESSION (2026-07-13 evening — see PLAN.md ec8129f)
Waves **19d + 19e + hotfix** replaced the broken 19c shrink entirely: official 10/4/4/2 blueprint
(dial + exam sim), "lm-gh1" release model (seen unshrunk / unseen at clamped Jeffreys C / GH factor
mixture, min-clamp), mock anchor restored (19d had dropped it via the suspend-and-defer dodge — now
evaluator trigger (f)), empty-stratum boundary fixed (review MAJOR). Release verified: 0.95-rich
39→92%, perfect →100%. 728 unit · 275 integration (0 skips) · audit 82/82 · pushed.
Remaining owner items below still stand (nightly install · Gate-0); the dial-feel item is now a REAL
taste call on honest numbers.

## ⚠ OWNER ACTIONS (Danil)
- **Install the nightly recompute** (auto-mode blocked persistence, correctly):
  `cp ops/com.drivers-school.nightly-readiness.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/com.drivers-school.nightly-readiness.plist`
- ~~Dial feel~~ **SUPERSEDED 2026-07-13 (Danil's challenge, numerically confirmed): the 19c shrink is a
  DEFECT, not taste** — n_eff caps at 1/ρ≈3.33 forever, so the correction never releases with evidence:
  a PERFECT student (p̂=1.0, 1000 seen) caps at dial 59%, p̂=0.95 at 39%; the «готовий» band is
  structurally unreachable. Root cause: my spec mapped n = seen ITEMS (1 Bernoulli draw each),
  discarding per-item review histories, and shrank the topic MEAN when the PB needs per-item p's.
  Fix = **wave19d** (research running: evidence-decaying correction, release property (b) as a binding
  gate alongside never-above-independence (a), sparse-block discount kept (c)). No live users yet
  (Gate-0 parked) so the mis-shrink harms nobody today; constants stay as-shipped until 19d replaces them.
- **Gate-0 unchanged**: public origin + LiqPay/Fondy — the data flywheel (real PassOutcome rows) starts there.

## What is DATA-GATED (do not build without users)
Wave C: per-user FSRS weight fits (needs ReviewLog volume; segment by `engine` tag), exam-date-aware
scheduling, POMDP stopping rule, empirical ρ (measureTopicCorrelation is wired), tier choice
mean-vs-quantile (admin calibration view + dialIndep comparison once PassOutcome rows accrue).

## Deferred backlog (unchanged)
Postgres migration (before real traffic scales) · Web Push · monetization · SIGN_TRAINER recognition
sub-mode · restyle (20 pending + ~1000 un-restyled). Design: RESET 2026-07-12 — from zero, old
pdr-design/liquid-glass skills deleted; landing untouched this session.
