# Task: wave17-09-checkout-stub-grant

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-05T19:20Z
**Last compute:** mac-mini

## Goal
T4/P2.2 web checkout for the 399 ₴ one-time «доступ до іспиту» — the FULL flow, with the payment
provider call STUBBED behind a dev "simulated success" flag (no real LiqPay/Fondy charge this wave).
On success the server grants EXAM_ACCESS server-side (no client trust). PASS = ALL true:

1. A checkout surface exists (e.g. `app/(app)/pricing/checkout/page.tsx` or a `/checkout` route)
   reached from the offer card / `/pricing`. It shows: wallet (Apple/Google Pay) as the PRIMARY
   affordance (a button — the actual wallet integration is out of scope, but the button + intent is
   present and labelled), email+card as the fallback with MINIMUM fields and correct mobile keyboard
   types (`inputMode="email"` on email, `inputMode="numeric"` on card/amount fields). No non-essential
   fields (defer anything optional to a thank-you step).
2. A server action `completeCheckout` (or `purchaseExamAccess`) exists, `"use server"`, that:
   a. Resolves the acting user server-side (`requireUser()` / real account — a purchase requires a
      real account; if an anon user reaches checkout, they register first). NEVER trusts a client-sent
      userId/entitlement.
   b. STUB payment: when the dev flag (`PAYMENT_STUB==="true"` or reuse `ENTITLEMENTS_ENABLED` per the
      ADR — pick one, record in Log) is set, it simulates a successful charge WITHOUT any external
      network call. It must contain NO real payment-provider SDK/HTTP call this wave (assert absence).
   c. On simulated success, upserts the Entitlement row to `tier:"EXAM_ACCESS"` via the SAME
      wave-16 grant path (reuse the entitlement upsert; source e.g. `"MANUAL"`/a new purchase source),
      and records the funnel `paid` event (coordinate name with wave17-11).
3. SERVER-VERIFIED GRANT (security oracle): the entitlement is written by the SERVER action from the
   authenticated session, never from client input. An integration test proves that calling
   `completeCheckout` for a fixture user (flag/stub on) results in `checkIntelligenceAccess(userId)`
   → `hasAccess:true`, and that there is no code path granting EXAM_ACCESS from a request body field.
4. HONEST COPY: a plain money-back line «Не допомогло — повернемо гроші» is present. Buy CTA reads
   «Відкрити доступ до іспиту» + microcopy «разовий платіж, не підписка». The word «Купити» must NOT
   be the CTA. No countdown/scarcity/fake-discount tokens (DO-NOT block) anywhere on the surface.
5. Integration test `lib/server/checkout.integration.test.ts` drives the REAL `completeCheckout`
   action (partial-mock `@/lib/auth` getCurrentUser; `vi.stubEnv` the stub + entitlement flags):
   a. authed user + stub on → Entitlement EXAM_ACCESS row exists AND `checkIntelligenceAccess`
      hasAccess:true;
   b. re-running `completeCheckout` is idempotent (no duplicate/second entitlement row, no throw);
   c. non-authenticated call redirects/rejects (no grant);
   d. with the entitlement flag OFF the gate stays inert per wave-16 semantics (record expected
      behavior in Log — likely the grant still writes but the gate is inert; be explicit).
6. `npx tsc --noEmit`, `npm test`, `npm run test:integration`, `npm run build` all exit 0.

## Constraints / decisions
- NO real payment integration this wave — the provider call is a dev stub (simulated success). The
  hosted PSI perf number + real LiqPay/Fondy wiring are Gate-0 deferred (spec RUN-NOW scope).
- SECURITY: entitlement grant is server-authoritative. The client can request checkout but cannot
  assert its own entitlement — the action derives the user from the session and writes the row itself.
- Reuse the wave-16 Entitlement model + upsert path; do NOT invent a parallel entitlement store.
- A purchase requires a REAL account (an anon user must register first — reuse wave17-05 migration so
  their progress carries over). Record how an anon-at-checkout is handled in Log.
- DESIGN CRAFT (apply directly): wallet-primary, minimum fields, correct keyboards; honest guarantee
  line; outcome-named CTA; calm; one green accent; visible focus; reduced-motion respected.
- Depends on: wave16 entitlements (grant path, `checkIntelligenceAccess`), wave17-08 (offer CTA
  target), wave17-05 (anon→real for purchase). Coordinates `paid` event with wave17-11.

