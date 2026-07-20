import { describe, it, expect } from "vitest";
import { digitToOptionIndex, swipeAction, clampResumeIndex, SWIPE_THRESHOLD } from "@/lib/runner-input";

// FROZEN golden vectors from the wave12b-11 spec (§D bullets 3–5 + 7) — the
// same semantics the task's verify probe pins. Do NOT edit these expectations
// to match the implementation; they are the spec.

describe("digitToOptionIndex", () => {
  const cases: ReadonlyArray<{ key: string; count: number; want: number | null }> = [
    { key: "1", count: 4, want: 0 },
    { key: "4", count: 4, want: 3 },
    { key: "9", count: 9, want: 8 },
    { key: "4", count: 3, want: null }, // digit past the last option
    { key: "5", count: 4, want: null },
    { key: "0", count: 4, want: null }, // no 0th option
    { key: "Enter", count: 4, want: null },
    { key: "12", count: 20, want: null }, // multi-char keys never select
    { key: "a", count: 4, want: null },
    { key: " ", count: 4, want: null },
    { key: "", count: 4, want: null },
  ];
  for (const { key, count, want } of cases) {
    it(`key ${JSON.stringify(key)} with ${count} options → ${want}`, () => {
      expect(digitToOptionIndex(key, count)).toBe(want);
    });
  }
});

describe("swipeAction", () => {
  it("leftward swipe past the threshold → next", () => {
    expect(swipeAction(-60, 10)).toBe("next");
  });
  it("rightward swipe past the threshold → prev", () => {
    expect(swipeAction(60, -5)).toBe("prev");
  });
  it("fires exactly at the default 48px threshold", () => {
    expect(swipeAction(-SWIPE_THRESHOLD, 0)).toBe("next");
    expect(swipeAction(SWIPE_THRESHOLD, 0)).toBe("prev");
  });
  it("below the threshold → null", () => {
    expect(swipeAction(-47, 0)).toBeNull();
    expect(swipeAction(47, 0)).toBeNull();
  });
  it("predominantly vertical movement is a scroll, not navigation", () => {
    expect(swipeAction(-60, 80)).toBeNull();
    expect(swipeAction(60, -80)).toBeNull();
  });
  it("equal |deltaX| and |deltaY| still counts as horizontal", () => {
    expect(swipeAction(-60, 60)).toBe("next");
  });
  it("honors a custom threshold", () => {
    expect(swipeAction(-30, 0, 20)).toBe("next");
    expect(swipeAction(-19, 0, 20)).toBeNull();
  });
  it("zero-delta tap → null", () => {
    expect(swipeAction(0, 0)).toBeNull();
  });
});

describe("clampResumeIndex", () => {
  const cases: ReadonlyArray<{ name: string; saved: unknown; total: number; want: number }> = [
    { name: "valid saved index", saved: "3", total: 20, want: 3 },
    { name: "first question", saved: "0", total: 20, want: 0 },
    { name: "last question", saved: "19", total: 20, want: 19 },
    { name: "out of range → 0", saved: "25", total: 20, want: 0 },
    { name: "exactly total → 0", saved: "20", total: 20, want: 0 },
    { name: "negative → 0", saved: "-1", total: 20, want: 0 },
    { name: "null → 0", saved: null, total: 20, want: 0 },
    { name: "undefined → 0", saved: undefined, total: 20, want: 0 },
    { name: "non-numeric string → 0", saved: "abc", total: 20, want: 0 },
    { name: "in-range number passes through", saved: 5, total: 20, want: 5 },
    { name: "empty session (total 0) → 0", saved: "3", total: 0, want: 0 },
  ];
  for (const { name, saved, total, want } of cases) {
    it(`${name}`, () => {
      expect(clampResumeIndex(saved, total)).toBe(want);
    });
  }
});
