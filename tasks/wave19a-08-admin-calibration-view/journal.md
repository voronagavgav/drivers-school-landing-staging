# Task: wave19a-08-admin-calibration-view

**Status:** done
**Driver:** auto
**Updated:** 2026-07-12
**Last compute:** laptop

ADMIN READ VIEW (Part 2 §K). A read-only, RBAC-gated admin page that renders the calibration snapshot over
`PassOutcome`: N outcomes, reliability-diagram bins, Brier, LogLoss, ECE, and (once ≥ a small floor) the fitted
Platt `{A, B}`. MUST render cleanly with **0 rows** ("not enough data") — we expect 0 today. Reuses the pure
`lib/calibration-metrics.ts` (wave19a-05) and reads `PassOutcome` (wave19a-04).

## Goal
PASS = ALL true:

1. An admin page exists at `app/admin/calibration/page.tsx` (a sibling of `readiness-shadow`; extending
   `readiness-shadow` is also acceptable — pick one). It calls `requireContentManager()` (page-level RBAC,
   belt-and-suspenders with the layout gate).
2. It reads all `PassOutcome` rows (chunk/limit sensibly), maps them to `{ p: predictedPassProbability, y: passed?1:0 }`,
   and renders: outcome count N; `brierScore`; `logLoss`; `ece`; the `reliabilityDiagram` bins; and the fitted Platt
   `{A, B}` shown ONLY when `N >= CALIBRATION_MIN_OUTCOMES` (a small floor constant, e.g. 30 — document it), else a
   "not enough data to fit" note.
3. At **0 rows** the page renders WITHOUT throwing and shows an honest empty state (Ukrainian, e.g. «Поки що
   недостатньо даних для калібрування»). No division-by-zero / NaN leaks into the DOM (guard N===0 before calling
   the metrics; or the metrics return safe values documented as such).
4. A nav link to the page is added to `app/admin/layout.tsx` `NAV_LINKS` (Ukrainian label, e.g. «Калібрування»).
5. RBAC: a non-content-manager hitting the page is blocked (redirect/403 via `requireContentManager`), same as the
   other admin pages. The page renders ONLY aggregate calibration numbers — NO per-user PII beyond what
   readiness-shadow already shows (prefer aggregate-only here).
6. `npm run -s typecheck` exits 0; `npm run -s build` exits 0 (the new route compiles).
7. A render smoke proves the 0-row path: `await CalibrationPage(...)` (default import, loaders run, JSX not rendered
   — the CLAUDE.md server-component-in-integration-test pattern) with an EMPTY `PassOutcome` table and a mocked
   `requireContentManager` does NOT throw. (Full browser RBAC + empty-state text assertion is in wave19a-09.)

## Constraints / decisions
- Design/craft (frontend-design): this is an admin instrument — quiet, legible, one bold thing per screen (the
  headline calibration number). Reuse the existing `Card`/`SectionTitle`/`Stat` primitives and the readiness-shadow
  layout idiom for consistency. Copy is design material: the empty state must INVITE the obvious next state
  («дані з'являться, коли учні почнуть звітувати про іспит»), not read as an error. Numbering/dividers only where
  they encode real meaning (the reliability-diagram bins do). Responsive table, visible focus, reduced-motion
  respected. Legal disclaimer stays.
- Read-only: NO writes, NO mutation of PassOutcome. Chunk any `in` query ≤200 (libsql param cap) — though a full
  `findMany` over a small table is fine; cap with `take` to stay bounded.
- The metrics come from the PURE `lib/calibration-metrics.ts` — do NOT re-derive Brier/LogLoss/ECE/Platt in the page;
  import them. DB read lives in the page/`lib/server`, the math stays pure.
- `CALIBRATION_MIN_OUTCOMES` floor is for SHOWING the Platt fit only — it is NOT the isotonic auto-promotion
  threshold (that ≥1000 promotion is a LATER wave, explicitly out of scope).
- Non-goals: isotonic, auto-promoting the calibrator into the live dial, editing outcomes, charts beyond a simple
  bin table/inline bars.

## Next
- [x] Create `app/admin/calibration/page.tsx` (RBAC + read PassOutcome + call metrics + 0-row empty state); add the
      nav link; add the 0-row render smoke; typecheck + build.
- Goal fully met. wave19a-09 owns the browser RBAC + empty-state text assertion.

## Artifacts
- `app/admin/calibration/page.tsx` (new page)
- `app/admin/layout.tsx` (nav link)
- `lib/constants.ts` (`CALIBRATION_MIN_OUTCOMES`)
- `lib/server/admin-calibration.integration.test.ts` (0-row render smoke + RBAC)

## Log
- 2026-07-07 laptop: planned.
- 2026-07-12 ClPcs-Mac-mini: Added `CALIBRATION_MIN_OUTCOMES = 30` (display-only Platt floor) to `lib/constants.ts`.
  Created `app/admin/calibration/page.tsx` — RBAC via `requireContentManager()`, reads all `PassOutcome` (aggregate-only,
  bounded `take: 50_000`), maps to `{p,y}`, renders N/Brier/LogLoss/ECE/reliability bins + fitted Platt {A,B} (shown only
  when `N >= CALIBRATION_MIN_OUTCOMES`), guards `N===0` with an honest inviting Ukrainian empty state («Поки що
  недостатньо даних…»). Reuses pure `lib/calibration-metrics.ts` (no re-derived math) + Card/SectionTitle/Stat +
  LegalDisclaimer, mirroring readiness-shadow. Added «Калібрування» nav link to `app/admin/layout.tsx` NAV_LINKS.
  Added `lib/server/admin-calibration.integration.test.ts` — 0-row render smoke + non-content-manager RBAC redirect
  (2 passed). typecheck 0, build 0 (`/admin/calibration` in route table).

## Verify
**Last verify:** PASS (2026-07-12T13:59:14Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T14:00:37Z)
