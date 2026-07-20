import { describe, it, expect } from "vitest";
import {
  sectionDisplayOrder,
  sectionDisplayOrders,
  SECTION_DISPLAY_ORDER_OFFSET,
  CATEGORY_B_BLUEPRINT,
  blueprintForCategoryCode,
  claimedSections,
  groupCandidatesByBlock,
} from "./exam-blueprint";
import { DEFAULT_EXAM_QUESTION_COUNT } from "./constants";

// `sectionDisplayOrder` is a PURE +99 arithmetic identity, kept only for topic lookups/seeding that
// key on Topic.displayOrder — it is NOT the section source for blueprint bucketing (that comes from
// the stable questionKey via `groupCandidatesByBlock`). CRITICAL: on the LIVE seed the +99 assumption
// is WRONG — §8 & §16 were each imported as two Topics, so displayOrder drifts: §31 sits at 132 (not
// 130) and §33 ДОРОЖНІ ЗНАКИ at 134 (not 132). Do NOT resurrect `displayOrder − 99` bucketing.
describe("sectionDisplayOrder (pure +99 arithmetic, NOT the live displayOrder)", () => {
  it("is exactly section + 99 — a helper for displayOrder-keyed lookups, not a live-DB claim", () => {
    expect(SECTION_DISPLAY_ORDER_OFFSET).toBe(99);
    expect(sectionDisplayOrder(1)).toBe(100);
    expect(sectionDisplayOrder(31)).toBe(130); // arithmetic only — the LIVE §31 topic is at 132
    expect(sectionDisplayOrders([31, 45])).toEqual([130, 144]);
  });
});

// Synthetic bucketing oracle: candidates carry an EXPLICIT section (as if derived from questionKey).
// A candidate matches a non-remainder block when its section ∈ that block's `sections`; unclaimed
// sections and `null` fall to the `pdr` remainder. Per the official 4-strata mapping (FINDINGS 01):
// structure {31,45} · safety {35,47} · medical {37} · pdr = REMAINDER (incl. §33 signs, §34 markings).
describe("groupCandidatesByBlock (bucket by explicit section, official 4 strata)", () => {
  it("buckets each candidate by its section, remainder-catching the rest", () => {
    const grouped = groupCandidatesByBlock(CATEGORY_B_BLUEPRINT, [
      { id: "s31", section: 31 }, // structure block (sections [31,45])
      { id: "s45", section: 45 }, // structure block
      { id: "sf35", section: 35 }, // safety block (sections [35,47])
      { id: "sf47", section: 47 }, // safety block
      { id: "m37", section: 37 }, // medical block (sections [37])
      { id: "sign33", section: 33 }, // signs — UNCLAIMED → pdr remainder
      { id: "mark34", section: 34 }, // markings — UNCLAIMED → pdr remainder
      { id: "core1", section: 1 }, // ПДР core — UNCLAIMED → pdr remainder
      { id: "unknown", section: null }, // no section → pdr remainder
    ]);
    expect(grouped.structure.sort()).toEqual(["s31", "s45"]);
    expect(grouped.safety.sort()).toEqual(["sf35", "sf47"]);
    expect(grouped.medical).toEqual(["m37"]);
    expect(grouped.pdr.sort()).toEqual(["core1", "mark34", "sign33", "unknown"]);
    // The old 6-block keys are gone — no candidate lands in a medicine/law/general bucket.
    expect(grouped.medicine).toBeUndefined();
    expect(grouped.law).toBeUndefined();
    expect(grouped.general).toBeUndefined();
    // §33 signs / §34 markings fold into the ПДР-10 remainder, NOT a named stratum.
    expect(grouped.pdr).toContain("sign33");
    expect(grouped.pdr).toContain("mark34");
  });
});

describe("CATEGORY_B_BLUEPRINT (official 4 strata)", () => {
  it("totals DEFAULT_EXAM_QUESTION_COUNT and resolves via category code", () => {
    expect(CATEGORY_B_BLUEPRINT.total).toBe(DEFAULT_EXAM_QUESTION_COUNT);
    expect(CATEGORY_B_BLUEPRINT.total).toBe(20);
    expect(blueprintForCategoryCode("B")).toBe(CATEGORY_B_BLUEPRINT);
    expect(blueprintForCategoryCode("A")).toBeNull();
    expect(blueprintForCategoryCode(null)).toBeNull();
  });

  it("has exactly the four official strata (structure/safety/medical/pdr) with fixed counts", () => {
    const keys = CATEGORY_B_BLUEPRINT.blocks.map((b) => b.key).sort();
    expect(keys).toEqual(["medical", "pdr", "safety", "structure"]);
    // The old 6-block keys are gone.
    expect(keys).not.toContain("medicine");
    expect(keys).not.toContain("law");
    expect(keys).not.toContain("general");

    const byKey = Object.fromEntries(CATEGORY_B_BLUEPRINT.blocks.map((b) => [b.key, b]));
    expect(byKey.structure.sections).toEqual([31, 45]);
    expect(byKey.structure.count).toBe(4);
    expect(byKey.structure.range).toBeUndefined();
    expect(byKey.safety.sections).toEqual([35, 47]);
    expect(byKey.safety.count).toBe(4);
    expect(byKey.safety.range).toBeUndefined();
    expect(byKey.medical.sections).toEqual([37]);
    expect(byKey.medical.count).toBe(2);
    expect(byKey.medical.range).toBeUndefined();
    expect(byKey.pdr.sections).toEqual([]);
    expect(CATEGORY_B_BLUEPRINT.remainderKey).toBe("pdr");
  });

  it("resolves the quota the server uses: fixed counts + remainder = {structure:4, safety:4, medical:2, pdr:10}", () => {
    const quota: Record<string, number> = {};
    let others = 0;
    for (const b of CATEGORY_B_BLUEPRINT.blocks) {
      if (b.key === CATEGORY_B_BLUEPRINT.remainderKey) continue;
      quota[b.key] = b.count ?? 0;
      others += b.count ?? 0;
    }
    quota[CATEGORY_B_BLUEPRINT.remainderKey] = CATEGORY_B_BLUEPRINT.total - others;
    expect(quota).toEqual({ structure: 4, safety: 4, medical: 2, pdr: 10 });
    expect(Object.values(quota).reduce((s, n) => s + n, 0)).toBe(20);
  });

  it("claimedSections is exactly the three non-remainder strata; no ПДР-core section claimed", () => {
    const claimed = claimedSections(CATEGORY_B_BLUEPRINT);
    expect([...claimed].sort((a, b) => a - b)).toEqual([31, 35, 37, 45, 47]);
    // pdr sections (e.g. §1 core, §33 signs, §34 markings) are NOT claimed → they fall to remainder.
    expect(claimed.has(1)).toBe(false);
    expect(claimed.has(33)).toBe(false);
    expect(claimed.has(34)).toBe(false);
  });
});
