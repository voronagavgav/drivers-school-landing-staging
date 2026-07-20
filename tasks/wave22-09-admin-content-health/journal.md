# Task: wave22-09-admin-content-health

**Status:** done
**Driver:** auto
**Updated:** 2026-07-14
**Last compute:** mac-mini

Read-only ADMIN surface: `/admin/content-health` gains an Elo column showing per-question β, n, and an
"insufficient (n<ELO_MIN_ITEM_ANSWERS)" marker. Admin-only, no learner-facing change. Server component,
RBAC via the existing `requireContentManager` path; NO client-graph leaks — pass plain props.

Depends on: wave22-06 (columns), wave22-07 (writeback populates β/n).

NOTE — NOT a design task: this adds a data column to an EXISTING admin table, mirroring the current
Card/table style. The full design stack is NOT required (no new visual composition, no learner-facing
copy). Keep copy Ukrainian and consistent with the existing page.

## Goal
PASS = ALL true:

1. `lib/server/content-stats.ts` `getContentHealth` (or the `ContentHealthQuestion` projection)
   SELECTs `eloBeta` and `eloAnswerCount` from `Question` and exposes them on each question row.
2. `app/admin/content-health/page.tsx` renders, per question, the β value (or `—` when `eloBeta` is
   null), the answer count `n`, and a visible marker (Ukrainian, e.g. «недостатньо даних») when
   `eloAnswerCount < ELO_MIN_ITEM_ANSWERS` (imported from `lib/constants`).
3. The page remains a server component; RBAC via `requireContentManager()` is still called; NO new
   `"use client"` added that imports server-graph helpers (no rbac/auth/db pulled into a client
   bundle — plain props only).
4. `npm run -s typecheck` exits 0; `npm test` exits 0.
5. `npm run db:seed` then `npm run test:integration` exits 0 (existing content-stats integration test
   still green; if it asserts the projection shape, extend it to cover eloBeta/eloAnswerCount).
6. Browser check (served app): `$DRIVER_BROWSER_CMD` opens `/admin/content-health` as an admin
   (seeded `admin@drivers.school`/`Admin12345`) and the page's `main` textContent contains the Elo
   column header AND the insufficient-data marker «недостатньо» for a below-threshold question. On a
   freshly-seeded DB every question has n<200 so the marker is present.

## Constraints / decisions
- Admin-only, read-only — NO learner-facing difficulty display (spec Out-of-scope: consumers).
- β shown raw (logit); the future β→1..5 band mapping is a later consumer wave, NOT here.
- Insufficient marker keyed on `ELO_MIN_ITEM_ANSWERS` (200) from lib/constants — single source.
- Server-graph purity: compute display strings server-side, pass plain props (see the app-nav /
  client-bundle learning) — do NOT import `@/lib/rbac` into any client leaf.
- Non-goal: no consumer logic; the column is informational only.

## Next
- [x] Add eloBeta/eloAnswerCount to the content-health projection + an Elo column + insufficient marker.

## Log
- 2026-07-14T15:04Z ClPcs-Mac-mini — Added `eloBeta`/`eloAnswerCount` to `ContentHealthQuestion` +
  selected them in `getContentHealth`'s per-question `Question` batch query and populated the row.
  Rendered a new «Elo β (n)» table column in `app/admin/content-health/page.tsx`: β to 2dp (or «—»
  when null), n in parens, and «недостатньо даних» marker when `eloAnswerCount < ELO_MIN_ITEM_ANSWERS`
  (imported from `@/lib/constants`). Page stays a server component; `requireContentManager()` gate
  intact; plain props only. Extended `content-stats.integration.test.ts` to assert
  `eloBeta === null` / `eloAnswerCount === 0` on a fresh (unfolded) fixture question.
  Verified: `typecheck` 0, `npm test` 786 passed, `db:seed` + content-stats integration 2 passed.
  All verify.sh grep gates satisfied. Live admin browser assert is deferred to task 10's audit:browser.

## Artifacts
- lib/server/content-stats.ts (projection: eloBeta/eloAnswerCount)
- app/admin/content-health/page.tsx (Elo β (n) column + insufficient marker)
- lib/server/content-stats.integration.test.ts (projection assertion)

## Verify
**Last verify:** PASS (2026-07-14T12:04:58Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T12:10:40Z)
