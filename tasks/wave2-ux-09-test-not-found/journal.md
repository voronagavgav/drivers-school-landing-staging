# Task: wave2-ux-09-test-not-found

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Give a bad `/test/<id>` a friendly not-found state. The page already calls `notFound()` for an unknown
or foreign session id (`app/(app)/test/[id]/page.tsx`); add the matching not-found UI. Spec C.

1. `app/(app)/test/[id]/not-found.tsx` exists and default-exports a React component (a Server Component
   is fine — no `"use client"` required).
2. It renders friendly Ukrainian copy explaining the test was not found (e.g. «Тест не знайдено») and a
   link back to a safe place — `/dashboard` (a `<Link href="/dashboard">` or `LinkButton href="/dashboard"`).
3. The existing `notFound()` call in `app/(app)/test/[id]/page.tsx` is preserved (still called when
   `getSessionState` returns null).
4. `npm run typecheck` exits 0.
5. `npm test` exits 0 (zero failures).

## Constraints / decisions
- Place the not-found at the `[id]` segment so Next renders it for `notFound()` thrown there.
- Keep Ukrainian copy + road-sign styling (reuse `Card`/`LinkButton` from `@/components/ui`).
- Note: an unauthenticated visitor is redirected to login by `requireUser()` before reaching this, so
  browser verification of this state requires a signed-in user — verify.sh treats the browser check as
  best-effort, with the static checks as the hard gate.
- Non-Goal: a global `not-found.tsx`, error boundaries (tasks 07/08).

## Plan
- [x] Create `app/(app)/test/[id]/not-found.tsx` (friendly UA copy + link to /dashboard).
- [x] Confirm `page.tsx` still calls `notFound()`.
- [x] `npm run typecheck` + `npm test`.

## Done
- [x] Created `app/(app)/test/[id]/not-found.tsx` — Server Component, «Тест не знайдено» copy,
      `Card`/`SectionTitle`/`LinkButton` from `@/components/ui`, link to `/dashboard`.
- [x] Verified `page.tsx` still calls `notFound()` (line 11, unchanged).
- [x] `npm run typecheck` exits 0; `npm test` 96/96 pass, no failures.

## Next
- [ ] (none — goal met; driver re-runs verify.sh)

## Artifacts
- app/(app)/test/[id]/not-found.tsx — friendly not-found for a bad test id
- tasks/wave2-ux-09-test-not-found/verify.sh — not-found presence gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T14:32Z ClPcs-Mac-mini: created not-found.tsx (Server Component, UA copy + /dashboard
  LinkButton, matched error.tsx style). Static gate greps OK; typecheck 0; npm test 96/96 pass.
  Set Status: done.

## Verify
**Last verify:** PASS (2026-06-17T11:32:44Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T11:33:13Z)
