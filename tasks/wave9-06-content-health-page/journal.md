# Task: wave9-06-content-health-page

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-24
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §D — admin content-health view + nav link. Add `app/admin/content-health/page.tsx` (mirror
`app/admin/analytics/page.tsx`) and the nav entry. Depends on tasks 04 + 05. PASS = ALL true:

1. `app/admin/content-health/page.tsx` exists and `default`-exports an async server component.
2. The page imports and CALLS `requireContentManager` (from `@/lib/rbac`) — the F-5 gate checks this
   explicitly (belt-and-suspenders with the layout gate).
3. The page imports `getContentHealth` from `@/lib/server/content-stats` and renders its data.
4. The page imports `OptionDistribution` and `FlagBadge` from `./parts` and uses them in the table.
5. The page renders the Ukrainian heading «Якість контенту» and a KPI strip showing total answered,
   % of questions carrying a flag, and mean accuracy (using `Stat`/`Card` from `@/components/ui`).
6. The page renders a per-question table (questionKey, short text, accuracy, n, avg time, per-option
   pick distribution via `OptionDistribution`, flag badges via `FlagBadge`) FLAGGED-first, and a
   per-topic rollup section.
7. The nav link `{ href: "/admin/content-health", label: "Якість контенту" }` is present in the
   `NAV_LINKS` array in `app/admin/layout.tsx`, AFTER the «Аналітика» (`/admin/analytics`) entry.
8. NO PII: the page source does not render `email`, `passwordHash`, or a raw `userId`/per-user answer —
   only aggregated content stats and the question stem.
9. `npm run typecheck` exits 0.
10. `npm run build` exits 0.
11. BROWSER (best-effort, non-fatal): when the app is served on the audit origin, an UNauthenticated GET
    of `/admin/content-health` does NOT return 200 (the admin gate redirects) — proving the route is
    wired and guarded. Skipped (logged) when no server is reachable; items 1–10 are the hard gate.

## Constraints / decisions
- **Evaluate: yes** — admin surface touching content-quality signals + legal positioning; an independent
  judge confirms the page renders real aggregated data (no PII) and the gate/nav are correctly wired.
- Mirror `app/admin/analytics/page.tsx`: Ukrainian copy, mobile-first, `Card`/`SectionTitle`/`Stat`,
  `LegalDisclaimer` at the foot. Reuse — do not invent a new layout system.
- KPIs are derived in the page from `getContentHealth()` output (a trivial reduce over `questions`); do
  NOT duplicate the aggregation. "% with a flag" counts questions carrying an actionable flag.
- The layout already enforces `requireContentManager()`; the page ALSO calls it (F-5 requirement). Keep
  both — the page-level call is the audited one.
- Browser auth is environment-dependent; the reliable browser signal here is the auth-free redirect of an
  unauthenticated request. A full authenticated walkthrough is covered by `npm run audit:browser`
  (CLAUDE.md REAL-TRANSPORT GATE) and may be run informationally, but is not the boolean gate.
- Non-Goals: changing the pure libs or the server aggregation (tasks 02–04), new charts beyond the
  required table/rollup, learner-facing surfacing, schema change.

## Plan
- [x] Add the `/admin/content-health` entry to `NAV_LINKS` in `app/admin/layout.tsx` after «Аналітика».
- [x] Write `app/admin/content-health/page.tsx`: gate, fetch `getContentHealth`, KPI strip, table, rollup.
- [x] `npm run typecheck` && `npm run build`; best-effort browser redirect check.

## Done
- [x] Nav link `{ href: "/admin/content-health", label: "Якість контенту" }` added after «Аналітика».
- [x] Page written: page-level `requireContentManager()` gate, `getContentHealth()` fetch, KPI strip
      (total answered / % flagged / mean accuracy via `Stat`/`Card`), flagged-first per-question table
      (`OptionDistribution` + `FlagBadge`), per-topic rollup, `LegalDisclaimer`. No PII rendered.
- [x] `npm run typecheck` exits 0; `npm run build` exits 0 (`/admin/content-health` route registered).
- [x] verify.sh PASS (browser check skipped — no server reachable, non-fatal by design).

## Next
- [ ] (none — Goal met; verify green)

## Artifacts
- `app/admin/content-health/page.tsx` — the admin content-health view.
- `app/admin/layout.tsx` — nav link added.
- `tasks/wave9-06-content-health-page/verify.sh` — executable gate (static + typecheck + build + browser).

## Log
- 2026-06-24T01:05Z ClPcs-Mac-mini: re-ground after evaluator REJECT whose stated reason was
  "(no VERDICT marker emitted — defaulting to REJECT)" — a transient no-verdict non-response, not a
  code defect. Re-audited the deliverable against all 11 Goal items: page default-exports an async
  server component, calls `requireContentManager()` (F-5), fetches `getContentHealth()`, derives the 3
  KPIs by reduce, renders the «Якість контенту» heading + Stat/Card KPI strip, flagged-first
  per-question table (`OptionDistribution` + `FlagBadge`) and per-topic rollup, `LegalDisclaimer`, no
  PII. Confirmed deps: `./parts` exports `OptionDistribution`/`FlagBadge`; `lib/server/content-stats.ts`
  exports `getContentHealth` and itself orders questions flagged-first then hardest-first (so the page's
  reliance on server ordering for item 6 is sound). Nav link present after «Аналітика». `npm run
  typecheck` re-run → exit 0. Code unchanged since the last green verify (PASS 2026-06-23T21:11:30Z).
  Status → done.
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-24T00:20Z ClPcs-Mac-mini: added the `/admin/content-health` nav link after «Аналітика» in
  `app/admin/layout.tsx`; wrote `app/admin/content-health/page.tsx` mirroring the analytics page
  (Ukrainian copy, mobile-first, `Card`/`SectionTitle`/`Stat`, `LegalDisclaimer`). Page calls
  `requireContentManager()` (F-5), fetches `getContentHealth()`, derives the 3 KPIs by reduce (no
  duplicated aggregation), renders a flagged-first per-question `<table>` (questionKey, text, accuracy,
  n, avg time, `OptionDistribution`, `FlagBadge`) wrapped in `overflow-x-auto`, plus a per-topic rollup
  table. typecheck 0, build 0, verify.sh PASS (browser guard skipped — no server up). Status → done.

## Verify
**Last verify:** PASS (2026-06-23T21:15:23Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T21:17:40Z)
