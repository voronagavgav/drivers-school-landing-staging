import { describe, it, expect } from "vitest";
import { latencyBandsForMedian } from "./latency-bands";

describe("latencyBandsForMedian (FROZEN oracle)", () => {
  it("absent/null median → global constants", () => {
    expect(latencyBandsForMedian(null)).toEqual({ easyMs: 5000, hardMs: 30000 });
    expect(latencyBandsForMedian(undefined)).toEqual({ easyMs: 5000, hardMs: 30000 });
    expect(latencyBandsForMedian()).toEqual({ easyMs: 5000, hardMs: 30000 });
  });

  it("degenerate median (≤ 0) → global constants", () => {
    expect(latencyBandsForMedian(0)).toEqual({ easyMs: 5000, hardMs: 30000 });
    expect(latencyBandsForMedian(-1)).toEqual({ easyMs: 5000, hardMs: 30000 });
  });

  it("small median clamps to the floors {2500, 20000}", () => {
    expect(latencyBandsForMedian(1000)).toEqual({ easyMs: 2500, hardMs: 20000 });
    expect(latencyBandsForMedian(3000)).toEqual({ easyMs: 2500, hardMs: 20000 });
  });

  it("mid median: easy floors, hard scales (0.5×/2.5×)", () => {
    expect(latencyBandsForMedian(10000)).toEqual({ easyMs: 5000, hardMs: 25000 });
  });

  it("large median: both bands scale off the median", () => {
    expect(latencyBandsForMedian(40000)).toEqual({ easyMs: 20000, hardMs: 100000 });
  });
});
