// ---------------------------------------------------------------------------
// PURE entitlement engine. No I/O, no database client, no server-runtime-only
// modules, no wall-clock reads — the reference instant is always passed in as
// an argument so the core stays deterministic and unit-testable.
//
// STUB (wave16-04): the oracle in lib/entitlements.test.ts is frozen against
// these throwing bodies. wave16-05 implements them until the oracle is green
// and MUST NOT edit the test.
// ---------------------------------------------------------------------------

/** Minimal shape the access check needs from a persisted entitlement row. */
export type EntitlementLike = { tier: string; validUntil: Date | null } | null;

/**
 * Whether the given entitlement grants access to the intelligence surfaces at
 * the reference instant. Access iff the entitlement is the access tier and is
 * either open-ended or not yet expired (strict boundary: the expiry instant is
 * expired).
 */
export function hasIntelligenceAccess(ent: EntitlementLike, now: Date): boolean {
  if (ent === null || ent.tier !== "EXAM_ACCESS") return false;
  if (ent.validUntil === null) return true;
  // Strict boundary: the expiry instant itself is already expired.
  return ent.validUntil.getTime() > now.getTime();
}

/** Whether the entitlements feature is switched on (exact-string opt-in). */
export function isEntitlementsEnabled(): boolean {
  return process.env.ENTITLEMENTS_ENABLED === "true";
}

/**
 * Whether the checkout charge is stubbed — a dev "simulated success" with NO real payment-provider
 * call (wave17-09, spec P2.2). Orthogonal to isEntitlementsEnabled(): this flag governs whether the
 * WRITE (grant) path may complete a simulated purchase; ENTITLEMENTS_ENABLED governs the READ gate.
 * Real LiqPay/Fondy wiring is Gate-0 deferred; until then a purchase only completes when this is on.
 */
export function isPaymentStubEnabled(): boolean {
  return process.env.PAYMENT_STUB === "true";
}
