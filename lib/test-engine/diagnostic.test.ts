import { describe, it, expect } from "vitest";
import { selectDiagnostic } from "./diagnostic";
import type { DiagnosticCandidate } from "./diagnostic";
import { CATEGORY_B_BLUEPRINT } from "@/lib/exam-blueprint";

// FROZEN oracle for `selectDiagnostic` (spec §B DIAGNOSTIC selection). The golden apportionment
// vectors below are hand-computed from the OFFICIAL 4-strata CATEGORY_B_BLUEPRINT (wave19d-03) and
// written as LITERALS — derived from the NORMATIVE largest-remainder algorithm (diagnostic.ts), never
// by calling the implementation or re-running an apportionment helper (that would be self-grading).
//
// PLAN-TIME HAND COMPUTATION (the frozen truth): official fixed nominals structure 4 · safety 4 ·
// medical 2 · pdr 10 (remainder, total 20). Quotas ×15/20: 3.0 · 3.0 · 1.5 · 7.5 → floors
// 3,3,1,7 (=14); 1 leftover seat by descending fractional remainder: medical (.5) and pdr (.5) tie,
// earlier block in blocks order wins (medical precedes pdr) ⇒ medical gets it ⇒ per-block allocation
// structure 3 · safety 3 · medical 2 · pdr 7 (sum 15).

// deterministic seeded rng (LCG closure) — no Math.random / clock read
const mkRng = (seed = 123456789) => {
  let s = seed >>> 0;
  return () => {
    s = (1103515245 * s + 12345) % 2147483648;
    return s / 2147483648;
  };
};

const KEYS = ["structure", "safety", "medical", "pdr"] as const;

// Block membership via the EXPLICIT official section (from the stable questionKey). One
// representative section per block: structure §31 · safety §35 · medical §37 ·
// pdr (remainder) §8 (any section unclaimed by a non-remainder block).
const BLOCK_SECTION: Record<(typeof KEYS)[number], number> = {
  structure: 31,
  safety: 35,
  medical: 37,
  pdr: 8,
};

// Build an AMPLE pool: `perBlock` candidates per block, every candidate a globally-distinct
// difficulty (so the global ordering is strict and per-block picks are counted by id prefix).
function amplePool(perBlock = 10): DiagnosticCandidate[] {
  const out: DiagnosticCandidate[] = [];
  let d = 1;
  for (const key of KEYS) {
    for (let i = 0; i < perBlock; i++) {
      out.push({ id: `${key}-${i}`, section: BLOCK_SECTION[key], difficulty: d++ });
    }
  }
  return out;
}

// Count picked ids per block via the id prefix (ids are `${blockKey}-${i}`).
function countByBlock(ids: string[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const id of ids) {
    const key = id.split("-")[0];
    c[key] = (c[key] ?? 0) + 1;
  }
  return c;
}

describe("selectDiagnostic — apportionment (CATEGORY_B_BLUEPRINT, count 15)", () => {
  it("V1: ample pool ⇒ EXACT per-block picks 3·3·2·7 (sum 15)", () => {
    const ids = selectDiagnostic(CATEGORY_B_BLUEPRINT, amplePool(), { rng: mkRng() });
    expect(ids).toHaveLength(15);
    const c = countByBlock(ids);
    expect(c.structure).toBe(3);
    expect(c.safety).toBe(3);
    expect(c.medical).toBe(2);
    expect(c.pdr).toBe(7);
  });

  it("V2: medical has only 1 candidate ⇒ deficit seat cycles to structure (4·3·1·7)", () => {
    const pool = amplePool().filter((cand) => !cand.id.startsWith("medical-"));
    pool.push({ id: "medical-0", section: BLOCK_SECTION.medical, difficulty: 999 });
    const ids = selectDiagnostic(CATEGORY_B_BLUEPRINT, pool, { rng: mkRng() });
    expect(ids).toHaveLength(15);
    const c = countByBlock(ids);
    // medical alloc was 2 but only 1 available → takes 1; the freed seat cycles to the first block
    // with spare candidates in blocks order (structure).
    expect(c.structure).toBe(4);
    expect(c.safety).toBe(3);
    expect(c.medical).toBe(1);
    expect(c.pdr).toBe(7);
  });

  it("V3: total pool of 9 (< 15) ⇒ ALL 9 ids, no invention, no duplicates", () => {
    const pool: DiagnosticCandidate[] = [
      { id: "structure-0", section: 31, difficulty: 1 },
      { id: "structure-1", section: 31, difficulty: 2 },
      { id: "safety-0", section: 35, difficulty: 3 },
      { id: "safety-1", section: 35, difficulty: 4 },
      { id: "medical-0", section: 37, difficulty: 5 },
      { id: "pdr-0", section: 8, difficulty: 6 },
      { id: "pdr-1", section: 8, difficulty: 7 },
      { id: "pdr-2", section: 8, difficulty: 8 },
      { id: "pdr-3", section: 8, difficulty: 9 },
    ];
    const ids = selectDiagnostic(CATEGORY_B_BLUEPRINT, pool, { rng: mkRng() });
    expect(ids).toHaveLength(9);
    expect(new Set(ids).size).toBe(9);
    expect([...ids].sort()).toEqual(pool.map((c) => c.id).sort());
  });

  it("V4: determinism — same seeded rng + inputs twice ⇒ identical arrays", () => {
    const pool = amplePool();
    const a = selectDiagnostic(CATEGORY_B_BLUEPRINT, pool, { rng: mkRng(42) });
    const b = selectDiagnostic(CATEGORY_B_BLUEPRINT, pool, { rng: mkRng(42) });
    expect(a).toEqual(b);
  });

  it("V5: ordering — the result mapped to difficulties is globally NON-DECREASING", () => {
    const pool = amplePool();
    const byId = new Map(pool.map((c) => [c.id, c.difficulty]));
    const ids = selectDiagnostic(CATEGORY_B_BLUEPRINT, pool, { rng: mkRng(7) });
    const diffs = ids.map((id) => byId.get(id)!);
    for (let i = 1; i < diffs.length; i++) {
      expect(diffs[i]).toBeGreaterThanOrEqual(diffs[i - 1]);
    }
  });

  it("V6: sanity — no duplicates; every returned id ∈ candidates", () => {
    const pool = amplePool();
    const validIds = new Set(pool.map((c) => c.id));
    const ids = selectDiagnostic(CATEGORY_B_BLUEPRINT, pool, { rng: mkRng(99) });
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(validIds.has(id)).toBe(true);
  });
});
