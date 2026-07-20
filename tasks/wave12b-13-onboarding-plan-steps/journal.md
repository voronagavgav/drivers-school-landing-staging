# Task: wave12b-13-onboarding-plan-steps

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §E first bullet: onboarding grows OPTIONAL exam-date and daily-goal steps (skippable, ≤3 steps
total) and finishes by showing the first plan.

PASS = ALL true:

1. `app/(app)/onboarding/page.tsx` (plus any child components) implements a ≤3-step flow:
   Step 1 category (existing radios, **B default preserved** — the UX-FINDINGS fix must survive);
   Step 2 exam date (optional); Step 3 daily goal (optional). A step indicator «Крок N з 3» renders.
2. Steps 2 and 3 each have a «Пропустити» affordance that advances without writing anything.
3. The exam-date and daily-goal writes go through the EXISTING W11 actions `setExamDateAction` /
   `setDailyGoalAction` from `@/lib/server/study-profile` (grep imports — no new mutation paths).
4. Finishing (after step 3 or its skip) shows the first-plan message derived from
   `getStudyPlan`/`computeStudyPlan` (grep one of them in the onboarding files): when an exam date was
   set and the plan is feasible the copy contains «встигаєш спокійно»; without a date it falls back to
   the daily-goal framing. A single CTA then leads to /dashboard.
5. Category selection still WORKS end-to-end: submitting step 1 persists `selectedCategory` (reuse or
   minimally adapt `selectCategoryAction` — if its redirect target changes, /onboarding must still be
   reachable and the existing `onboarding_completed`/`category_selected` analytics events still fire
   exactly as before, grep both event names still recorded).
6. `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build` exit 0.
7. Browser (guarded): /onboarding (fresh-ish state not required — seeded user revisiting) renders the
   category radios and the step indicator text «з 3».

## Constraints / decisions
- Calm, skippable, never a wall: the user must be able to reach the dashboard with 2 clicks
  (category → пропустити → пропустити → готово is acceptable as 3).
- Date input: native `<input type="date">` is fine (Ukrainian labels around it; task 15 handles form
  validation copy elsewhere).
