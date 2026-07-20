# Task: wave18-04-pricing-auth-guard

**Status:** done
**Driver:** auto
**Updated:** 2026-07-06T10:16Z
**Last compute:** ClPcs-Mac-mini

## Goal
Spec wave18 T4 (CONFIRMED #5, minor). `app/(app)/pricing/page.tsx` is a `PricingPage()` with NO auth of
its own — it relied on the `(app)` shell layout guard, which Wave 17 replaced with `resolveShellUser()`
(flag-ON returns anon/null WITHOUT redirecting). So flag-ON a logged-OUT visitor can now load `/pricing`,
against the page's own stated contract ("the audience is logged-in users; the layout's requireUser()
bounces anonymous traffic"). Add an explicit guard at the top of the page. PASS = ALL true:

1. `app/(app)/pricing/page.tsx` calls `requireUser()` (from `@/lib/rbac`) at the top of the page
   component before rendering, so a request with no real `ds_session` is redirected to `/login`
   REGARDLESS of the `VALUE_FIRST_FUNNEL` flag state. The page becomes `async` if it wasn't. Verify by
   grep: the file imports and calls `requireUser`.
2. Flag-ON, logged-out (no ds_session, anon ds_anon_play only): loading `/pricing` redirects to
   `/login` (does NOT render the price card). Flag-ON, authed: renders unchanged (price 399,
   «Доступ до іспиту»). Flag-OFF: unchanged from today (shell already bounced anon; the explicit guard
   is a no-op for real users). Covered by the integration test below and the wave18-08 browser audit.
3. Integration test (production path — drive the REAL page component): a new
   `lib/server/pricing-guard.integration.test.ts` — partial-mock `@/lib/rbac` `requireUser` to
   `redirect("/login")`-throw when the fixture is anon/absent (mirror the wave17-11 dashboard test
   pattern) and resolve a real user otherwise; assert `await PricingPage()` throws NEXT_REDIRECT
   (to /login) for the logged-out case and renders (no throw) for the authed case. If a page-level
   `requireUser()` mock is impractical, the test may instead assert the source calls `requireUser()`
   before any render branch AND cover behaviour via wave18-08's browser audit — but prefer the
   component-drive test.
4. Copy + the single-bold-price taste law preserved (no visual/copy change for authed users); the
   HARD-DO-NOT funnel guard (`npm run guard:funnel`) still passes.
5. `npx tsc --noEmit` · `npm test` · `npm run test:integration` · `npm run guard:funnel` all exit 0.

## Constraints / decisions
- Minimal, additive: add ONLY the auth guard. Do NOT change pricing copy, price literal (stays in
  `lib/constants.ts` `PRICE_UAH`), the CTA, or the checkout surface. Ukrainian copy preserved verbatim.
- Also update the page's placement-note comment if it still claims the layout guards anon traffic —
  it no longer does under the wave-17 `resolveShellUser()`; keep the comment accurate.
- `requireUser()` (not `getCurrentUser()`): the contract is "logged-in users only", so an anon
  ds_anon_play visitor must ALSO bounce to /login here (pricing is a real-account surface — an anon
  cannot purchase; wave18-06/checkout already bounces anon to /register at completeCheckout).

## Next
- [x] Add `const user = await requireUser();` at the top of an async PricingPage; write the
      component-drive integration test.
- Goal fully met. Remaining verification (full test:integration suite, db:seed, build, LAN browser
  audit) is owned by wave18-08-verify-wave18.

## Log
- 2026-07-06 mac-mini: planned from specs/wave18-funnel-fixes.md T4.
- 2026-07-06 ClPcs-Mac-mini: made `PricingPage` async, added `await requireUser()` (from `@/lib/rbac`)
  at the top before any render — logged-out visitors (anon or absent) now redirect to /login
  REGARDLESS of the VALUE_FIRST_FUNNEL flag. Updated the stale placement-note comment (the wave-17
  `resolveShellUser()` shell no longer bounces anon; the page owns its guard now). No copy/price/CTA
  change. Wrote `lib/server/pricing-guard.integration.test.ts` (3 cases, mirrors the wave18-01
  result-anon pattern: partial-mock `@/lib/auth` getCurrentUser, drive real `PricingPage()`) — flag-ON
  logged-out → NEXT_REDIRECT /login, flag-OFF logged-out → same, authed → renders. Verify:
  `npx tsc --noEmit` clean, new integration test 3/3 pass, `npm run guard:funnel` PASS.
Artifacts: app/(app)/pricing/page.tsx, lib/server/pricing-guard.integration.test.ts

## Verify
**Last verify:** PASS (2026-07-06T07:16:28Z)

## Evaluation
**Last evaluation:** PASS (2026-07-06T07:17:37Z)
