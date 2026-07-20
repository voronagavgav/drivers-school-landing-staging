import { describe, it, expect, vi, afterEach } from "vitest";
import { isValueFirstFunnelEnabled } from "@/lib/funnel";

describe("funnel.isValueFirstFunnelEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exact string 'true' → true", () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "true");
    expect(isValueFirstFunnelEnabled()).toBe(true);
  });

  it("unset → false", () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", undefined as unknown as string);
    expect(isValueFirstFunnelEnabled()).toBe(false);
  });

  it("empty string → false", () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "");
    expect(isValueFirstFunnelEnabled()).toBe(false);
  });

  it("'1' → false", () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "1");
    expect(isValueFirstFunnelEnabled()).toBe(false);
  });

  it("'TRUE' (wrong case) → false", () => {
    vi.stubEnv("VALUE_FIRST_FUNNEL", "TRUE");
    expect(isValueFirstFunnelEnabled()).toBe(false);
  });
});
