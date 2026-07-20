import { describe, it, expect } from "vitest";
import {
  parseRange,
  rangeStart,
  bucketUnit,
  dayKey,
  hourKey,
  buildEmptyBuckets,
  bucketEventsOverTime,
  computeFunnel,
  passRate,
  formatPercent,
  chunk,
  referrerHost,
  DEFAULT_ANALYTICS_RANGE,
} from "./analytics-dashboard";

describe("parseRange", () => {
  it("accepts valid ranges and defaults unknown/empty to the default", () => {
    expect(parseRange("24h")).toBe("24h");
    expect(parseRange("7d")).toBe("7d");
    expect(parseRange("30d")).toBe("30d");
    expect(parseRange("90d")).toBe("90d");
    expect(parseRange("bogus")).toBe(DEFAULT_ANALYTICS_RANGE);
    expect(parseRange(null)).toBe(DEFAULT_ANALYTICS_RANGE);
    expect(parseRange(undefined)).toBe(DEFAULT_ANALYTICS_RANGE);
  });
});

describe("rangeStart / bucketUnit", () => {
  const now = Date.UTC(2026, 5, 18, 12, 0, 0); // 2026-06-18T12:00:00Z
  it("subtracts the right window and picks hour vs day", () => {
    expect(rangeStart("24h", now).getTime()).toBe(now - 24 * 3600_000);
    expect(rangeStart("7d", now).getTime()).toBe(now - 7 * 24 * 3600_000);
    expect(bucketUnit("24h")).toBe("hour");
    expect(bucketUnit("7d")).toBe("day");
    expect(bucketUnit("30d")).toBe("day");
  });
});

describe("dayKey / hourKey", () => {
  it("produce stable UTC keys", () => {
    const d = new Date(Date.UTC(2026, 5, 18, 14, 30, 0));
    expect(dayKey(d)).toBe("2026-06-18");
    expect(hourKey(d)).toBe("2026-06-18T14");
  });
});

describe("buildEmptyBuckets", () => {
  it("builds a contiguous daily series inclusive of both ends", () => {
    const start = Date.UTC(2026, 5, 16, 0, 0, 0);
    const now = Date.UTC(2026, 5, 18, 0, 0, 0);
    const buckets = buildEmptyBuckets(start, now, "day");
    expect(buckets.map((b) => b.key)).toEqual(["2026-06-16", "2026-06-17", "2026-06-18"]);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
    expect(buckets[0].label).toBe("16.06");
  });

  it("builds an hourly series for the 24h window", () => {
    const start = Date.UTC(2026, 5, 18, 10, 0, 0);
    const now = Date.UTC(2026, 5, 18, 12, 0, 0);
    const buckets = buildEmptyBuckets(start, now, "hour");
    expect(buckets.map((b) => b.key)).toEqual([
      "2026-06-18T10",
      "2026-06-18T11",
      "2026-06-18T12",
    ]);
    expect(buckets[0].label).toBe("10:00");
  });
});

describe("bucketEventsOverTime", () => {
  it("counts events into the matching day bucket and ignores out-of-range ones", () => {
    const start = Date.UTC(2026, 5, 16, 0, 0, 0);
    const now = Date.UTC(2026, 5, 18, 0, 0, 0);
    const events = [
      { at: new Date(Date.UTC(2026, 5, 16, 9, 0, 0)) },
      { at: new Date(Date.UTC(2026, 5, 16, 23, 0, 0)) },
      { at: new Date(Date.UTC(2026, 5, 18, 1, 0, 0)) },
      { at: new Date(Date.UTC(2026, 5, 10, 1, 0, 0)) }, // out of range → ignored
    ];
    const buckets = bucketEventsOverTime(events, start, now, "day");
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b.count]));
    expect(byKey["2026-06-16"]).toBe(2);
    expect(byKey["2026-06-17"]).toBe(0);
    expect(byKey["2026-06-18"]).toBe(1);
    // total counted = 3 (the 06-10 one is dropped)
    expect(buckets.reduce((a, b) => a + b.count, 0)).toBe(3);
  });
});

describe("computeFunnel", () => {
  it("computes rate-from-top and rate-from-prev with the first step at 1", () => {
    const f = computeFunnel([
      { key: "reg", label: "Реєстрація", count: 100 },
      { key: "onb", label: "Онбординг", count: 80 },
      { key: "first", label: "Перший тест", count: 40 },
      { key: "done", label: "Завершення", count: 30 },
    ]);
    expect(f[0].rateFromTop).toBe(1);
    expect(f[0].rateFromPrev).toBe(1);
    expect(f[1].rateFromTop).toBeCloseTo(0.8);
    expect(f[1].rateFromPrev).toBeCloseTo(0.8);
    expect(f[2].rateFromTop).toBeCloseTo(0.4);
    expect(f[2].rateFromPrev).toBeCloseTo(0.5);
    expect(f[3].rateFromPrev).toBeCloseTo(0.75);
  });

  it("guards a zero top (all downstream rates 0, no NaN/Infinity)", () => {
    const f = computeFunnel([
      { key: "reg", label: "Реєстрація", count: 0 },
      { key: "onb", label: "Онбординг", count: 0 },
    ]);
    expect(f[0].rateFromTop).toBe(1);
    expect(f[1].rateFromTop).toBe(0);
    expect(f[1].rateFromPrev).toBe(0);
    expect(Number.isFinite(f[1].rateFromPrev)).toBe(true);
  });
});

describe("passRate / formatPercent", () => {
  it("returns a clamped fraction and a whole-percent string", () => {
    expect(passRate(3, 4)).toBeCloseTo(0.75);
    expect(passRate(0, 0)).toBe(0);
    expect(formatPercent(0.756)).toBe("76%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(2)).toBe("100%"); // clamped
  });
});

describe("chunk", () => {
  it("splits ids into batches under the param limit", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });
});

describe("referrerHost", () => {
  it("extracts a host or buckets empty/invalid referrers", () => {
    expect(referrerHost("https://www.google.com/search?q=пдр")).toBe("www.google.com");
    expect(referrerHost("https://t.co/abc")).toBe("t.co");
    expect(referrerHost(null)).toBe("Прямі / без джерела");
    expect(referrerHost("   ")).toBe("Прямі / без джерела");
    expect(referrerHost("not a url")).toBe("not a url");
  });
});
