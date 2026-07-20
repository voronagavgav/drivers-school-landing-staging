// ---------------------------------------------------------------------------
// PURE analytics-ingest core. No I/O, no database client, no server-runtime-only
// modules, no Next imports — it does NOT read the environment itself (salt is
// passed in). Imported by BOTH the route/server layer AND unit tests, so it MUST
// stay runtime-agnostic and unit-testable.
//
// PRIVACY (first-party only): this lane stores a WHITELIST of non-identifying
// interaction fields plus a HASHED ip. It must never carry raw ip addresses,
// passwords, answer text/correctness, or raw form-field values. The zod schema
// below is the whitelist — anything not listed is dropped, so a client cannot
// smuggle extra keys into the row.
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";
import { z } from "zod";
import {
  TRACK_MAX_BATCH_SIZE,
  TRACK_MAX_STRING_LEN,
  TRACK_MAX_PATH_LEN,
} from "@/lib/constants";
import {
  recordFailedAttempt,
  isThrottled,
  type LoginThrottleState,
  type LoginThrottleConfig,
} from "@/lib/login-throttle";

// ---- IP pseudonymisation -------------------------------------------------

/**
 * One-way pseudonymise a client ip: SHA-256 over `salt + ":" + ip`, hex digest.
 *
 * The server salt makes the digest non-reversible without it (defeats a precomputed
 * rainbow table over the small IPv4 space) and rotatable. We return a hex string and
 * NEVER expose or persist the raw ip anywhere. An empty/whitespace ip yields null
 * (nothing to hash — e.g. a direct LAN hit with no forwarded header).
 */
export function hashIp(ip: string | null | undefined, salt: string): string | null {
  if (typeof ip !== "string") return null;
  const trimmed = ip.trim();
  if (trimmed === "") return null;
  return createHash("sha256").update(`${salt}:${trimmed}`).digest("hex");
}

// ---- Device-type bucketing ----------------------------------------------

/**
 * Coarse device bucket derived from a user-agent string: "mobile" | "tablet" | "desktop".
 * A bucket (not the raw UA) is what most analytics needs and it carries far less entropy.
 * Tablet is matched before mobile because "iPad"/"Tablet" UAs also contain mobile-ish tokens.
 * Returns null when there is no usable UA.
 */
export function deviceTypeFromUserAgent(ua: string | null | undefined): string | null {
  if (typeof ua !== "string") return null;
  const s = ua.trim();
  if (s === "") return null;
  const lower = s.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(lower)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(lower)) return "mobile";
  return "desktop";
}

// ---- Batch validation (the PII whitelist) -------------------------------

const boundedString = (max: number) => z.string().trim().max(max);

// One client event. Only these keys are accepted; unknown keys are STRIPPED (zod's default for
// object schemas) so a client cannot inject extra columns or PII. `metadata` is a small freeform
// record of primitive values for event-specific extras (never form values — enforced by callers
// and by the size cap), NOT arbitrary nested objects.
export const trackEventSchema = z.object({
  // Required: the freeform client event type (e.g. "click", "page_view", "scroll").
  eventType: boundedString(TRACK_MAX_STRING_LEN).min(1, { error: "Невірний тип події." }),
  path: boundedString(TRACK_MAX_PATH_LEN).optional(),
  referrer: boundedString(TRACK_MAX_PATH_LEN).optional(),
  elementType: boundedString(TRACK_MAX_STRING_LEN).optional(),
  // A human label / data-attr of the interacted element — NEVER a raw input value.
  elementLabel: boundedString(TRACK_MAX_STRING_LEN).optional(),
  // Client-proposed session id (rotates per browsing session). The persistent anonymousId is taken
  // from the first-party cookie server-side, NOT from the body, so it can't be spoofed per-event.
  sessionId: boundedString(TRACK_MAX_STRING_LEN).optional(),
  viewport: boundedString(64).optional(),
  durationMs: z.number().int().nonnegative().max(86_400_000).optional(),
  // wave16-review hardening: metadata string VALUES are capped at 64 chars and may not contain
  // `@` — legit extras are short tokens (mode names, counts, flags), while the classic PII-smuggle
  // vector is an email pasted into the freeform record. An event failing this parse is rejected
  // whole (like any other invalid event); the route still acks 200.
  metadata: z
    .record(
      z.string().max(64),
      z.union([z.string().max(64).regex(/^[^@]*$/), z.number(), z.boolean()]),
    )
    .optional(),
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;

// A POST body: a non-empty, capped batch of events. The cap is enforced here (a larger batch is
// REJECTED, not silently truncated) so the client learns its batch was too big.
export const trackBatchSchema = z.object({
  events: z
    .array(trackEventSchema)
    .min(1, { error: "Порожній пакет подій." })
    .max(TRACK_MAX_BATCH_SIZE, { error: "Завеликий пакет подій." }),
});

// ---- Per-source rate limiting (reuses the pure throttle core) ------------
//
// The endpoint counts BATCHES per source within a rolling window. We reuse the same window/decay
// logic as the login throttle (lib/login-throttle.ts) so there is one well-tested primitive; only
// the key (anonymousId, else hashed ip) and the cap differ.

export type { LoginThrottleState as RateState, LoginThrottleConfig as RateConfig };

/** Record one batch from `state`, returning the new state (fresh window once the old one elapses). */
export function recordBatch(
  state: LoginThrottleState | undefined,
  nowMs: number,
  config: LoginThrottleConfig,
): LoginThrottleState {
  return recordFailedAttempt(state, nowMs, config);
}

/** True iff `state` has reached the batch cap within its active window. */
export function isRateLimited(
  state: LoginThrottleState | undefined,
  nowMs: number,
  config: LoginThrottleConfig,
): boolean {
  return isThrottled(state, nowMs, config);
}