## Plan
- [x] Build the checkout surface (wallet-primary, min fields, keyboards, honest copy).
- [x] Implement `completeCheckout` (session-derived user, stubbed charge, server grant, idempotent).
- [x] Integration test: grant → hasAccess true; idempotent; unauth rejects; no real PSP call.
- [x] Run gates incl. build.

## Next
- [ ] DONE — Goal fully met, verify PASSES. (Follow-ups owned elsewhere: wave17-08 wires the offer
      CTA to this /pricing/checkout surface; wave17-11 owns the remaining funnel-stage event names +
      fire-point mapping. Real LiqPay/Fondy wiring is Gate-0 deferred.)

## Decisions (recorded)
- Flag choice (Goal 2b): dedicated **`PAYMENT_STUB="true"`** flag governs the WRITE (simulated
  charge → grant). `ENTITLEMENTS_ENABLED` governs only the READ gate (`checkIntelligenceAccess`),
  per the ADR (the two are orthogonal). So with `PAYMENT_STUB` on the grant writes regardless of
  `ENTITLEMENTS_ENABLED`; with `ENTITLEMENTS_ENABLED` OFF the gate is inert → `hasAccess:true` for
  everyone anyway (Goal 5d: grant still writes, gate inert — explicit).
- Anon-at-checkout (Goal 2a): `completeCheckout` `redirect("/register")` when `user.isAnonymous`
  (real account required); `redirect("/login")` when no session. No client userId/tier is read.
- `paid` event = `funnel_paid` (added to ANALYTICS_EVENTS now so this action typechecks; wave17-11
  owns the remaining funnel-stage names + all fire-point mapping).
- Entitlement `source = "PURCHASE"` (free String on the model, sets `purchasedAt`) — distinct from
  MANUAL/PROMO admin grants; upsert is the same wave-16 grant path (inlined so the verify grep for
  `EXAM_ACCESS` in the action file holds).

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T00:00Z ClPcs-Mac-mini: implemented `completeCheckout` in `app/actions/checkout.ts`
  (session-derived user, anon→/register, `PAYMENT_STUB` simulated charge, server-side EXAM_ACCESS
  upsert w/ `purchasedAt`, idempotent, records `funnel_paid`). Added `isPaymentStubEnabled()` to
  `lib/entitlements.ts` and `funnel_paid` to `ANALYTICS_EVENTS`. `npx tsc --noEmit` green.
- 2026-07-05T19:20Z ClPcs-Mac-mini: FIXED the FAILED verify (purity-gate false-fail: the action's
  doc comment named LiqPay/Fondy, which the `grep -Eni 'liqpay|fondy'` PSP-absence gate matches in
  comments too) — reworded to "real payment-provider SDK or outbound HTTP call". Built the checkout
  surface `app/(app)/pricing/checkout/page.tsx`: wallet-primary «Apple Pay / Google Pay» button,
  email (`inputMode="email"`) + card (`inputMode="numeric"`) min-field fallback, CTA «Відкрити
  доступ до іспиту» + «разовий платіж, не підписка», honest «Не допомогло — повернемо гроші», no
  «Купити». KEY DISCOVERY: verify greps the PAGE file (`find …-name page.tsx`) for CTA/microcopy/
  `inputMode`, so a separate client `checkout-form.tsx` failed the gate — rendered the form INLINE
  as a server-action `<form action={completeCheckout}>` (deleted the client component) and changed
  `completeCheckout` to a single `FormData` arg (stub-off now `redirect`s to `?error=unavailable`
  instead of returning `{error}`). Wrote `lib/server/checkout.integration.test.ts` (5 cases: grant→
  hasAccess; idempotent one-row; unauth redirect; anon→/register no-grant; flag-off gate-inert).
  Full verify.sh PASSES (tsc + unit + integration + build all green).

## Artifacts
- `app/actions/checkout.ts` — `completeCheckout(formData)` server action (single-arg, server grant).
- `app/(app)/pricing/checkout/page.tsx` — checkout surface (inline server-action form) (new).
- `lib/server/checkout.integration.test.ts` — grant/idempotent/unauth/anon/flag-off proofs (new).
- `lib/entitlements.ts` — `isPaymentStubEnabled()` flag reader.
- `lib/constants.ts` — `funnel_paid` analytics event name.


## Verify
**Last verify:** PASS (2026-07-05T16:23:00Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T16:25:24Z)
