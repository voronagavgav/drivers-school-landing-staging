import { describe, it, expect } from "vitest";
import { sparkline } from "@/lib/sparkline";

describe("sparkline", () => {
  it("(empty) returns no points and an empty path", () => {
    const s = sparkline([]);
    expect(s.points).toEqual([]);
    expect(s.path).toBe("");
    expect(s).toMatchObject({ width: 120, height: 32 });
  });

  it("(single value) returns one centred point", () => {
    const s = sparkline([50]);
    expect(s.points).toHaveLength(1);
    expect(s.points[0].x).toBe(60); // width/2 with default 120
    expect(s.path.startsWith("M")).toBe(true);
    expect(s.path).not.toContain("L");
  });

  it("(all-equal) draws a flat line at the vertical midpoint", () => {
    const s = sparkline([7, 7, 7], { width: 100, height: 40, padding: 0 });
    expect(s.points).toHaveLength(3);
    // every y is the vertical midpoint — flat horizontal line, no divide-by-zero
    expect(s.points.every((p) => p.y === 20)).toBe(true);
    expect(s.points.some((p) => Number.isNaN(p.x) || Number.isNaN(p.y))).toBe(false);
  });

  it("spreads x evenly from left+padding to right−padding", () => {
    const s = sparkline([1, 2, 3], { width: 120, height: 32, padding: 2 });
    expect(s.points).toHaveLength(3);
    expect(s.points[0].x).toBe(2); // left edge + padding
    expect(s.points[2].x).toBe(118); // right edge − padding
    expect(s.points[1].x).toBe(60); // midpoint
  });

  it("inverts y so larger values sit higher (smaller y)", () => {
    const s = sparkline([10, 20, 30, 40]);
    const ys = s.points.map((p) => p.y);
    // increasing values → strictly decreasing y (top of the SVG is y=0)
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeLessThan(ys[i - 1]);
    }
    // max value clamps to the top (padding), min to the bottom (height − padding)
    expect(ys[ys.length - 1]).toBe(2);
    expect(ys[0]).toBe(30);
  });

  it("path starts with M and has an L per remaining point", () => {
    const s = sparkline([5, 1, 9]);
    expect(s.path.startsWith("M")).toBe(true);
    expect((s.path.match(/L/g) ?? []).length).toBe(2);
    expect(s.path).toBe("M 2 16 L 60 30 L 118 2");
  });
});
