import { describe, it, expect } from "vitest";
import { resolveAnalyticsSalt, DEV_FALLBACK_ANALYTICS_SALT } from "@/lib/analytics-salt";

describe("analytics-salt.resolveAnalyticsSalt", () => {
  it("returns a non-empty ANALYTICS_SALT as-is", () => {
    expect(resolveAnalyticsSalt({ ANALYTICS_SALT: "configured-salt" })).toBe("configured-salt");
  });

  it("prefers ANALYTICS_SALT over the SESSION_SECRET derivation even in production", () => {
    expect(
      resolveAnalyticsSalt({
        ANALYTICS_SALT: "explicit",
        SESSION_SECRET: "sess",
        NODE_ENV: "production",
      }),
    ).toBe("explicit");
  });

  it("falls back to the dev salt outside production when unset", () => {
    expect(resolveAnalyticsSalt({})).toBe(DEV_FALLBACK_ANALYTICS_SALT);
    expect(resolveAnalyticsSalt({ NODE_ENV: "development" })).toBe(DEV_FALLBACK_ANALYTICS_SALT);
    expect(resolveAnalyticsSalt({ ANALYTICS_SALT: "" })).toBe(DEV_FALLBACK_ANALYTICS_SALT);
  });

  it("in production derives a NAMESPACED salt from SESSION_SECRET (never equal to it)", () => {
    const out = resolveAnalyticsSalt({ SESSION_SECRET: "the-session-secret", NODE_ENV: "production" });
    expect(out).toBe("analytics:the-session-secret");
    expect(out).not.toBe("the-session-secret"); // must not reuse the raw session secret verbatim
  });

  it("throws in production when neither ANALYTICS_SALT nor SESSION_SECRET is set", () => {
    expect(() => resolveAnalyticsSalt({ NODE_ENV: "production" })).toThrow(/ANALYTICS_SALT/);
  });

  it("the dev fallback is clearly insecure (so it is obvious if it leaks into prod)", () => {
    expect(DEV_FALLBACK_ANALYTICS_SALT).toMatch(/insecure/);
  });
});
