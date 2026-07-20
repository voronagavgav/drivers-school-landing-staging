import "server-only";
import { prisma } from "@/lib/db";
import {
  hasIntelligenceAccess,
  isEntitlementsEnabled,
  type EntitlementLike,
} from "@/lib/entitlements";

// ---------------------------------------------------------------------------
// Server loader + guard for the intelligence-surface entitlement gate. The pure
// core (lib/entitlements.ts) never sees prisma types — this module owns the DB
// read and the row → EntitlementLike mapping. When the master flag is OFF the
// gate is INERT: everyone passes and no query is even needed (see spec T1).
// ---------------------------------------------------------------------------

/** Load a user's Entitlement row (or null if they hold none). */
export async function getEntitlement(userId: string) {
  return prisma.entitlement.findUnique({ where: { userId } });
}

/**
 * Resolve whether a user may see the intelligence surfaces. `enabled` reflects
 * the master flag; when OFF `hasAccess` is unconditionally true (inertness) and
 * no entitlement row is read.
 */
export async function checkIntelligenceAccess(
  userId: string,
  now?: Date,
): Promise<{ enabled: boolean; hasAccess: boolean }> {
  const enabled = isEntitlementsEnabled();
  if (!enabled) return { enabled: false, hasAccess: true };
  const row = await getEntitlement(userId);
  const mapped: EntitlementLike = row ? { tier: row.tier, validUntil: row.validUntil } : null;
  return { enabled: true, hasAccess: hasIntelligenceAccess(mapped, now ?? new Date()) };
}

/** Thrown when the entitlement gate denies access to a gated surface. */
export class EntitlementRequiredError extends Error {
  readonly code = "ENTITLEMENT_REQUIRED";
  constructor() {
    super("Потрібен «Доступ до іспиту», щоб бачити цей розділ");
    this.name = "EntitlementRequiredError";
  }
}

/** Resolve when the user has access; throw EntitlementRequiredError otherwise. */
export async function requireIntelligenceAccess(userId: string, now?: Date): Promise<void> {
  const { hasAccess } = await checkIntelligenceAccess(userId, now);
  if (!hasAccess) throw new EntitlementRequiredError();
}
