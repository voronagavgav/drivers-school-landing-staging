// ---------------------------------------------------------------------------
// PURE flag reader for the value-first conversion funnel (Wave 17). No I/O, no
// database client, no server-runtime-only modules. Mirrors isEntitlementsEnabled()
// (lib/entitlements.ts): a single exact-string opt-in every funnel surface checks
// the same way. Flag defaults OFF (unset) → the whole funnel is inert.
// See docs/strategy/wave17-anon-funnel-adr.md (Flag gating).
// ---------------------------------------------------------------------------

/** Whether the value-first funnel is switched on (exact-string opt-in). */
export function isValueFirstFunnelEnabled(): boolean {
  return process.env.VALUE_FIRST_FUNNEL === "true";
}