- Non-Goal: /account editing (task 14); re-onboarding existing users.
- DECIDED (2026-07-02): sequential SERVER steps via `?step=` searchParam — no client stepper state.
  Page stays a server component; `step` ∈ {1(default), 2, 3, done}. Step 1 = existing category form;
  change `selectCategoryAction`'s final redirect `/dashboard` → `/onboarding?step=2` (only onboarding
  imports it; analytics lines untouched so `category_selected`/`onboarding_completed` fire as before).
  Steps 2/3 = forms whose actions are INLINE `"use server"` fns in the onboarding page files calling
  `setExamDateAction`/`setDailyGoalAction` then `redirect("/onboarding?step=3"|"?step=done")` — inline
  (not app/actions/*) because verify.sh greps ONLY `app/(app)/onboarding/*.tsx` + `components/*.tsx`
  (maxdepth 1) for those tokens. «Пропустити» = plain `<Link href="?step=3|done">` (writes nothing).
  Done screen: `await getStudyPlan(user.id)`; if profile.examDate set && plan.feasible &&
  plan.daysLeft != null → compose `~${daysLeft} днів × ${dailyQuota} питань — встигаєш спокійно`
  (the literal is NOT in lib/study-plan.ts messages — the page composes it, satisfying the gate's
  `hitF 'встигаєш спокійно'`); else render `plan.message` (daily-goal framing). Single CTA → /dashboard.
  Indicator «Крок N з 3» on steps 1–3; done screen is the finish, not a step. Keep the
  `defaultCategoryId`/`"B"` block in page.tsx verbatim (gate greps `"B"|defaultCategory` in $O).

## Plan
- [x] Read WAVE12B-SURFACES.md §Settings + forms; read current onboarding + selectCategoryAction.
- [x] Build the stepper (client state or sequential server steps — pick the lightest).
- [x] Wire the two W11 actions + first-plan screen.
- [x] Suite + verify.sh.

## Done
- [x] Read onboarding page, selectCategoryAction, study-profile actions, getStudyPlan/computeStudyPlan,
      surfaces doc §Settings+forms, and this task's verify.sh; picked the stepper shape (see
      Constraints/decisions DECIDED bullet).
- [x] Implemented the `?step=` server stepper in `app/(app)/onboarding/page.tsx` (steps 1–3 + done,
      «Крок N з 3» indicator, inline `"use server"` wrappers around setExamDateAction/
      setDailyGoalAction, «Пропустити» links, done screen composing «встигаєш спокійно» when
      `plan.daysLeft != null && plan.feasible` else `plan.message`, LinkButton CTA → /dashboard);
      flipped selectCategoryAction's redirect to `/onboarding?step=2` (analytics lines untouched).
      typecheck ✓, npm test 466/466 ✓, all verify.sh grep gates ✓ (under bash).
- [x] Ran the full suite green: build ✓, db:seed ✓, test:integration 26 files / 94 passed + 2 skipped ✓;
      restarted the LAN `next start -H 0.0.0.0 -p 3100` server on the fresh build (stale-server trap),
      `npm run audit:browser` 19/19 ✓; Goal 7 browser check: authed /onboarding renders 8 category
      radios and the «Крок 1 з 3» indicator (textContent contains «з 3»; visually uppercased by CSS).
      Full `bash tasks/wave12b-13-onboarding-plan-steps/verify.sh` → PASS wave12b-13.

## Next
- [ ] Nothing — Goal fully met, Status: done.

## Artifacts
- app/(app)/onboarding/page.tsx (the whole stepper — no child components needed)
- app/actions/user.ts (selectCategoryAction redirect → /onboarding?step=2)

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 ClPcs-Mac-mini: investigation tick — read onboarding page.tsx (B-default block at lines
  14–19), app/actions/user.ts selectCategoryAction (redirects /dashboard, fires category_selected +
  onboarding_completed-on-first), lib/server/study-profile.ts (both W11 actions return state, no
  redirect), lib/study-plan.ts + lib/server/study.ts getStudyPlan (feasible message does NOT contain
  «встигаєш спокійно» — page must compose it), WAVE12B-SURFACES.md §Settings+forms (actions unwired
  to any UI), and verify.sh (token greps scoped to app/(app)/onboarding/*.tsx + components/*.tsx
  maxdepth 1). Decided: sequential server steps via ?step= searchParam with inline "use server"
  wrapper actions in the page files; decision recorded under Constraints/decisions. No code yet.
- 2026-07-02T10:10:51Z ClPcs-Mac-mini: implemented the stepper — rewrote app/(app)/onboarding/page.tsx
  as the 4-branch `?step=` server component (category step preserved verbatim incl. the B-default
  block; steps 2/3 = date/number forms posting to inline "use server" wrappers that call
  setExamDateAction/setDailyGoalAction then redirect to the next step, error → same step; skip =
  plain Links; done = getStudyPlan + composed «~N днів × M питань на день — встигаєш спокійно.» when
  daysLeft!=null && feasible, else plan.message; CTA LinkButton → /dashboard). Flipped
  selectCategoryAction's final redirect /dashboard → /onboarding?step=2 (only onboarding imports it;
  both analytics recordEvent lines untouched). typecheck ✓, npm test 466 passed ✓, verify.sh grep
  gates dry-run ✓ under bash (NOTE: the dry-run false-failed under zsh — unquoted $files doesn't
  word-split there; verify.sh is bash so it's fine). Build/integration/browser = next tick.
- 2026-07-02T10:18:50Z ClPcs-Mac-mini: suite tick — npm run build ✓ (/onboarding in route list),
  npm run db:seed ✓ (2322 official questions), npm run test:integration ✓ (26 files, 94 passed /
  2 skipped). Killed the stale next-server (pid 92385, pre-dated the fresh build) and relaunched
  `npm run start -- -H 0.0.0.0 -p 3100`; npm run audit:browser 19/19 PASS. Goal 7: logged in as
  user@drivers.school via agent-browser, /onboarding renders 8 category radios + step indicator
  (main textContent contains «з 3» — asserted via `agent-browser eval` because innerText is
  CSS-uppercased to «КРОК 1 З 3» and React SSR comment nodes split the HTML string). Full verify.sh
  → PASS wave12b-13. Status → done.



## Verify
**Last verify:** PASS (2026-07-02T10:21:56Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T10:24:15Z)
