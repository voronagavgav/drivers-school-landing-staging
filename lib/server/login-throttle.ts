import "server-only";
import {
  isThrottled,
  recordFailedAttempt,
  type LoginThrottleConfig,
  type LoginThrottleState,
} from "@/lib/login-throttle";
import { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_SECONDS } from "@/lib/constants";

// Per-instance in-memory throttle stores over the pure core (lib/login-throttle.ts).
//
// MVP only: these Maps live in THIS process and do NOT coordinate across server instances or
// survive a restart. A multi-instance / horizontally-scaled deployment MUST replace them with a
// shared store (Redis/Upstash, keyed the same way) so a flood spread across instances is still
// counted — that is explicitly OUT OF SCOPE for the single-instance MVP. (See also the note on
// LOGIN_MAX_ATTEMPTS / LOGIN_WINDOW_SECONDS in lib/constants.ts.)
//
// Two independent buckets defend two distinct attacks:
//   - emailStore: many guesses against ONE account (targeted brute force). Key = normalized email.
//   - ipStore:    guesses spread across MANY accounts from ONE source (password-spraying).
//                 Key = client IP. The IP bucket has its own (typically larger) cap so a shared
//                 NAT/proxy doesn't lock out legitimate users too aggressively.
const emailStore = new Map<string, LoginThrottleState>();
const ipStore = new Map<string, LoginThrottleState>();

const emailConfig: LoginThrottleConfig = {
  maxAttempts: LOGIN_MAX_ATTEMPTS,
  windowMs: LOGIN_WINDOW_SECONDS * 1000,
};

// A single IP may legitimately host several users (shared NAT, household, office), so the per-IP
// cap is higher than the per-email cap while still bounding a spray within the same window.
const ipConfig: LoginThrottleConfig = {
  maxAttempts: LOGIN_MAX_ATTEMPTS * 4,
  windowMs: LOGIN_WINDOW_SECONDS * 1000,
};

// ---- per-email bucket (targeted brute force) ----

/** True iff `email` has reached the per-email failure limit within the active window. */
export function isLoginThrottled(email: string): boolean {
  return isThrottled(emailStore.get(email), Date.now(), emailConfig);
}

/** Record one failed login for `email`, opening or extending its window. */
export function noteLoginFailure(email: string): void {
  emailStore.set(email, recordFailedAttempt(emailStore.get(email), Date.now(), emailConfig));
}

/** Reset `email`'s counter after a successful login. */
export function clearLoginThrottle(email: string): void {
  emailStore.delete(email);
}

// ---- per-IP bucket (password-spraying) ----

/** True iff `ip` has reached the per-IP failure limit within the active window. */
export function isIpLoginThrottled(ip: string): boolean {
  return isThrottled(ipStore.get(ip), Date.now(), ipConfig);
}

/** Record one failed login from `ip`, opening or extending its window. */
export function noteIpLoginFailure(ip: string): void {
  ipStore.set(ip, recordFailedAttempt(ipStore.get(ip), Date.now(), ipConfig));
}

/** Reset `ip`'s counter after a successful login. */
export function clearIpLoginThrottle(ip: string): void {
  ipStore.delete(ip);
}
