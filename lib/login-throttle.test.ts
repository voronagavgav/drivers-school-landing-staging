import { describe, it, expect } from "vitest";
import {
  recordFailedAttempt,
  isThrottled,
  clientIpFromHeaders,
  type LoginThrottleState,
} from "@/lib/login-throttle";

const cfg = { maxAttempts: 3, windowMs: 1000 };

describe("login-throttle.isThrottled", () => {
  it("is not throttled when there is no state", () => {
    expect(isThrottled(undefined, 0, cfg)).toBe(false);
  });

  it("is not throttled while under the limit within the window", () => {
    let s: LoginThrottleState | undefined;
    s = recordFailedAttempt(s, 0, cfg); // 1
    s = recordFailedAttempt(s, 100, cfg); // 2
    expect(isThrottled(s, 150, cfg)).toBe(false);
  });

  it("is throttled at the limit within the window", () => {
    let s: LoginThrottleState | undefined;
    s = recordFailedAttempt(s, 0, cfg); // 1
    s = recordFailedAttempt(s, 100, cfg); // 2
    s = recordFailedAttempt(s, 200, cfg); // 3 -> at limit
    expect(isThrottled(s, 250, cfg)).toBe(true);
  });

  it("stays throttled over the limit within the window", () => {
    let s: LoginThrottleState | undefined;
    for (const t of [0, 100, 200, 300, 400]) {
      s = recordFailedAttempt(s, t, cfg);
    }
    expect(isThrottled(s, 450, cfg)).toBe(true);
  });

  it("resets once the window has elapsed: a fresh attempt is not throttled", () => {
    let s: LoginThrottleState | undefined;
    s = recordFailedAttempt(s, 0, cfg); // 1
    s = recordFailedAttempt(s, 100, cfg); // 2
    s = recordFailedAttempt(s, 200, cfg); // 3 -> throttled
    expect(isThrottled(s, 250, cfg)).toBe(true);
    // Window elapsed: the next failure starts a brand-new window at failures: 1.
    const s2 = recordFailedAttempt(s, 5000, cfg);
    expect(s2.failures).toBe(1);
    expect(isThrottled(s2, 5001, cfg)).toBe(false);
  });

  it("is not throttled when the window has elapsed even if failures were high", () => {
    const s: LoginThrottleState = { failures: 99, windowStartMs: 0 };
    expect(isThrottled(s, 5000, cfg)).toBe(false);
  });
});

describe("login-throttle.recordFailedAttempt", () => {
  it("starts a fresh window (failures: 1) from no state", () => {
    const s = recordFailedAttempt(undefined, 42, cfg);
    expect(s).toEqual({ failures: 1, windowStartMs: 42 });
  });

  it("increments within an active window, keeping the original window start", () => {
    const s = recordFailedAttempt({ failures: 1, windowStartMs: 0 }, 200, cfg);
    expect(s).toEqual({ failures: 2, windowStartMs: 0 });
  });

  it("starts a fresh window once the previous window has elapsed", () => {
    const s = recordFailedAttempt({ failures: 2, windowStartMs: 0 }, 1500, cfg);
    expect(s).toEqual({ failures: 1, windowStartMs: 1500 });
  });

  it("does not mutate the passed-in state", () => {
    const original: LoginThrottleState = { failures: 1, windowStartMs: 0 };
    const snapshot = { ...original };
    recordFailedAttempt(original, 100, cfg);
    expect(original).toEqual(snapshot);
  });
});

// The pure core is key-agnostic, so the per-IP bucket (lib/server/login-throttle.ts) reuses the
// exact same counting/decay logic — just with a higher cap. These tests exercise that the same
// core, driven with an IP-style config, throttles a source (password-spraying) the same way it
// throttles a single email, and that the buckets are independent (separate states never merge).
describe("login-throttle — per-IP (password-spraying) semantics over the same core", () => {
  const ipCfg = { maxAttempts: 12, windowMs: 1000 }; // higher cap, like the real ipConfig

  it("throttles one source only once it crosses the (higher) IP cap within the window", () => {
    let ipState: LoginThrottleState | undefined;
    for (let i = 0; i < ipCfg.maxAttempts - 1; i++) {
      ipState = recordFailedAttempt(ipState, i, ipCfg);
    }
    expect(isThrottled(ipState, 100, ipCfg)).toBe(false); // 11 < 12: spray not yet blocked
    ipState = recordFailedAttempt(ipState, 200, ipCfg); // 12th
    expect(isThrottled(ipState, 250, ipCfg)).toBe(true);
  });

  it("keeps the per-IP and per-email buckets independent (failures from one don't block the other)", () => {
    const emailCfg = { maxAttempts: 3, windowMs: 1000 };
    // One email hits its small cap...
    let emailState: LoginThrottleState | undefined;
    for (const t of [0, 100, 200]) emailState = recordFailedAttempt(emailState, t, emailCfg);
    expect(isThrottled(emailState, 250, emailCfg)).toBe(true);
    // ...while a DIFFERENT source's IP bucket (its own state) saw only those few attempts and
    // is nowhere near the higher IP cap. Distinct state objects → no cross-contamination.
    const ipState: LoginThrottleState = { failures: 3, windowStartMs: 0 };
    expect(isThrottled(ipState, 250, ipCfg)).toBe(false);
  });
});

describe("login-throttle.clientIpFromHeaders", () => {
  it("uses the FIRST x-forwarded-for hop (the original client) when present", () => {
    expect(clientIpFromHeaders("203.0.113.7, 70.41.3.18, 150.172.238.178", "10.0.0.1")).toBe(
      "203.0.113.7",
    );
  });

  it("trims whitespace around the first hop", () => {
    expect(clientIpFromHeaders("  198.51.100.9  , 10.0.0.2", null)).toBe("198.51.100.9");
  });

  it("falls back to x-real-ip when there is no x-forwarded-for", () => {
    expect(clientIpFromHeaders(null, "192.0.2.44")).toBe("192.0.2.44");
    expect(clientIpFromHeaders(undefined, "192.0.2.44")).toBe("192.0.2.44");
  });

  it("returns null when neither header is present (direct LAN/Tailscale hit — degrade gracefully)", () => {
    expect(clientIpFromHeaders(null, null)).toBeNull();
    expect(clientIpFromHeaders(undefined, undefined)).toBeNull();
  });

  it("returns null for empty / whitespace-only header values", () => {
    expect(clientIpFromHeaders("", "")).toBeNull();
    expect(clientIpFromHeaders("   ", "   ")).toBeNull();
    expect(clientIpFromHeaders(",", null)).toBeNull(); // empty first hop → no usable IP
  });
});
