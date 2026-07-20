# Task: mvp-finish-05-surface-question-stats-admin-ui

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** ClPcs-Mac-mini

## Goal
Surface per-question performance in the admin questions area (Part A UI), using the helper from
task 04. Implemented as a dedicated stats section on the existing `/admin/questions` page.

1. `app/admin/questions/page.tsx` imports and calls `getQuestionPerformance` from `@/lib/server/admin`
   and renders a dedicated stats section (a `<Card>` with a `SectionTitle`, e.g. «Статистика питань»)
   listing questions HARDEST-FIRST (as returned by the helper).
2. Each row in the stats section shows the question text (or a truncated form) AND its numbers:
   times-answered and accuracy as a percentage (e.g. `Math.round(accuracy * 100)` + `%`).
3. Demo questions in the stats section render the existing `<DemoBadge />` (imported from
   `@/components/ui`) when the entry's `isDemo` is true — the demo-labelling requirement is preserved.
4. The page degrades gracefully when there is no answer data: if the helper returns an empty array,
   the section shows a short Ukrainian empty-state message instead of an empty list (no crash).
5. The existing question list and tabs on the page remain intact (no existing functionality removed).
6. `npm run typecheck` exits 0; `npm test` still passes; `npm run build` is NOT required by this gate.
7. BROWSER (when the app is served and `$DRIVER_BROWSER_CMD` is set): navigating an authenticated
   content-manager session to `/admin/questions` shows the «Статистика питань» section heading and
   at least one accuracy `%` value (or the empty-state message when there is no data). verify.sh
   performs this check when possible and otherwise falls back to static source assertions for 1–5.

## Constraints / decisions
- Edit ONLY `app/admin/questions/page.tsx`. Do NOT change the server helper (task 04), the pure lib,
  the admin nav/layout, or add a new route. The stats live on the EXISTING `/admin/questions` URL so
  there is a single stable page to verify.
- Reuse existing `@/components/ui` primitives (`Card`, `SectionTitle`, `Badge`, `DemoBadge`); do not
  introduce a new component file. Keep Ukrainian copy consistent with the rest of the admin area.
- Display the full hardest-first list returned by the helper (it is admin-only, read-only). A simple
  top-of-page or bottom-of-page placement is fine; do not restructure the existing list rendering.
- Non-Goal: charts, sorting controls, CSV export, pagination, per-question drill-down pages.

## Plan
- [x] In `page.tsx`, `await getQuestionPerformance()` alongside the existing `listQuestions` call.
- [x] Render a `<Card>` stats section (SectionTitle + rows: text, times-answered, accuracy%, DemoBadge).
- [x] Add the empty-state branch.
- [x] `npm run typecheck` && `npm test`; if app is serveable, browser-check `/admin/questions`.

## Done
- [x] Wired `getQuestionPerformance` into `app/admin/questions/page.tsx` (Promise.all with `listQuestions`)
      and rendered a «Статистика питань» Card section: hardest-first rows showing question text,
      `Math.round(accuracy * 100)%`, times-answered, plus `<DemoBadge />` for demo entries and an
      Ukrainian empty-state. Existing list/tabs untouched. verify.sh PASS (typecheck 0, 38/38 tests).

## Next
- [ ] None — Status: done. (verify.sh passes: static grep gate + typecheck + 38/38 unit tests; browser check skipped, no DRIVER_BROWSER_CMD.)

## Artifacts
- tasks/mvp-finish-05-surface-question-stats-admin-ui/verify.sh — static render assertions (+ optional browser) + typecheck/test
- app/admin/questions/page.tsx — stats section

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T09:22Z ClPcs-Mac-mini: implemented the «Статистика питань» stats section in
  app/admin/questions/page.tsx — Promise.all(listQuestions, getQuestionPerformance); Card with
  SectionTitle, hardest-first rows (text, accuracy%, times-answered, DemoBadge), empty-state branch.
  Ran verify.sh → PASS (typecheck exit 0; npm test 38/38; browser check skipped). Status → done.

## Verify
**Last verify:** PASS (2026-06-17T06:22:55Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T06:24:08Z)
