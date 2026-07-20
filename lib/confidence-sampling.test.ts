import { describe, it, expect } from "vitest";
import { fnv1a32, isConfidenceSampled } from "@/lib/confidence-sampling";
import { CONFIDENCE_SAMPLE_RATE } from "@/lib/constants";

// Golden vectors frozen at plan time (reference FNV-1a 32-bit) — do NOT derive
// these from the implementation; they are the oracle.
describe("fnv1a32", () => {
  it("matches the frozen reference vectors", () => {
    expect(fnv1a32("sess-a:q-4")).toBe(2401225625);
    expect(fnv1a32("abc:def")).toBe(3584721650);
    expect(fnv1a32("sess-a:q-1")).toBe(2451558482);
  });

  it("returns an unsigned 32-bit integer", () => {
    for (const s of ["", "a", "sess-a:q-4", "довге українське питання"]) {
      const h = fnv1a32(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("hashes the empty string to the FNV offset basis", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
  });
});

describe("isConfidenceSampled", () => {
  it("samples the frozen true pairs", () => {
    expect(isConfidenceSampled("sess-a", "q-4")).toBe(true);
    expect(isConfidenceSampled("abc", "def")).toBe(true);
  });

  it("does not sample the frozen false pairs", () => {
    expect(isConfidenceSampled("sess-a", "q-1")).toBe(false);
    expect(isConfidenceSampled("sess-a", "q-2")).toBe(false);
    expect(isConfidenceSampled("sess-a", "q-5")).toBe(false);
    expect(isConfidenceSampled("sess-a", "q-10")).toBe(false);
    expect(isConfidenceSampled("clx1", "clq9")).toBe(false);
  });

  it("is deterministic — the same pair always samples the same way", () => {
    const first = isConfidenceSampled("sess-a", "q-4");
    for (let i = 0; i < 5; i++) {
      expect(isConfidenceSampled("sess-a", "q-4")).toBe(first);
    }
  });

  it(`samples roughly 1 in ${CONFIDENCE_SAMPLE_RATE} pairs over 10k ids`, () => {
    let sampled = 0;
    for (let i = 0; i < 10000; i++) {
      if (isConfidenceSampled("s" + i, "q" + i)) sampled++;
    }
    expect(sampled).toBeGreaterThanOrEqual(1700);
    expect(sampled).toBeLessThanOrEqual(2300);
  });
});
