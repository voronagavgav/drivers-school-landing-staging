# Wave 12b — Close-out

Close-out summary for Wave 12b (spec: `WAVE12B-SURFACES.md`; gate: task wave12b-18).
Date: 2026-07-02. All checks below refer to the verify gate in
`tasks/wave12b-18-verify-wave12b/verify.sh`.

## Gate results

- Local suite green: `npm run typecheck`, `npm test` (44 files / 487 tests),
  `npm run build`, `npm run db:seed` (2322 official questions upserted),
  `npm run test:integration` (27 files, 97 passed + 2 skipped — the documented
  ctx.skip data-precondition pattern) — all exit 0.
- Schema drift ZERO: `prisma migrate diff` emits no DDL. W12b added **no migrations**
  (as planned — all §A–§G work rode existing columns).
- All 5 new unit suites + 3 new integration suites collected by vitest
  (recommend-action, confidence-sampling, result-topics, runner-input, topic-map;
  finalize-session, answer-confidence, glass-tier-setting).
- Real transport: `bin/browser-audit.sh` 30 passed / 0 failed against
  http://100.110.64.90:3100 (two consecutive runs, task 17); design-shots PNGs present.
- Scope law respected: `.lens` on exactly ONE surface (the readiness dial);
  `app/(app)/` route set unchanged (9 dirs); zero PWA/push/monetization artifacts
  (W10f spike configs untouched).

## Per-task status

| Task | Deliverable | Status |
|---|---|---|
| wave12b-01-investigate-surfaces | Written surface map (`WAVE12B-SURFACES.md`) driving tasks 02–17 | done |
| wave12b-02-recommend-action-pure | §A recommended-action decision matrix as a pure module | done |
| wave12b-03-confidence-sampling-pure | §D deterministic ~1-in-5 confidence sampling (pure hash, no `Math.random` in lib/) | done |
| wave12b-04-finalize-session | §G retryable post-finish recompute + goal-met streak reconcile (`finalizeSession`) | done |
| wave12b-05-confidence-followup-action | §D follow-up server action recording confidence after first submit | done |
| wave12b-06-dashboard-dial-hero | §A readiness dial as dashboard hero (the one honest metric) | done |
| wave12b-07-dashboard-plan-exam | §A/§C «Сьогоднішній план» card + consolidated `#exam` block | done |
| wave12b-08-practice-adaptive-cards | §B adaptive family learner-visible on /practice with live due-count badge | done |
| wave12b-09-result-screen-topics | §C result-screen corrective topic summary + outcome-appropriate copy | done |
| wave12b-10-runner-sticky-chrome | §D sticky compact runner header (timer never scrolls away) | done |
| wave12b-11-runner-input-behaviors | §D digit keys, swipe nav, explanation auto-scroll, reload-resume | done |
| wave12b-12-confidence-chip-ui | §D sampled optional never-blocking «Наскільки впевнено?» chip row | done |
| wave12b-13-onboarding-plan-steps | §E optional exam-date + daily-goal onboarding steps (skippable, ≤3 steps) | done |
| wave12b-14-account-settings | §E /account exam-date + daily-goal settings (inline-"use server" wrapper pattern) | done |
| wave12b-15-forms-uk-validation | §E Ukrainian client-side validation, `role="alert"` error elements | done |
| wave12b-16-progress-topic-map | §F /progress «Карта тем» — topics grouped by mastery band, anti-leaderboard | done |
| wave12b-17-audit-extensions | §H four new browser-audit lanes (fresh-user, spaced-empty, plan-card, exam-result) | done |
| wave12b-18-verify-wave12b | this close-out gate | done |

## Deviations from spec / conventions

- **wave12b-05**: the `$transaction` DB logic is inlined in `app/actions/test.ts` instead of
  the house-convention `lib/server/*` helper — the task's verify gate pinned the token to
  that file. Journaled; acceptable, but a candidate for a refactor once the gate retires.
- **wave12b-08**: a legacy comment naming a later section's token had to be reworded to
  satisfy the first-mention ORDER gate (comment-only change, no behavior).
- **wave12b-16**: «Вивчаю» deliberately means different bands on /progress group headings
  (weak/unseen) vs the `MASTERY_LABEL` badge (learning) — a page-local map per spec §F,
  NOT a shared constant. Copy asserts must know which surface they probe.
- `.lens` shipped on ONE surface only (the dial); the scope law allowed up to 2 — the
  second signature surface was intentionally not spent.

## Bugs found & fixed during the wave (fix-forward)

- STALE-SERVER second symptom (wave12b-10/12): `npm run build` under the live `next start`
  replaces content-hashed client chunks → dead clicks/blank renders on client-nav while
  URL-level asserts stay green. Standing rule: restart the LAN server after any client-code
  build before auditing.
- agent-browser click flakes (wave12b-17): substring `find text` hit overlay-covered
  elements; locate-then-click raced React re-renders during in-flight server actions.
  Fixed with atomic exact-textContent eval clicks + retry-until-URL-changes.

## Deferrals / candidates for W12b review & W13 spec

- `bin/design-shots.sh` result step is still best-effort (`skip` on miss) and its old
  «Завершити»×2 finish flow never actually reached /result — port the audit's atomic
  eval-click finish sequence to it so the result shot is real, not skipped.
- Image prebake pipeline (sharp AVIF/WebP `<picture>` sources, spike wave10f-18) — planned
  W13, untouched here.
- PWA/service-worker (`@serwist/next` spike wave10f-17) — W13/14 scope, untouched.
- CLAUDE.md `## Learnings` section still exceeds the 30-bullet cap after task 17's merge
  pass (41→ still over) — future ticks should keep merging/pruning.
- Second `.lens` surface (scope law allows ≤2) — available budget for a W13 signature
  moment if the design wants it.
