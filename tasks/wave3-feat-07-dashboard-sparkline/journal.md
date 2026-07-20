# Task: wave3-feat-07-dashboard-sparkline

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Render a small inline readiness-trend sparkline on the dashboard, reusing the existing
`getRecentReadinessScores` data and the pure `sparkline` helper (task 06). Spec C (the render half).
Depends on task 06.

1. `app/(app)/dashboard/page.tsx` imports the sparkline helper from `@/lib/sparkline` and builds geometry
   from the `recentScores` it ALREADY fetches via `getRecentReadinessScores(...)` (no new DB query added).
2. The page renders an inline `<svg>` containing the `<path>` (or `<polyline>`) produced from the helper's
   path/points, placed near the existing readiness/trend block.
3. Graceful empty state: when there are fewer than 2 recent scores, the sparkline is omitted (or rendered
   as a neutral placeholder) — no crash, no `NaN` in the DOM. The existing `READINESS_TREND_LABEL` badge is
   preserved.
4. The sparkline uses design-system colors/sizing (Tailwind utility classes / theme tokens already in use),
   not a hardcoded foreign palette; it stays a SMALL inline element (not a full chart).
5. `npm run typecheck` exits 0.
6. `npm test` exits 0 (zero failures).
7. `npm run build` exits 0.

## Constraints / decisions
- REUSE `getRecentReadinessScores` (already called in the dashboard) — do NOT add a new server helper or DB
  call. The sparkline is purely a presentation of data already in scope.
- Keep the geometry in the pure helper; the page only maps `path`/`points` into SVG elements.
- Preserve the existing readiness card, reasons list, trend badge, and disclaimer copy.
- Non-Goal: interactive charts, axis labels, tooltips, a charting dependency, or persisting trend data.

## Plan
- [x] Import `sparkline`; compute geometry from `recentScores`; render `<svg><path/></svg>` in the
      readiness block with the ≥2-scores guard.
- [x] `npm run typecheck`, `npm test`, `npm run build`; run verify.sh.

## Done
- [x] Imported `sparkline` from `@/lib/sparkline`; built `spark` geometry from the already-fetched
      `recentScores` (guard `length >= 2`, else `null` → SVG omitted).
- [x] Rendered an inline `<svg><path/></svg>` next to the `READINESS_TREND_LABEL` badge using
      `text-sign`/`currentColor` (design-system blue), small (120×32). Trend badge preserved.
- [x] verify.sh PASS — typecheck 0, 114 tests pass, build 0, browser SKIP (no served app).

## Next
- [ ] (none — task done; full Wave 3 gate runs under wave3-feat-12.)

## Artifacts
- app/(app)/dashboard/page.tsx — renders the readiness sparkline SVG.
- tasks/wave3-feat-07-dashboard-sparkline/verify.sh — static wiring + typecheck + unit + build (+ optional browser) gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T15:40Z ClPcs-Mac-mini: wired the sparkline into app/(app)/dashboard/page.tsx — imported
  `sparkline`, computed `spark` from `recentScores` (≥2 guard, else null), rendered inline `<svg><path/>`
  beside the trend badge with `text-sign`/`currentColor`. verify.sh PASS (typecheck/114 tests/build all 0).
  Set Status: done.

## Verify
**Last verify:** PASS (2026-06-17T12:40:58Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T12:41:48Z)
