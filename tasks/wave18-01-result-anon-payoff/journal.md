# Task: wave18-01-result-anon-payoff

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-06T10:00Z
**Last compute:** mac-mini

## Goal
Spec wave18 T1 (CONFIRMED #1, major). `app/(app)/test/[id]/result/page.tsx:22` currently calls
`requireUser()`, which bounces an anon (ds_anon_play only, no ds_session) to `/login` at the FREE value
payoff (score / honest stats / per-question review). The whole path to /result is anon-capable, and the
walled content is free. Resolve identity leniently like the sibling `app/(app)/test/[id]/page.tsx` while
keeping every paid/intelligence surface (readiness dial + offer card) gated exactly as today. PASS = ALL
true:

1. `app/(app)/test/[id]/result/page.tsx` resolves the acting user with a READ-ONLY, flag-aware
   resolver: real logged-in user wins; else WHEN `isValueFirstFunnelEnabled()` the READ-ONLY
   `getAnonUser()` (from `@/lib/server/anon-session`); else `requireUser()` (flag-OFF fallback). The
   page render NEVER mints a User row and NEVER sets a cookie — it must NOT call
   `getOrCreateAnonUser()` or `requirePlayableUser()`. Verify by grep: the file imports `getAnonUser`
   and contains NO `getOrCreateAnonUser`/`requirePlayableUser`.
2. Own-session-only (no IDOR): the existing `prisma.testSession.findFirst({ where: { id, userId:
   resolvedUser.id } })` + `getSessionState(id, resolvedUser.id)` gates on the RESOLVED user's id, so an
   anon can load ONLY a session whose `userId` equals their own anon id; any other id → `notFound()`
   (no data leak). When the flag-on resolver returns `null` (no valid anon cookie), the page must
   redirect to `/login` (fall through to `requireUser()`), never render with a null user.
3. Dial + offer stay gated: the readiness dial block and `ExamAccessOffer` remain behind the existing
   `isDiagnostic` / `dialReal` / `showOffer` conditions — do NOT add any anon-visible dial/offer path.
   An anon reaching /result sees score + honest stats + «Розбір питань», never the dial detail or offer.
4. Integration test (production path — drive the REAL page component, per the CLAUDE.md dashboard
   pattern): a new `lib/server/result-anon.integration.test.ts` that, with `VALUE_FIRST_FUNNEL=true`, a
   mocked next/headers jar + mocked `getCurrentUser`→null, mints an anon user + a COMPLETED session it
   OWNS (createOfficialQuestion fixture + the real anon-play startTestAction/submit path OR direct
   prisma create of an anon user, session, answers), then `await ResultPage({ params:
   Promise.resolve({ id }) })` resolves WITHOUT throwing a NEXT_REDIRECT to /login. A second case: an
   anon requesting a session id owned by a DIFFERENT user → the call throws NEXT_NOT_FOUND (notFound),
   no session data returned. A third case: `VALUE_FIRST_FUNNEL` unset + no logged-in user → the call
   throws the requireUser redirect (digest contains NEXT_REDIRECT and target `/login`). Authed
   real-user case still renders (existing behaviour unchanged).
5. Reword the misleading CLAUDE.md learning: the first bullet under "## Learnings (agent-maintained)"
   in `CLAUDE.md` currently states "`/result` uses `requireUser()`, so an anon … BOUNCES to `/login`
   and never sees it" — after this fix an anon CAN view their own /result (score/review) but still NOT
   the dial/offer. Correct that sentence so it distinguishes offer-card unreachability (by design:
   authed + entitled + data-sufficient) from whole-page reachability (an anon now sees the free payoff).
   Do NOT delete the surrounding offer-unreachability facts — only fix the whole-page claim. After the
   edit, `grep -c "requireUser" CLAUDE.md` in that bullet no longer asserts anon-bounces-at-/result.
6. `npx tsc --noEmit` exits 0 · `npm test` exits 0 · `npm run test:integration` exits 0.

## Constraints / decisions
- Content-never-gated invariant: only the intelligence layer (dial detail / offer / FSRS plan) is paid.
  Do NOT expose the readiness dial to anon here — that is an out-of-scope PRODUCT decision (spec §T1).
- Additive / flag-gated: flag-OFF behaviour must be byte-for-byte the old `requireUser()` gate. No new
  routes, no schema, no copy changes. Ukrainian copy preserved verbatim.
- Read-only render law (Next 16): a Server Component GET must never `cookies().set()` — that is why the
  page must use `getAnonUser()` (read-only), never the mint-capable resolvers. wave18-02 fixes the
  sibling /test page; keep the two consistent.
- IDOR is the high-stakes axis here (**Evaluate: yes**): the own-session check derives the userId ONLY
  from the resolved (cookie-signed) identity — no request-supplied session-owner id anywhere.
- Optional: the `bin/browser-audit.sh` comment (~line 773) also says "/result uses requireUser()"; if
  you touch it leave it accurate, but real browser verification is deferred to wave18-08.

## Next
- [x] Add the flag-aware read-only resolver to result/page.tsx (real → getAnonUser (flag) → requireUser),
      keeping the own-session findFirst on the resolved id; then write the integration test.
- Goal fully met — Status: done. (wave18-08 owns the browser-audit re-verification.)

## Artifacts
- `app/(app)/test/[id]/result/page.tsx` — resolver: `getCurrentUser() ?? (flag ? getAnonUser() : null) ?? requireUser()`.
- `lib/server/result-anon.integration.test.ts` — 4 cases (anon own render / IDOR 404 / flag-off /login / authed render).
- `CLAUDE.md` — reworded the wave-17 offer-card bullet (whole-page reachability vs offer-card gating) + added the notFound/redirect digest learning.

## Log
- 2026-07-06 mac-mini: planned from specs/wave18-funnel-fixes.md T1.
- 2026-07-06T10:00Z ClPcs-Mac-mini: replaced `requireUser()` in result/page.tsx with the read-only flag-aware
  resolver (imports `getCurrentUser` from @/lib/auth + `getAnonUser` from @/lib/server/anon-session); own-session
  findFirst + dial/offer gates untouched. Wrote result-anon.integration.test.ts (drives the REAL ResultPage per the
  dashboard pattern: jar-mocked next/headers + getCurrentUser→null; anon owns a COMPLETED session via the real
  startTestAction/finishTestAction path; IDOR case = anon requesting the fixture user's session → 404). Corrected
  case-2 expectation to Next 16's `NEXT_HTTP_ERROR_FALLBACK;404` digest (framework signal, not oracle change).
  Reworded the CLAUDE.md offer-card bullet + added a digest-forms learning. tsc/unit/integration all green.

## Verify
**Last verify:** PASS (2026-07-06T07:01:21Z)

## Evaluation
**Last evaluation:** PASS (2026-07-06T07:03:40Z)
