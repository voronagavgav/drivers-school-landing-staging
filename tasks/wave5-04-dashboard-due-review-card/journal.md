# Task: wave5-04-dashboard-due-review-card

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-22
**Last compute:** cloud-agent

## Goal
Spec A (UI surface). Add a dashboard card "N питань на повторення сьогодні" that links to
MISTAKE_PRACTICE, driven by `countDueMistakes` (wave5-03). Mobile-first, Ukrainian, keyboard-operable.
Depends on wave5-03. No pure-logic or server-helper changes here.

1. `app/(app)/dashboard/page.tsx` imports `countDueMistakes` from `@/lib/server/mistakes` and calls it
   with the current user's id (`await countDueMistakes(user.id)`).
2. When the due count is `> 0`, the page renders a card whose visible Ukrainian copy contains the
   substring `на повторення` and shows the numeric count, with a CTA that starts MISTAKE_PRACTICE via
   the existing `startTestAction` form pattern (`<form action={startTestAction}>` with
   `<input type="hidden" name="mode" value="MISTAKE_PRACTICE" />` and a `SubmitButton`) — i.e. it does
   NOT invent a new start path.
3. When the due count is `0`, the card is hidden OR shows an encouraging empty state (the page must not
   render a "0 питань на повторення" CTA that starts an empty MISTAKE_PRACTICE). This branch is present
   in the source as a conditional on the count.
4. The card reuses existing UI primitives (`Card`, `SubmitButton`, etc. from `@/components/ui` /
   `@/components/submit-button`) and the road-sign design system; no colour-only signalling.
5. `npm run typecheck` exits 0.
6. `npm run build` exits 0 (the dashboard route compiles).

## Constraints / decisions
- Reuse the EXISTING `startTestAction` form pattern already used by the MISTAKE_PRACTICE quick-start
  card — do not add a new server action or route.
- Keep the change scoped to the dashboard card + the one `countDueMistakes` call. Do NOT alter the
  existing readiness/streak/quick-start cards or other modes.
- Ukrainian copy only; preserve the demo/legal positioning (no official-exam claims). Keyboard-operable
  (the CTA is a real submit button inside a form — inherits focus/Enter).
- Manual/real-transport check (NOT a blocking gate here, run once before claiming the UI verified):
  `npm run audit:browser` against the non-localhost origin (see CLAUDE.md REAL-TRANSPORT GATE).
- Non-Goal: a separate /review route, reordering the dashboard, changing `countDueMistakes`.

## Plan
- [x] Import + call `countDueMistakes(user.id)` in the dashboard server component.
- [x] Render the due-review card (count > 0) + empty/hidden branch (count === 0).
- [x] `npm run typecheck` + `npm run build`; run verify.sh.

## Done
- [x] Imported `countDueMistakes` from `@/lib/server/mistakes`; call `await countDueMistakes(user.id)` → `dueReviewCount`.
- [x] Added the due-review `Card` (rendered only when `dueReviewCount > 0`) with Ukrainian copy containing `на повторення`, the numeric count, and a `MISTAKE_PRACTICE` CTA via the existing `StartButton`/`startTestAction` form. Count `0` → card hidden (conditional in source).
- [x] Added `questionsPlural()` helper for correct Ukrainian plural of «питання».
- [x] verify.sh PASS (typecheck 0, build 0, all greps green).

## Next
- [ ] (none — goal met). Optional, non-blocking: `npm run audit:browser` against the non-localhost origin to eyeball the card for a logged-in user (REAL-TRANSPORT GATE).

## Artifacts
- app/(app)/dashboard/page.tsx — adds the "на повторення" due-review card + `countDueMistakes(user.id)` call + `questionsPlural` helper.
- tasks/wave5-04-dashboard-due-review-card/verify.sh — import/render/typecheck/build gate.

## Log
- 2026-06-22 cloud-agent: scaffolded by planner.
- 2026-06-22T00:00Z ClPcs-Mac-mini: wired `countDueMistakes(user.id)` into the dashboard server component and rendered the due-review card (lane-toned, count > 0 conditional, MISTAKE_PRACTICE CTA via existing StartButton/startTestAction). Added `questionsPlural()` for Ukrainian plural. verify.sh PASS (typecheck 0, build 0). Status → done.

## Verify
**Last verify:** PASS (2026-06-22T19:12:27Z)

## Evaluation
**Last evaluation:** PASS (2026-06-22T19:13:24Z)
