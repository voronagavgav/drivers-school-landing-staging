import { describe, it, expect } from "vitest";
import { resolveSessionSecret, DEV_FALLBACK_SECRET } from "@/lib/session-secret";

describe("session-secret.resolveSessionSecret (configured secret)", () => {
  it("returns a non-empty SESSION_SECRET as-is (dev)", () => {
    expect(resolveSessionSecret({ SESSION_SECRET: "real-secret", NODE_ENV: "development" })).toBe(
      "real-secret",
    );
  });
  it("returns a non-empty SESSION_SECRET even in production", () => {
    expect(resolveSessionSecret({ SESSION_SECRET: "real-secret", NODE_ENV: "production" })).toBe(
      "real-secret",
    );
  });
});

describe("session-secret.resolveSessionSecret (dev fallback)", () => {
  it("returns the dev fallback when unset and NODE_ENV is development", () => {
    expect(resolveSessionSecret({ NODE_ENV: "development" })).toBe(DEV_FALLBACK_SECRET);
  });
  it("returns the dev fallback when unset and NODE_ENV is test", () => {
    expect(resolveSessionSecret({ NODE_ENV: "test" })).toBe(DEV_FALLBACK_SECRET);
  });
  it("returns the dev fallback when unset and NODE_ENV is undefined", () => {
    expect(resolveSessionSecret({})).toBe(DEV_FALLBACK_SECRET);
  });
  it("returns the dev fallback for an empty-string secret outside production", () => {
    expect(resolveSessionSecret({ SESSION_SECRET: "", NODE_ENV: "development" })).toBe(
      DEV_FALLBACK_SECRET,
    );
  });
});

describe("session-secret.resolveSessionSecret (production guard)", () => {
  it("throws naming SESSION_SECRET when unset in production", () => {
    expect(() => resolveSessionSecret({ NODE_ENV: "production" })).toThrow(/SESSION_SECRET/);
  });
  it("throws when SESSION_SECRET is an empty string in production", () => {
    expect(() => resolveSessionSecret({ SESSION_SECRET: "", NODE_ENV: "production" })).toThrow(
      /SESSION_SECRET/,
    );
  });
});
