import { describe, it, expect } from "vitest";
import {
  OFFLINE_PACK_BUDGET_BYTES,
  canDownload,
} from "@/lib/offline/pack-budget";

// FROZEN ORACLE (task wave13-16): expected values are literals from the task
// spec — do not derive them by calling the implementation.

describe("pack-budget", () => {
  it("budget constant is exactly 50 MiB", () => {
    expect(OFFLINE_PACK_BUDGET_BYTES).toBe(52428800);
  });

  it("refuses when usage + estimate exceeds the budget (49 MiB + 2 MiB)", () => {
    expect(canDownload(51380224, 2097152)).toBe(false);
  });

  it("allows a comfortable fit (10 MiB used + 2 MiB pack)", () => {
    expect(canDownload(10485760, 2097152)).toBe(true);
  });

  it("allows the exact boundary (48 MiB + 2 MiB === 50 MiB)", () => {
    expect(canDownload(50331648, 2097152)).toBe(true);
  });

  it("refuses a single over-budget pack on empty storage (60 MiB)", () => {
    expect(canDownload(0, 62914560)).toBe(false);
  });
});
