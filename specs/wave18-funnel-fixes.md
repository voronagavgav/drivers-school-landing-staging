# Wave 18 — Wave-17 funnel confirmed-defect fixes

Source: the Opus skeptic re-verification `docs/strategy/wave17-skeptic-verdicts-2026-07-06.md` (8
CONFIRMED_REAL). This wave lands the FIX-NOW subset + the 3 test gaps. All fixes are flag-independent
or behind the existing `VALUE_FIRST_FUNNEL`/`ENTITLEMENTS_ENABLED`/`PAYMENT_STUB` flags (default OFF),
so nothing changes for live users; they must land BEFORE `VALUE_FIRST_FUNNEL` is ever flipped on.

Standing rules (PLAN.md driving prompt): server-side auth/RBAC, no IDOR; pure logic unit-tested;
additive only; Ukrainian copy preserved; tests on every change; final task `npm run build`; verify over
a real browser where a route/render surface changed (`npm run audit:browser`).

DO NOT regress the value-first invariants: content never gated (only the intelligence layer — dial
detail / FSRS plan / mistake analytics — is paid); flag-OFF byte-for-byte inert.

## T1 — `/result` no longer walls an anon at the free value payoff (CONFIRMED #1, major)
- `app/(app)/test/[id]/result/page.tsx:22` currently `requireUser()` → redirects anon (ds_anon_play only,
  no ds_session) to /login at the payoff. The whole path there is anon-capable (finishTestAction, finish
  button, COMPLETED→/result), and the walled content is FREE (score, honest-stats, per-question review).
- Fix: resolve identity leniently like the sibling test page — real user else, flag-on, the READ-ONLY
  `getAnonUser()` (NEVER mint/set-cookie in a page render); flag-off keep `requireUser()`. An anon may view
  the result of a session THEY own (own-session check — no IDOR: an anon cannot load another session's result).
  Keep every paid/intelligence surface gated exactly as today via `checkIntelligenceAccess` (the readiness
  dial detail + offer card stay authed+entitled as designed — do NOT expose the dial to anon here; that is a
  separate PRODUCT decision, out of scope).
- Also correct the misleading CLAUDE.md learning that calls "/result requireUser intentional" — it conflates
  offer-card unreachability (by design) with whole-page unreachability (this bug); reword it.
- Boolean: flag-ON, an anon who completed their own session sees that session's result (score/review), not
  /login · an anon cannot load a result for a session they don't own (redirect/notFound, no data) · authed
  behaviour unchanged · flag-OFF: anon → /login exactly as before · dial/offer still gated (no dial for anon).

## T2 — `/test/[id]` never mints/sets-cookie during render (CONFIRMED #3, minor)
- The page (Server Component GET) calls mint-capable `requirePlayableUser()`; a cookieless anon direct-nav
  triggers `getOrCreateAnonUser()→setAnonCookie()→cookies().set()` in render, which Next 16 forbids → 500 +
  a wasted orphan User row. The layout deliberately uses read-only `getAnonUser()`.
- Fix: on the page use a READ-ONLY resolver (real user else flag-on `getAnonUser()` else `requireUser()`);
  minting stays in the actions (startTestAction/segment) which run before the redirect. A minted anon can
  never own a URL-typed session id anyway → clean notFound.
- Boolean: flag-ON cookieless direct-nav to `/test/<id>` → notFound/redirect (NOT 500) · no User row created
  by the page render (count unchanged) · a real anon-play redirect (action mints, then page reads) still works.

## T3 — `activation_aha` fires for onboarding/diagnostic-first users (CONFIRMED #4, minor)
- `lib/server/test-engine.ts`: the event gates on `showsImmediateFeedback(mode) && explanation && testAnswer
  .count===1`. `showsImmediateFeedback` is false for DIAGNOSTIC & EXAM_SIMULATION, so a user whose FIRST
  answer is diagnostic/exam bumps count past 1 without entering the block → `activation_aha` NEVER fires for
  them (the exact cohort the funnel exists to instrument).
- Fix: fire on the FIRST answer that BOTH shows feedback AND has an explanation — e.g. gate on "no prior
  TestAnswer of this user was in a feedback-mode question with an explanation" (a first-reveal check), not
  global `count===1`. Keep it fire-once (no double-count) and outside the write $transaction (fire-and-forget).
- Boolean: unit/integration — a user who answers a DIAGNOSTIC first then a MIXED_PRACTICE feedback question
  with an explanation FIRES activation_aha on that MIXED answer · fires exactly once · a MIXED-first user
  still fires once on their first · pure/deterministic where possible.

## T4 — `/pricing` re-asserts its own auth (CONFIRMED #5, minor)
- `app/(app)/pricing/page.tsx` relies on the shell layout guard, which Wave 17 replaced with
  `resolveShellUser()` (flag-on returns anon/null WITHOUT redirect) → a logged-out visitor can now load
  /pricing flag-on, against the page's stated contract.
- Fix: add an explicit `requireUser()` (or the intended gating) at the top of the page.
- Boolean: flag-ON a logged-out visitor to /pricing → /login · authed unchanged · flag-OFF unchanged.

## T5 — checkout test (e) proves THIS call writes (CONFIRMED #7, add-test)
- `lib/server/checkout.integration.test.ts` test (e) asserts `row?.tier==="EXAM_ACCESS"` under ENTITLEMENTS-off
  but the row already exists from test (a) (shared buyerId, never cleared) → vacuous.
- Fix: use a fresh user with no prior entitlement for (e) (or delete buyer's entitlement before the runCheckout
  call), so the assertion proves the ENTITLEMENTS-off call actually wrote the grant.
- Boolean: (e) fails if `completeCheckout` is (hypothetically) gated to skip the write when ENTITLEMENTS is off.

## T6 — checkout self-grant is adversarially exercised (CONFIRMED #8, add-test)
- The suite claims "no client-sent userId/tier is read" but every case calls `completeCheckout(new FormData())`
  (empty) — never attempts a self-grant.
- Fix: add a case submitting FormData carrying a DIFFERENT userId and tier=EXAM_ACCESS while the mocked session
  is buyerId; assert the grant landed on buyerId and NOT on the injected id (server-authoritative proven).
- Boolean: the new case passes today and would FAIL if `completeCheckout` read `formData.get('userId')/tier`.

## T7 — T5 self-segment onboarding gets coverage (CONFIRMED #9, add-test)
- `lib/segment.ts` validators (`isSegmentTiming`/`isSegmentConfidence`) and `app/actions/segment.ts` (3
  anon-reachable actions mutating selectedCategoryId + firing analytics) have zero tests.
- Fix: unit test the validators (valid values, unknown value, empty string → rejected); integration test the
  actions over the real path (mock getCurrentUser + jar like the anon-play tests): flag-ON anon reaches them
  and selectedCategoryId persists; flag-OFF → /login (inertness); an invalid timing/confidence value is dropped
  (no analytics row / no persist); the final tap opens a real MIXED_PRACTICE session.
- Boolean: validators unit-tested at boundaries · actions integration-tested for flag-on reach + persist,
  flag-off inertness, invalid-value drop, and MIXED_PRACTICE start.

## T8 — verify
`npm run typecheck` · full unit + integration · `npm run db:seed` · `npm run build` · `npm run audit:browser`
(the /result + /test + /pricing route changes need real-transport). Assert flag-OFF still byte-identical.

## Wave-review lenses
Own-session-only result access (no IDOR); content-never-gated invariant intact; no mint/cookie-set in any
page render; flag-OFF inertness; the new tests are non-vacuous (would fail on the regression they target).
