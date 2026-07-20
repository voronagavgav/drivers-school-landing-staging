import "server-only";
import { randomUUID } from "node:crypto";
import {
  recordBatch,
  isRateLimited,
  hashIp,
  deviceTypeFromUserAgent,
  type RateState,
  type RateConfig,
} from "@/lib/analytics-ingest";
import { clientIpFromHeaders } from "@/lib/login-throttle";
import { resolveAnalyticsSalt } from "@/lib/analytics-salt";
import { TRACK_RATE_MAX_BATCHES, TRACK_RATE_WINDOW_SECONDS } from "@/lib/constants";

// Per-instance wiring for the /api/track ingest. Same MVP caveat as login throttling: this in-memory
// Map lives in THIS process and does NOT coordinate across instances or survive a restart. A
// horizontally-scaled deployment must move it to a shared store (Redis/Upstash) keyed identically.

// First-party cookies (no third-party trackers). The anonymousId is a stable, opaque, first-party
// visitor id we mint ourselves; the opt-out cookie lets a user turn analytics off (respected here).
export const ANON_ID_COOKIE = "ds_anon";
export const OPTOUT_COOKIE = "ds_no_analytics";
const ANON_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

const rateStore = new Map<string, RateState>();
const rateConfig: RateConfig = {
  maxAttempts: TRACK_RATE_MAX_BATCHES,
  windowMs: TRACK_RATE_WINDOW_SECONDS * 1000,
};

/**
 * True iff `key` (anonymousId, else hashed ip) has reached the batch cap within the active window.
 * Call this BEFORE doing the parse/store work so a flood is cheap to reject.
 */
export function isTrackRateLimited(key: string): boolean {
  return isRateLimited(rateStore.get(key), Date.now(), rateConfig);
}

/** Count one accepted batch from `key`, opening or extending its window. */
export function noteTrackBatch(key: string): void {
  rateStore.set(key, recordBatch(rateStore.get(key), Date.now(), rateConfig));
}

/** Test-only: clear the per-instance rate store between cases. */
export function _resetTrackRateStore(): void {
  rateStore.clear();
}

// ---- Request context derivation -----------------------------------------

export type TrackRequestContext = {
  /** Stable first-party visitor id (from cookie; minted if absent — see `mintedAnonId`). */
  anonymousId: string;
  /** True when we generated a fresh anonymousId this request (the route should set the cookie). */
  mintedAnonId: boolean;
  /** SHA-256(salt + ip) — pseudonymous, never the raw ip; null when no ip is available. */
  ipHash: string | null;
  /** Coarse device bucket from the UA, or null. */
  deviceType: string | null;
  /** Raw UA string (kept for first-party analytics; not a third-party identifier). */
  userAgent: string | null;
  /** The rate-limit key: anonymousId when present, else the hashed ip, else "anon". */
  rateKey: string;
};

type HeaderLike = { get(name: string): string | null };

/**
 * Derive the server-side request context from headers + the existing anonymousId cookie. The
 * anonymousId is taken from / minted into a first-party cookie (NOT the request body) so it can't
 * be spoofed per-event. The raw ip is hashed immediately and never returned or stored.
 */
export function deriveTrackContext(
  headers: HeaderLike,
  existingAnonId: string | undefined | null,
  env: NodeJS.ProcessEnv = process.env,
): TrackRequestContext {
  const ua = headers.get("user-agent");
  const ip = clientIpFromHeaders(headers.get("x-forwarded-for"), headers.get("x-real-ip"));
  const ipHash = hashIp(ip, resolveAnalyticsSalt(env));

  let anonymousId = (existingAnonId ?? "").trim();
  let mintedAnonId = false;
  if (anonymousId === "") {
    anonymousId = randomUUID();
    mintedAnonId = true;
  }

  return {
    anonymousId,
    mintedAnonId,
    ipHash,
    deviceType: deviceTypeFromUserAgent(ua),
    userAgent: ua,
    rateKey: anonymousId || ipHash || "anon",
  };
}

export const anonCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge: ANON_ID_MAX_AGE_SECONDS,
};

// The opt-out cookie is a USER PREFERENCE, not a secret, so it is intentionally NOT httpOnly:
// the client tracker also reads it to stop sending immediately (lib/client/track.ts). The route
// + this module only ever READ it to suppress ingestion; the account-settings action WRITES it.
export const optOutCookieOptions = {
  httpOnly: false,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge: ANON_ID_MAX_AGE_SECONDS,
};

/**
 * Whether analytics must be SUPPRESSED for this request: a stored opt-out cookie, or the
 * browser's Do-Not-Track signal (DNT: 1 / Sec-GPC: 1). Honour either — never record when set.
 */
export function isAnalyticsOptedOut(
  headers: HeaderLike,
  optOutCookie: string | undefined | null,
): boolean {
  if (optOutCookie && optOutCookie.trim() !== "" && optOutCookie !== "0") return true;
  if (headers.get("dnt") === "1") return true;
  if (headers.get("sec-gpc") === "1") return true;
  return false;
}
