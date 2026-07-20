# Task: wave18-05-checkout-test-nonvacuous

**Status:** done
**Driver:** auto
**Updated:** 2026-07-06T00:00Z
**Last compute:** mac-mini

## Goal
Spec wave18 T5 (CONFIRMED #7, add-test). In `lib/server/checkout.integration.test.ts`, test case (e)
("grant still writes with ENTITLEMENTS_ENABLED off") asserts `row?.tier === "EXAM_ACCESS"` — but that
entitlement row ALREADY exists from case (a) (both use the shared `buyerId`, whose entitlement is never
cleared between cases). So (e) passes even if `completeCheckout` were (hypothetically) gated to SKIP the
write when ENTITLEMENTS is off — the assertion is VACUOUS. Fix so (e) proves THIS call's write. PASS =
ALL true:

1. Case (e) in `lib/server/checkout.integration.test.ts` no longer depends on a pre-existing grant. It
   either (a) uses a FRESH user created with NO prior entitlement, or (b) deletes the buyer's
   entitlement (`prisma.entitlement.deleteMany({ where: { userId } })`) IMMEDIATELY BEFORE the
   `runCheckout()` call — so the post-call `getEntitlement(...).tier === "EXAM_ACCESS"` assertion can
   only pass because THIS ENTITLEMENTS-off call wrote the grant.
2. NON-VACUITY oracle (the anti-self-grading check): with the current `completeCheckout`, case (e)
   PASSES. If `completeCheckout` were modified to early-return/skip the entitlement upsert when
   `!isEntitlementsEnabled()`, case (e) would FAIL (no row → `row` null → assertion fails). Demonstrate
   this in the journal Log by TEMPORARILY guarding the upsert behind the flag locally, running case (e),
   observing RED, then reverting — record the observed pass→fail flip. (Do not leave the guard in.)
3. Case (e) still asserts the read gate stays inert with ENTITLEMENTS off:
   `checkIntelligenceAccess(userId)` returns `{ enabled: false, hasAccess: true }` (unchanged).
4. If a fresh user is used, it is created in `beforeAll`/case setup and cleaned up in `afterAll` (delete
   its analyticsEvent rows BEFORE the user delete — `AnalyticsEvent.userId` is SetNull — then the user;
   FK-safe, per the existing teardown). No leakage into other cases (each case's env is reset in
   `afterEach`).
5. `npm run test:integration` exits 0 (the whole checkout suite still green) · `npx tsc --noEmit` · `npm
   test` exit 0.

## Constraints / decisions
- Test-only change: do NOT modify `app/actions/checkout.ts` — the production grant path is correct; the
  test was vacuous. This task hardens the ASSERTION, nothing else.
- Prefer the fresh-user approach — it isolates case (e) from case (a)/(b) ordering entirely, and mirrors
  the buyer-fixture creation already in `beforeAll`. Deleting buyer's entitlement mid-suite risks
  perturbing case (b)'s idempotency count if ordering ever changes.
- Keep the case IDs/comments (a–e) and their existing intent; only case (e)'s setup + non-vacuity
  changes.

## Next
- [x] Introduce a fresh no-entitlement user for case (e); run the local skip-when-off flip to record
      the pass→fail non-vacuity proof; revert the temporary guard.
- Task complete — nothing further. (Verify re-runs test:integration + tsc + npm test.)

## Log
- 2026-07-06 mac-mini: planned from specs/wave18-funnel-fixes.md T5.
- 2026-07-06T10:19Z ClPcs-Mac-mini: case (e) now uses a FRESH `flagOffId` buyer created in beforeAll
  (no prior entitlement), asserting `getEntitlement(flagOffId)` is null BEFORE runCheckout so the
  post-call `tier === "EXAM_ACCESS"` proves THIS ENTITLEMENTS-off call wrote the grant. Cleaned up in
  afterAll (analyticsEvent delete before user delete; Entitlement→User is Cascade so the grant row
  cascades). NON-VACUITY PROOF: temporarily wrapped the `entitlement.upsert` in `app/actions/checkout.ts`
  behind `if (isEntitlementsEnabled())` → case (e) went RED (`expected undefined to be 'EXAM_ACCESS'`,
  line 155), other 4 cases still green; reverted (git diff clean). Green: npx tsc --noEmit · npm test
  (608) · npm run test:integration (248 passed, 2 skipped). Status → done.

## Artifacts
- lib/server/checkout.integration.test.ts (case (e) fresh-user non-vacuity hardening)

## Verify
**Last verify:** PASS (2026-07-06T07:20:28Z)

## Evaluation
**Last evaluation:** PASS (2026-07-06T07:22:31Z)
