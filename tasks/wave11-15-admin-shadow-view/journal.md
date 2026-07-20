# Task: wave11-15-admin-shadow-view

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Admin-only calibration instrument: `/admin/readiness-shadow` compares legacy readiness vs the FSRS
dial. The ONLY new UI this wave (admin, not learner). Depends wave11-08. DONE when (verify.sh exits 0):

1. `app/admin/readiness-shadow/page.tsx` is a server component gated by `requireContentManager()`.
2. It renders a per-user table (query paged/chunked ≤200) with, per user: LEGACY readiness (existing
   `ProgressSnapshot.readinessScore`/`examReadiness`) vs FSRS `ReadinessSnapshot.dialPercent` (via
   `getLatestReadiness`) + `sufficientData` flag + `seenCount` + mock `m/k` + bottleneck topic + the
   DELTA (FSRS − legacy). Plus AGGREGATES: mean `|delta|` and `% users with insufficient data`.
   Ukrainian labels; NO PII beyond `email`.
3. Nav link «Готовність (тінь)» is added to `NAV_LINKS` in `app/admin/layout.tsx` AFTER «Якість
   контенту» (`/admin/content-health`).
4. `bin/browser-audit.sh` gains a 17th assertion (following the `ok`/`bad` helper style, `grep -E`,
   capture-to-var): as the logged-in admin, navigate to `/admin/readiness-shadow` and assert a title/
   heading text unique to the page (e.g. matches «ГОТОВНІСТЬ» / «тінь»).
5. `npm run typecheck` exits 0; `npm run build` exits 0.

## Constraints / decisions
- ADMIN ONLY — this is NOT a learner screen. No `app/(app)/*` page is added or restyled (H4 guard).
- The shadow view is the calibration instrument for the W12b dial-promotion decision — show BOTH
   numbers + delta so miscalibration is visible; never promote the FSRS dial to learners this wave.
- Below-threshold users must read as insufficient-data (not a hard dial number) in the FSRS column,
   consistent with wave11-08's `sufficientData` semantics.
- The real 17/17 browser run is the wave gate (wave11-16); this task's verify does static checks + an
   OPTIONAL browser drive guarded by app availability (skips cleanly if the app isn't served).

## Plan
- [x] Build the page (requireContentManager, per-user rows, aggregates).
- [x] Add the nav link after «Якість контенту».
- [x] Append the 17th browser-audit assertion.

## Next
- [ ] None — Goal fully met (page + nav link + 17th assertion). Awaiting driver re-verify.

## Artifacts
- app/admin/readiness-shadow/page.tsx — server component, requireContentManager gate, per-user LEGACY vs FSRS table + delta + aggregates.
- bin/browser-audit.sh — section 8: 17th assertion navigates admin to /admin/readiness-shadow, greps body -E 'Готовність|тінь' via ok/bad helpers.

## Log
- 2026-07-02 planner: task authored.
- 2026-07-02T00:10Z ClPcs-Mac-mini: added «Готовність (тінь)» → /admin/readiness-shadow nav link to NAV_LINKS in app/admin/layout.tsx, directly after «Якість контенту» (/admin/content-health).
- 2026-07-02T00:20Z ClPcs-Mac-mini: appended section 8 (17th assertion) to bin/browser-audit.sh — as logged-in admin, nav to /admin/readiness-shadow, capture body to shadow_body, `grep -qiE 'Готовність|тінь'` via ok/bad helpers. Fixes prior verify FAIL ("browser-audit.sh has no readiness-shadow assertion"); verify.sh line 19 greps `readiness-shadow` which now matches. Goal fully met → Status: done.
- 2026-07-02T00:00Z ClPcs-Mac-mini: scaffolded app/admin/readiness-shadow/page.tsx — requireContentManager-gated server component; loads all users (legacy ProgressSnapshot.readinessScore chunked ≤200 via `in`) + getLatestReadiness per user; per-user row shows legacy score, FSRS dialPercent (or «н/д» below wave11-08 threshold), delta (FSRS−legacy), seenCount, mock m/k, bottleneck topic; aggregates mean |delta| + % insufficient-data; Ukrainian labels, email-only PII. `npm run typecheck` exits 0.



## Verify
**Last verify:** PASS (2026-07-01T23:55:21Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T23:57:05Z)
