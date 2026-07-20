import { describe, it, expect } from "vitest";
import { selectByBlueprint } from "./blueprint-selection";
import { CATEGORY_B_BLUEPRINT } from "@/lib/exam-blueprint";
import type { ExamBlueprint } from "@/lib/exam-blueprint";

// A tiny seeded LCG so we can sweep many distinct rngs deterministically.
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Build a block -> ids map where every block has plenty of distinct ids. */
function fullPools(perBlock = 50): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const b of CATEGORY_B_BLUEPRINT.blocks) {
    map[b.key] = Array.from({ length: perBlock }, (_, i) => `${b.key}-${i}`);
  }
  return map;
}

const KEYS = ["structure", "safety", "medical", "pdr"] as const;

describe("selectByBlueprint — full pools", () => {
  it("always returns exactly total (20) ids across many seeds, no duplicates", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { ids } = selectByBlueprint(CATEGORY_B_BLUEPRINT, fullPools(), lcg(seed));
      expect(ids).toHaveLength(20);
      expect(new Set(ids).size).toBe(20); // no duplicates
    }
  });

  it("honours the fixed official quotas (4/4/2); pdr fills the remainder to 10", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { perBlock } = selectByBlueprint(CATEGORY_B_BLUEPRINT, fullPools(), lcg(seed));
      // Official 4-strata quotas are all FIXED — no range, so counts are seed-invariant.
      expect(perBlock.structure).toBe(4);
      expect(perBlock.safety).toBe(4);
      expect(perBlock.medical).toBe(2);
      // pdr = 20 - (4 + 4 + 2) = 10.
      expect(perBlock.pdr).toBe(10);
      const sum = KEYS.reduce((s, k) => s + perBlock[k], 0);
      expect(sum).toBe(20);
    }
  });

  it("each chosen id belongs to the block it was counted under", () => {
    const { ids, perBlock } = selectByBlueprint(CATEGORY_B_BLUEPRINT, fullPools(), lcg(7));
    const counts: Record<string, number> = {};
    for (const id of ids) {
      const prefix = id.split("-")[0];
      counts[prefix] = (counts[prefix] ?? 0) + 1;
    }
    for (const k of KEYS) expect(counts[k] ?? 0).toBe(perBlock[k]);
  });

  it("is deterministic for a given rng (same seed ⇒ same ids in same order)", () => {
    const a = selectByBlueprint(CATEGORY_B_BLUEPRINT, fullPools(), lcg(42));
    const b = selectByBlueprint(CATEGORY_B_BLUEPRINT, fullPools(), lcg(42));
    expect(a.ids).toEqual(b.ids);
    expect(a.perBlock).toEqual(b.perBlock);
  });

  it("different seeds generally pick different sets/orders", () => {
    const a = selectByBlueprint(CATEGORY_B_BLUEPRINT, fullPools(), lcg(1));
    const b = selectByBlueprint(CATEGORY_B_BLUEPRINT, fullPools(), lcg(999));
    expect(a.ids).not.toEqual(b.ids);
  });
});

describe("selectByBlueprint — graceful degradation", () => {
  it("a thin fixed block takes all it has; remainder (pdr) tops up to total", () => {
    const pools = fullPools();
    pools.medical = ["medical-only"]; // only 1 available though target is 2
    const { ids, perBlock } = selectByBlueprint(CATEGORY_B_BLUEPRINT, pools, lcg(3));
    expect(perBlock.medical).toBe(1); // took all it had
    expect(ids).toHaveLength(20); // still 20 total
    expect(new Set(ids).size).toBe(20);
    // shortfall absorbed by pdr: pdr = 20 - (structure4 + safety4 + medical1) = 11
    expect(perBlock.pdr).toBe(20 - (4 + 4 + 1));
  });

  it("an empty block contributes nothing and never throws", () => {
    const pools = fullPools();
    pools.safety = [];
    const { ids, perBlock } = selectByBlueprint(CATEGORY_B_BLUEPRINT, pools, lcg(5));
    expect(perBlock.safety).toBe(0);
    expect(ids).toHaveLength(20);
  });

  it("never exceeds total even when pools are enormous", () => {
    const { ids } = selectByBlueprint(CATEGORY_B_BLUEPRINT, fullPools(1000), lcg(11));
    expect(ids).toHaveLength(20);
  });

  it("a globally thin pool returns fewer than total but never duplicates or exceeds it", () => {
    // Total available across all blocks is < 20.
    const pools: Record<string, string[]> = {
      structure: ["s1"],
      safety: ["sf1", "sf2"],
      medical: ["m1"],
      pdr: ["p1", "p2", "p3"],
    };
    const { ids, perBlock } = selectByBlueprint(CATEGORY_B_BLUEPRINT, pools, lcg(8));
    const totalAvail = Object.values(pools).reduce((s, a) => s + a.length, 0);
    expect(ids.length).toBeLessThanOrEqual(20);
    expect(ids.length).toBe(totalAvail); // took everything available
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
    expect(perBlock.structure).toBe(1);
  });
});

