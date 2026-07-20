# Task: mvp-finish-07-wire-readiness-trend-dashboard

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Wire the existing pure `readinessTrend()` into the user dashboard and render the Ukrainian trend
label near the readiness meter (Part B UI).

1. `app/(app)/dashboard/page.tsx` loads the signed-in user's recent readiness scores via
   `getRecentReadinessScores(user.id, user.selectedCategoryId)` (from `@/lib/server/progress`,
   task 06) and calls `readinessTrend(...)` (from `@/lib/progress`) on them.
2. The dashboard renders a short Ukrainian trend label inside the readiness `<Card>` (near the
   `ReadinessMeter`), mapping the trend result to EXACTLY:
   IMPROVING → «Динаміка: вгору», DECLINING → «Динаміка: вниз», STABLE → «Динаміка: стабільно».
3. The label mapping is a `Record<...>` of the three trend keys — preferably added as an exported
   `READINESS_TREND_LABEL` in `lib/progress.ts` next to the existing `READINESS_LABEL` (pure,
   presentation-string map). The dashboard imports and uses it. (A local const in the page is an
   acceptable fallback, but all three exact strings must appear and be rendered.)
4. With fewer than two snapshots the page still renders without error (the pure function returns
   "STABLE" → «Динаміка: стабільно»); the dashboard must not crash on an empty/short score array.
5. `npm run typecheck` exits 0; `npm test` still passes.
6. BROWSER (when the app is served and `$DRIVER_BROWSER_CMD` is set): an authenticated user with a
   selected category visiting `/dashboard` sees text starting «Динаміка:» in the readiness card.
   verify.sh performs this check when possible and otherwise falls back to static source assertions
   for items 1–4.

## Constraints / decisions
- Edit `app/(app)/dashboard/page.tsx` and (preferred) add `READINESS_TREND_LABEL` to `lib/progress.ts`.
  Do NOT change `readinessTrend` itself, the server query (task 06), `lib/constants.ts`, or
  `prisma/schema.prisma`.
- Reuse existing `@/components/ui` primitives for the label (e.g. a `Badge` or a small `<p>`); do not
  add a new component file. Place the label inside the existing readiness `<Card>` block.
- The three Ukrainian strings must be EXACT (including the word «Динаміка» and the colon). Do not
  invent additional trend states — the pure function only returns IMPROVING/DECLINING/STABLE.
- Non-Goal: charts/sparklines of the score history, persisting new snapshots, category-switch UI.

## Plan
- [x] (If chosen) add `export const READINESS_TREND_LABEL: Record<"IMPROVING"|"DECLINING"|"STABLE", string>`
      to `lib/progress.ts`.
- [x] In the dashboard: load scores, compute `trend`, render the label inside the readiness Card.
- [x] `npm run typecheck` && `npm test`; if app is serveable, browser-check `/dashboard`.

## Done
- [x] Added `READINESS_TREND_LABEL` to `lib/progress.ts`; dashboard now loads
      `getRecentReadinessScores`, computes `readinessTrend`, and renders the Ukrainian
      label as a `<Badge>` beside the `ReadinessMeter`. typecheck 0, 38 tests pass, verify.sh PASS.

## Next
- [ ] Goal met — nothing outstanding (browser check is best-effort and skipped without a served app).

## Artifacts
- tasks/mvp-finish-07-wire-readiness-trend-dashboard/verify.sh — static render assertions (+ optional browser) + typecheck/test
- app/(app)/dashboard/page.tsx — trend wiring + label
- lib/progress.ts — `READINESS_TREND_LABEL` (if chosen)

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T09:27Z ClPcs-Mac-mini: added `READINESS_TREND_LABEL` to lib/progress.ts; wired
  dashboard to load `getRecentReadinessScores` + compute `readinessTrend`, rendering the
  trend label as a `<Badge>` next to `ReadinessMeter`. typecheck exit 0; 38/38 tests pass;
  verify.sh → PASS (browser check skipped, app not served). Status → done.

## Verify
**Last verify:** PASS (2026-06-17T06:27:21Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T06:27:59Z)
