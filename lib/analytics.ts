import "server-only";
import { prisma } from "@/lib/db";
import type { AnalyticsEventName } from "@/lib/constants";
import type { TrackEventInput } from "@/lib/analytics-ingest";
import type { TrackRequestContext } from "@/lib/server/analytics-ingest";

// Fire-and-forget analytics. MUST NOT break the user flow if recording fails — every call
// is wrapped so a DB error is logged and swallowed. Callers may `void recordEvent(...)`.
export async function recordEvent(
  eventName: AnalyticsEventName,
  userId: string | null,
  payload?: unknown,
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventName,
        userId: userId ?? undefined,
        payloadJson: payload === undefined ? null : JSON.stringify(payload),
      },
    });
  } catch (err) {
    console.error(`[analytics] failed to record ${eventName}:`, err);
  }
}

/**
 * Persist a validated BATCH of first-party client events from /api/track.
 *
 * Each event is stored on the freeform (eventType) lane of AnalyticsEvent. We write ONLY
 * whitelisted, non-PII fields plus the server-derived context (pseudonymous ipHash, device bucket,
 * first-party anonymousId). The raw ip is NEVER passed in here — only its hash — and there is no
 * password / answer-text / form-value field, so none can be stored. `userId` ties events to a
 * logged-in user when known; anonymous visitors keep it null.
 *
 * Fire-and-forget semantics like recordEvent: a DB failure is logged and swallowed (analytics must
 * never break a user flow). Uses createMany for one round-trip per batch.
 */
export async function recordEvents(
  events: TrackEventInput[],
  ctx: TrackRequestContext,
  userId: string | null,
): Promise<void> {
  if (events.length === 0) return;
  try {
    await prisma.analyticsEvent.createMany({
      data: events.map((e) => ({
        // Constant marker on the typed `eventName` column so the freeform lane is queryable
        // alongside the typed events; the real client type lives in `eventType`.
        eventName: "client_event",
        eventType: e.eventType,
        userId: userId ?? undefined,
        path: e.path ?? undefined,
        referrer: e.referrer ?? undefined,
        elementType: e.elementType ?? undefined,
        elementLabel: e.elementLabel ?? undefined,
        sessionId: e.sessionId ?? undefined,
        viewport: e.viewport ?? undefined,
        durationMs: e.durationMs ?? undefined,
        metadata: e.metadata === undefined ? undefined : JSON.stringify(e.metadata),
        // Server-derived, pseudonymous context (NEVER a raw ip):
        anonymousId: ctx.anonymousId,
        ipHash: ctx.ipHash ?? undefined,
        deviceType: ctx.deviceType ?? undefined,
        userAgent: ctx.userAgent ?? undefined,
      })),
    });
  } catch (err) {
    console.error(`[analytics] failed to record batch of ${events.length}:`, err);
  }
}

// Audit log for admin/content mutations.
export async function logAdminAction(params: {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: unknown;
}): Promise<void> {
  try {
    await prisma.adminActionLog.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? undefined,
        payloadJson: params.payload === undefined ? null : JSON.stringify(params.payload),
      },
    });
  } catch (err) {
    console.error(`[audit] failed to log ${params.action}:`, err);
  }
}
