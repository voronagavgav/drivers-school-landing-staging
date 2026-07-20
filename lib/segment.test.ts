import { describe, it, expect } from "vitest";
import { isSegmentTiming, isSegmentConfidence } from "./segment";

// Pure boundary tests for the self-segment (Wave 17/18 T5) tap validators. These
// guard the server-side drop of any value not in the fixed option catalogue — the
// only thing standing between a spoofed <form> POST and an analytics row.

describe("segment.isSegmentTiming", () => {
  it.each(["week", "month", "later", "unsure"] as const)(
    "returns true for the catalogue value %s",
    (value) => {
      expect(isSegmentTiming(value)).toBe(true);
    },
  );

  it("returns false for an unknown value", () => {
    expect(isSegmentTiming("tomorrow")).toBe(false);
  });

  it("returns false for the empty string", () => {
    expect(isSegmentTiming("")).toBe(false);
  });
});

describe("segment.isSegmentConfidence", () => {
  it.each(["confident", "not_yet"] as const)(
    "returns true for the catalogue value %s",
    (value) => {
      expect(isSegmentConfidence(value)).toBe(true);
    },
  );

  it("returns false for an unknown value", () => {
    expect(isSegmentConfidence("maybe")).toBe(false);
  });

  it("returns false for the empty string", () => {
    expect(isSegmentConfidence("")).toBe(false);
  });
});
