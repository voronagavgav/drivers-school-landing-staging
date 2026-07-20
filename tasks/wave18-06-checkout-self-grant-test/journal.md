# Task: wave18-06-checkout-self-grant-test

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-06T10:25Z
**Last compute:** mac-mini

## Goal
Spec wave18 T6 (CONFIRMED #8, add-test). `lib/server/checkout.integration.test.ts` claims "no
client-sent userId/tier is read" but EVERY case calls `completeCheckout(new FormData())` (empty) — so it
never actually attempts a self-grant. Add an ADVERSARIAL case that submits a FormData carrying a
DIFFERENT userId (and tier) while the mocked session is the buyer, and prove the grant is
server-authoritative. PASS = ALL true:

1. A new case (e.g. "f. self-grant attempt: injected userId/tier is ignored — grant is
   server-authoritative") in `lib/server/checkout.integration.test.ts`: with PAYMENT_STUB on, mocked
   `getCurrentUser` = the buyer, call `completeCheckout(fd)` where `fd` carries
   `fd.set("userId", <a DIFFERENT existing user's id, "victim">)` and `fd.set("tier", "EXAM_ACCESS")`.
   Create a distinct throwaway `victimId` user (no prior entitlement) for the injected id.
2. ASSERT the grant landed on the BUYER (server session), NOT the injected victim:
   `getEntitlement(buyerId)?.tier === "EXAM_ACCESS"` AND `getEntitlement(victimId)` is `null`. Clear the
   buyer's entitlement before this case if needed so the assertion reflects THIS call.
3. NON-VACUITY oracle (anti-self-grading): this case PASSES against the current `completeCheckout`
   (which derives the buyer from the session and never reads `formData.get("userId")/tier`). It would
   FAIL if `completeCheckout` read `formData.get("userId")` for the grant target (victim would get the
   row / buyer would not). Demonstrate in the journal Log by TEMPORARILY changing the action to grant to
   `formData.get("userId")`, observing the new case RED, then reverting — record the pass→fail flip.
   (Do not leave the change in — production action stays untouched at task end.)
4. Teardown deletes the victim user (its analyticsEvent rows first — SetNull — then the user), FK-safe,
   matching the suite's existing `afterAll`. Env reset per case (`afterEach` unstubs).
5. `npm run test:integration` exits 0 (whole checkout suite green) · `npx tsc --noEmit` · `npm test`
   exit 0.

## Constraints / decisions
- Test-only change: `app/actions/checkout.ts` stays UNCHANGED (the temporary flip in criterion 3 is a
  local, reverted experiment recorded in the Log — the committed action is byte-identical).
- The injected-id must be a REAL, DISTINCT user row (victimId) so "grant did NOT land on victim" is a
  meaningful assertion (a random string id could never receive a grant regardless, weakening the test).
- Server-authoritative / privilege-escalation is the high-stakes axis (**Evaluate: yes**): the case must
  prove the grant target is derived ONLY from the mocked session, never from request body.

## Next
- [x] Add throwaway victim user + the self-grant adversarial case; run the temporary action-flip to
      record the pass→fail non-vacuity proof; revert.
- Goal fully met; hand off to wave18-08 verify.

## Artifacts
- `lib/server/checkout.integration.test.ts` — case (f) self-grant adversarial + victim fixture/teardown.
- `app/actions/checkout.ts` — UNCHANGED (byte-identical, `git diff` empty; temp flip reverted).

## Log
- 2026-07-06 mac-mini: planned from specs/wave18-funnel-fixes.md T6.
- 2026-07-06T10:25Z ClPcs-Mac-mini: Added case (f) "self-grant attempt: injected userId/tier is
  ignored — grant is server-authoritative" to checkout.integration.test.ts. New REAL distinct
  `victimId` user (no prior entitlement) created in beforeAll; teardown deletes its analyticsEvent
  rows (SetNull) then the user, FK-safe. `runCheckout` now takes an optional FormData. Case f: session
  = buyer, `fd.set("userId", victimId)`+`fd.set("tier","EXAM_ACCESS")`; clears buyer entitlement first,
  asserts both start null, then grant lands on BUYER (`getEntitlement(buyerId)?.tier==="EXAM_ACCESS"`)
  and victim stays null. NON-VACUITY: temporarily flipped completeCheckout to grant to
  `formData.get("userId")` → case (f) went RED (buyer `undefined`, victim granted) at line 200; reverted
  → `git diff app/actions/checkout.ts` EMPTY (byte-identical). Verify: checkout integration 6/6 pass,
  `tsc --noEmit` exit 0, `npm test` 608/608 pass.

## Verify
**Last verify:** PASS (2026-07-06T07:25:04Z)

## Evaluation
**Last evaluation:** PASS (2026-07-06T07:26:09Z)