describe("selectByBlueprint — within-exam content dedup", () => {
  /** Assign every id a unique content key, then collide two ids ACROSS different blocks. */
  function contentKeysWithCrossBlockDuplicate(
    pools: Record<string, string[]>,
    a: string,
    b: string,
    sharedKey = "DUPLICATE-PROMPT||",
  ): Record<string, string> {
    const map: Record<string, string> = {};
    for (const ids of Object.values(pools)) {
      for (const id of ids) map[id] = `key:${id}`; // unique by default
    }
    map[a] = sharedKey;
    map[b] = sharedKey; // a and b now share a content key
    return map;
  }

  it("never returns two ids with the same content key (cross-block identical pair)", () => {
    // structure-0 and pdr-0 live in DIFFERENT blocks but share a content key — only ONE may appear.
    for (let seed = 1; seed <= 200; seed++) {
      const pools = fullPools();
      const contentKeyById = contentKeysWithCrossBlockDuplicate(pools, "structure-0", "pdr-0");
      const { ids } = selectByBlueprint(CATEGORY_B_BLUEPRINT, pools, {
        rng: lcg(seed),
        contentKeyById,
      });
      // assert: no two chosen ids share a content key, anywhere in the draw
      const keys = ids.map((id) => contentKeyById[id]);
      expect(new Set(keys).size).toBe(keys.length);
      // and specifically the deliberate duplicate pair never both appear
      const both = ids.includes("structure-0") && ids.includes("pdr-0");
      expect(both).toBe(false);
      // still a full exam (the remainder tops up around the skipped duplicate)
      expect(ids).toHaveLength(20);
      expect(new Set(ids).size).toBe(20);
    }
  });

  it("ALLOWS two questions that share a prompt but have DIFFERENT keys (different images)", () => {
    // Same wording, different image → DIFFERENT content keys → both must stay eligible. The
    // structure block (count 4) is given EXACTLY these two ids, so a correct selector takes BOTH
    // (all it has); a (wrong) prompt-only dedup would have skipped one and left the block shorter.
    const pools = fullPools();
    pools.structure = ["structure-0", "structure-1"]; // only these two feed the structure block
    const contentKeyById: Record<string, string> = {};
    for (const ids of Object.values(pools)) for (const id of ids) contentKeyById[id] = `key:${id}`;
    contentKeyById["structure-0"] = "Який знак?||/img/a.png";
    contentKeyById["structure-1"] = "Який знак?||/img/b.png"; // same prompt, other image
    for (let seed = 1; seed <= 200; seed++) {
      const { ids, perBlock } = selectByBlueprint(CATEGORY_B_BLUEPRINT, pools, {
        rng: lcg(seed),
        contentKeyById,
      });
      // both same-prompt/different-image ids co-occur, and the block is full (not short by dedup)
      expect(ids).toContain("structure-0");
      expect(ids).toContain("structure-1");
      expect(perBlock.structure).toBe(2);
    }
  });

  it("with full unique keys, behaves exactly like no content dedup (still 20, distinct keys)", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const pools = fullPools();
      const contentKeyById: Record<string, string> = {};
      for (const ids of Object.values(pools)) for (const id of ids) contentKeyById[id] = `key:${id}`;
      const { ids } = selectByBlueprint(CATEGORY_B_BLUEPRINT, pools, {
        rng: lcg(seed),
        contentKeyById,
      });
      expect(ids).toHaveLength(20);
      expect(new Set(ids.map((id) => contentKeyById[id])).size).toBe(20);
    }
  });

  it("legacy bare-rng arg still works (no content dedup applied)", () => {
    const a = selectByBlueprint(CATEGORY_B_BLUEPRINT, fullPools(), lcg(42));
    const b = selectByBlueprint(CATEGORY_B_BLUEPRINT, fullPools(), { rng: lcg(42) });
    expect(a.ids).toEqual(b.ids); // bare rng === { rng } with no contentKeyById
  });
});

describe("selectByBlueprint — generic blueprint (extensibility)", () => {
  it("respects a custom blueprint's total and remainder", () => {
    const bp: ExamBlueprint = {
      total: 5,
      remainderKey: "rest",
      blocks: [
        { key: "a", sections: [1], count: 1 },
        { key: "b", sections: [2], range: [1, 2] },
        { key: "rest", sections: [], count: 0 },
      ],
    };
    for (let seed = 1; seed <= 50; seed++) {
      const { ids, perBlock } = selectByBlueprint(
        bp,
        { a: ["a1", "a2"], b: ["b1", "b2", "b3"], rest: Array.from({ length: 10 }, (_, i) => `r${i}`) },
        lcg(seed),
      );
      expect(ids).toHaveLength(5);
      expect(perBlock.a).toBe(1);
      expect(perBlock.b).toBeGreaterThanOrEqual(1);
      expect(perBlock.b).toBeLessThanOrEqual(2);
      expect(perBlock.a + perBlock.b + perBlock.rest).toBe(5);
    }
  });
});
