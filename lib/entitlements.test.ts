import { describe, it, expect, vi, afterEach } from "vitest";
import { hasIntelligenceAccess, isEntitlementsEnabled } from "@/lib/entitlements";

// FROZEN oracle (wave16-04). Vectors hand-derived from spec T1 at plan time —
// literal values, never computed from the implementation. wave16-05 makes these
// green and MAY NOT edit this file (its verify asserts the sha256 is unchanged).

describe("entitlements.hasIntelligenceAccess", () => {
  it("V1 null entitlement → false", () => {
    expect(hasIntelligenceAccess(null, new Date("2026-07-04T12:00:00.000Z"))).toBe(false);
  });

  it("V2 FREE tier → false", () => {
    expect(
      hasIntelligenceAccess({ tier: "FREE", validUntil: null }, new Date("2026-07-04T12:00:00.000Z")),
    ).toBe(false);
  });

  it("V3 EXAM_ACCESS open-ended grant → true", () => {
    expect(
      hasIntelligenceAccess(
        { tier: "EXAM_ACCESS", validUntil: null },
        new Date("2026-07-04T12:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("V4 EXAM_ACCESS not yet expired → true", () => {
    expect(
      hasIntelligenceAccess(
        { tier: "EXAM_ACCESS", validUntil: new Date("2026-09-01T00:00:00.000Z") },
        new Date("2026-07-04T12:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("V5 EXAM_ACCESS at the exact expiry instant → false (strict boundary)", () => {
    expect(
      hasIntelligenceAccess(
        { tier: "EXAM_ACCESS", validUntil: new Date("2026-09-01T00:00:00.000Z") },
        new Date("2026-09-01T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("V6 EXAM_ACCESS after expiry → false", () => {
    expect(
      hasIntelligenceAccess(
        { tier: "EXAM_ACCESS", validUntil: new Date("2026-09-01T00:00:00.000Z") },
        new Date("2026-09-02T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("V7 EXAM_ACCESS expired one second before now → false", () => {
    expect(
      hasIntelligenceAccess(
        { tier: "EXAM_ACCESS", validUntil: new Date("2026-07-04T11:59:59.000Z") },
        new Date("2026-07-04T12:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("V8 GOLD tier → false (only EXAM_ACCESS grants access)", () => {
    expect(
      hasIntelligenceAccess({ tier: "GOLD", validUntil: null }, new Date("2026-07-04T12:00:00.000Z")),
    ).toBe(false);
  });
});

describe("entitlements.isEntitlementsEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('V9 ENTITLEMENTS_ENABLED="true" → true', () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "true");
    expect(isEntitlementsEnabled()).toBe(true);
  });

  it("V10 ENTITLEMENTS_ENABLED unset → false", () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", undefined as unknown as string);
    expect(isEntitlementsEnabled()).toBe(false);
  });

  it('V11 ENTITLEMENTS_ENABLED="false" → false', () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "false");
    expect(isEntitlementsEnabled()).toBe(false);
  });

  it('V12 ENTITLEMENTS_ENABLED="1" → false (exact-string opt-in)', () => {
    vi.stubEnv("ENTITLEMENTS_ENABLED", "1");
    expect(isEntitlementsEnabled()).toBe(false);
  });
});
