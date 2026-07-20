// Pure login-throttle core: state in -> decision out. NO I/O, NO storage, NO timers.
// The per-instance in-memory store and the wiring into loginAction live in the server layer
// (lib/server/login-throttle.ts); this module stays fully unit-testable.
//
// Callers pass `config` explicitly (built from LOGIN_MAX_ATTEMPTS / LOGIN_WINDOW_SECONDS) so the
// core never imports the constants and can be exercised with arbitrary windows in tests.

export type LoginThrottleState = {
  /** Failed attempts counted within the current window. */
  failures: number;
  /** Epoch-ms timestamp at which the current window started. */
  windowStartMs: number;
};

export type LoginThrottleConfig = {
  /** Failures allowed before `isThrottled` returns true. */
  maxAttempts: number;
  /** Length of the rolling window in milliseconds. */
  windowMs: number;
};

/** True iff `state`'s window still covers `nowMs`. */
function isWindowActive(state: LoginThrottleState, nowMs: number, windowMs: number): boolean {
  return nowMs - state.windowStartMs < windowMs;
}

/**
 * Record a failed login attempt. Increments the failure count when the current window is still
 * active; otherwise (no prior state, or the window has elapsed) starts a FRESH window at `failures: 1`.
 * Pure: never mutates the passed-in `state` — always returns a new object.
 */
export function recordFailedAttempt(
  state: LoginThrottleState | undefined,
  nowMs: number,
  config: LoginThrottleConfig,
): LoginThrottleState {
  if (state && isWindowActive(state, nowMs, config.windowMs)) {
    return { failures: state.failures + 1, windowStartMs: state.windowStartMs };
  }
  return { failures: 1, windowStartMs: nowMs };
}

/**
 * True iff `state` is within an active window AND its failure count has reached `maxAttempts`.
 * No state, or an elapsed window, is never throttled.
 */
export function isThrottled(
  state: LoginThrottleState | undefined,
  nowMs: number,
  config: LoginThrottleConfig,
): boolean {
  if (!state) return false;
  return isWindowActive(state, nowMs, config.windowMs) && state.failures >= config.maxAttempts;
}

/**
 * Derive a stable client-IP throttle key from request headers. Pure: takes the raw header values
 * (the caller reads them from Next's async `headers()`), returns the first-hop IP or null.
 *
 * Precedence: the FIRST entry of `x-forwarded-for` (the original client; later hops are proxies),
 * then `x-real-ip`. When NEITHER is present — e.g. a direct LAN/Tailscale hit with no proxy — this
 * returns null and the caller simply skips per-IP throttling (degrade gracefully, never crash).
 * We trust these headers only because this MVP is single-instance behind a known reverse proxy;
 * a public multi-hop deployment must pin the trusted-proxy hop instead.
 */
export function clientIpFromHeaders(
  forwardedFor: string | null | undefined,
  realIp: string | null | undefined,
): string | null {
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = realIp?.trim();
  return real ? real : null;
}
