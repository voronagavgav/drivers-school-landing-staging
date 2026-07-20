# Task: wave18-02-test-page-no-mint

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-06T10:05Z
**Last compute:** mac-mini

## Goal
Spec wave18 T2 (CONFIRMED #3, minor). `app/(app)/test/[id]/page.tsx:14` calls the mint-capable
`requirePlayableUser()`; a cookieless anon DIRECT-navigating to `/test/<id>` triggers
`getOrCreateAnonUser() → setAnonCookie() → cookies().set()` DURING RENDER, which Next 16 forbids for a
Server Component GET → 500 + a wasted orphan anon User row. Minting must stay in the ACTIONS
(startTestAction / segment), which run BEFORE the redirect; the page render must be READ-ONLY. PASS = ALL
true:

1. `app/(app)/test/[id]/page.tsx` resolves identity with a READ-ONLY, flag-aware resolver: real
   logged-in user wins; else WHEN `isValueFirstFunnelEnabled()` the READ-ONLY `getAnonUser()`; else
   `requireUser()`. The file must NOT call `requirePlayableUser()` or `getOrCreateAnonUser()` (grep:
   neither token present). It imports `getAnonUser` from `@/lib/server/anon-session`.
2. Null-safe render: when the flag-on resolver returns `null` (cookieless / invalid anon cookie), the
   page must NOT proceed to render with a null user — it redirects to `/login` (fall through to
   `requireUser()`) OR `notFound()`, never a 500. A minted anon can never own a URL-typed session id,
   so the existing `getSessionState(id, user.id)` → `notFound()` on a non-owned id is preserved.
3. The `SaveProgressPrompt` block still receives `user.isAnonymous` — preserve its behaviour for a
   resolved anon user (progressCount unchanged). Do not regress the wave17 save-progress invitation.
4. Integration test (production path — drive the REAL page component): a new
   `lib/server/test-page-no-mint.integration.test.ts` that, with `VALUE_FIRST_FUNNEL=true`, a mocked
   next/headers jar with NO `ds_anon_play` cookie, and mocked `getCurrentUser`→null, records the
   `prisma.user.count()` BEFORE, then `await TestPage({ params: Promise.resolve({ id: "nonexistent" }) })`
   and asserts: it throws NEXT_NOT_FOUND or NEXT_REDIRECT (NOT a render that sets a cookie / mints), AND
   `prisma.user.count()` AFTER is UNCHANGED (no orphan anon row created by the page render). A second
   case proves the real anon-play flow still works: drive the real `startTestAction` (which mints via
   the action) to create a session, then `await TestPage` for that owned id resolves without throwing a
   /login redirect.
5. `npx tsc --noEmit` exits 0 · `npm test` exits 0 · `npm run test:integration` exits 0.

## Constraints / decisions
- The FIX is symmetric with wave18-01 (the /result sibling): both page GETs use `getAnonUser()`
  (read-only), minting lives only in `"use server"` actions. Keep the resolver shape identical.
- Additive / flag-gated: flag-OFF is byte-for-byte the old `requireUser()` gate. No schema, no copy,
  no route changes. Ukrainian copy preserved.
- Data-integrity axis (**Evaluate: yes**): the "no User row created by page render" property is the
  crux — the test must count User rows around the render, not just assert no throw.
- Do NOT move minting out of startTestAction/segment — those legitimately mint before their redirect
  (proven by the wave17 anon-play integration test). Only the PAGE render must be read-only.

## Next
- [x] Swap requirePlayableUser() → the read-only flag-aware resolver in test/[id]/page.tsx; write the
      user-count-around-render integration test.
- All PASS items met. If verify goes red, re-ground on the failing check.

## Log
- 2026-07-06 mac-mini: planned from specs/wave18-funnel-fixes.md T2.
- 2026-07-06T10:05Z ClPcs-Mac-mini: replaced `requirePlayableUser()` in
  `app/(app)/test/[id]/page.tsx` with the read-only flag-aware resolver
  (`getCurrentUser() ?? (isValueFirstFunnelEnabled() ? getAnonUser() : null) ?? requireUser()`),
  symmetric with the wave18-01 /result sibling — minting stays in the actions; the GET render never
  calls cookies().set(). Added imports (requireUser/getCurrentUser/getAnonUser), dropped the
  requirePlayableUser import. Grep confirms neither `requirePlayableUser`/`getOrCreateAnonUser`
  token remains. Wrote `lib/server/test-page-no-mint.integration.test.ts` (mirrors
  result-anon.integration.test.ts): case 1 = cookieless anon flag-on renders a non-owned id →
  throws (NEXT_REDIRECT/404), `prisma.user.count()` UNCHANGED around the render, no ds_anon_play
  cookie set (the data-integrity crux); case 2 = action-minted anon renders its OWN in-progress
  session without a /login redirect (cookie restored after case 1 clears the jar). tsc 0; both
  integration cases pass. Status → done.

## Artifacts
- app/(app)/test/[id]/page.tsx (resolver swap)
- lib/server/test-page-no-mint.integration.test.ts (new)

## Verify
**Last verify:** PASS (2026-07-06T07:06:20Z)

## Evaluation
**Last evaluation:** PASS (2026-07-06T07:07:50Z)
