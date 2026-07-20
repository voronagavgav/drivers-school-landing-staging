// Official-subject EXAM blueprint (CONFIGURABLE — legal/exam structure lives here, not in code).
//
// An EXAM_SIMULATION for a category with a blueprint composes its questions by the OFFICIAL
// SUBJECT BLUEPRINT (per-block section sets + fixed/ranged counts) instead of uniform-random over
// the whole category. Categories WITHOUT a blueprint keep the legacy uniform-random behaviour.
//
// ── Data mapping (verified, centralised here on purpose) ────────────────────────────────────────
// BUCKETING derives a candidate's official наказ section from its STABLE `questionKey`
// (`sectionFromQuestionKey`, lib/content-key.ts) — see `groupCandidatesByBlock`. Topic.displayOrder
// is NOT the section source: §8 & §16 were each imported as TWO Topics, so displayOrder drifts
// (§31 → 132, §33 "ДОРОЖНІ ЗНАКИ" → 134 on the live seed, NOT section+99).
// `sectionDisplayOrder` (below, = section + 99) is kept ONLY for topic lookups/seeding that key on
// displayOrder; it must NOT be used for section-based bucketing.
//
// ── How to add another category ─────────────────────────────────────────────────────────────────
// Add an entry to EXAM_BLUEPRINTS keyed by the Category.code (e.g. "A", "C"). Each blueprint lists
// its blocks (a stable `key`, the official `sections` it draws from, and either a fixed `count` or a
// `[min, max]` range), the `total`, and the `remainderKey` (the block that fills total - Σothers).
// Keep the fixed counts + each ranged block's MIN summing to ≤ total, and the fixed counts + each
// ranged block's MAX leaving ≥ 0 for the remainder, so the remainder block is always 0..total.

import { DEFAULT_EXAM_QUESTION_COUNT } from "./constants";

/** The +99 offset between an official наказ section number and its imported Topic.displayOrder. */
export const SECTION_DISPLAY_ORDER_OFFSET = 99;

/** Official section number → imported Topic.displayOrder. THE single mapping (see file header). */
export function sectionDisplayOrder(section: number): number {
  return section + SECTION_DISPLAY_ORDER_OFFSET;
}

/** Map a set of official section numbers to their Topic.displayOrder values. */
export function sectionDisplayOrders(sections: readonly number[]): number[] {
  return sections.map(sectionDisplayOrder);
}

/** A blueprint block: a named pool drawn from a set of official sections, sized fixed or ranged. */
export interface BlueprintBlock {
  /** stable identifier used to group candidates and to name the remainder block */
  key: string;
  /** official section numbers (наказ) whose questions feed this block */
  sections: readonly number[];
  /** exact number of questions to take from this block (mutually exclusive with `range`) */
  count?: number;
  /** inclusive [min, max] — a count is picked uniformly per exam via the injectable rng */
  range?: readonly [number, number];
}

export interface ExamBlueprint {
  /** total questions in the exam (kept consistent with DEFAULT_EXAM_QUESTION_COUNT) */
  total: number;
  /** subject blocks; one of them is the remainder (see remainderKey) */
  blocks: readonly BlueprintBlock[];
  /** key of the block that absorbs the remainder = total - Σ(other blocks' chosen counts) */
  remainderKey: string;
}

// ── Category B blueprint (total 20) — OFFICIAL 4 strata (ГСЦ МВС 12.09.2025) ─────────────────────
// The official state exam distributes 20 cat-B questions across exactly FOUR strata with FIXED quotas:
//   pdr 10 (правила дорожнього руху) · safety 4 (основи безпеки руху) ·
//   structure 4 (будова та експлуатація ТЗ) · medical 2 (надання домедичної допомоги).
// Section→stratum membership is the settled table in tasks/wave19d-01-topic-stratum-mapping/FINDINGS.md
// (decoded from the stable questionKey section, NOT Topic.displayOrder):
//   structure {31,45} · safety {35,47} · medical {37} · pdr = REMAINDER.
// The three named strata sum to 10, so the `pdr` remainder resolves to 20 − 10 = 10.
// The pdr pool is every published cat-B question NOT claimed above — i.e. the ПДР-core sections
// §1–§30, §32, and the fine ПДР sections §33 (знаки) / §34 (розмітка) / перехрестя, PLUS the ambiguous
// law/ethics/europrotocol/general sections (§36/§38/§39/§44/§46), all folded into ПДР-10 per the
// FINDINGS fallback rule. `pdr.sections` is `[]` — its members are derived by EXCLUSION in bucketing.
export const CATEGORY_B_BLUEPRINT: ExamBlueprint = {
  total: DEFAULT_EXAM_QUESTION_COUNT,
  remainderKey: "pdr",
  blocks: [
    { key: "structure", sections: [31, 45], count: 4 },
    { key: "safety", sections: [35, 47], count: 4 },
    { key: "medical", sections: [37], count: 2 },
    // pdr = remainder; its sections are everything NOT claimed above (see header / wiring layer).
    { key: "pdr", sections: [], count: 0 },
  ],
};

/** Per-category-code blueprints. Only "B" is defined today; see header for how to add more. */
export const EXAM_BLUEPRINTS: Record<string, ExamBlueprint> = {
  B: CATEGORY_B_BLUEPRINT,
};

/** Blueprint for a Category.code, or null when the category has none (→ legacy uniform-random). */
export function blueprintForCategoryCode(code: string | null | undefined): ExamBlueprint | null {
  if (!code) return null;
  return EXAM_BLUEPRINTS[code] ?? null;
}

/** All official sections explicitly claimed by NON-remainder blocks of a blueprint. */
export function claimedSections(blueprint: ExamBlueprint): Set<number> {
  const claimed = new Set<number>();
  for (const block of blueprint.blocks) {
    if (block.key === blueprint.remainderKey) continue;
    for (const s of block.sections) claimed.add(s);
  }
  return claimed;
}

/**
 * Group candidate questions into the blueprint's blocks, keyed by block.key. Each candidate carries
 * an EXPLICIT official наказ `section` (derived from its stable `questionKey` via
 * `sectionFromQuestionKey`, NOT from Topic.displayOrder — see below). A candidate matches a
 * non-remainder block when its `section` is in that block's `sections`; everything NOT claimed by a
 * non-remainder block (incl. candidates with `section === null`) falls to the remainder block.
 * PURE — no DB, no rng.
 *
 * WHY NOT displayOrder: two наказ sections (§8, §16) were each imported as TWO Topics, so
 * Topic.displayOrder drifts +1 after §8 and +2 after §16 — e.g. §31 sits at displayOrder 132 and
 * §33 (ДОРОЖНІ ЗНАКИ) at 134, NOT section+99. The old `displayOrder − 99` bucketing therefore
 * mis-classified nearly every question into the `pdr` remainder. The section now comes from the
 * questionKey (`q_<section>_<qnum>`), which is immune to that drift.
 *
 * Returns a map blockKey -> question ids; every block key in the blueprint is present (possibly []).
 */
export function groupCandidatesByBlock(
  blueprint: ExamBlueprint,
  candidates: readonly { id: string; section: number | null }[],
): Record<string, string[]> {
  // section number -> owning block key (remainder excluded — it's the fallback)
  const sectionToBlock = new Map<number, string>();
  for (const block of blueprint.blocks) {
    if (block.key === blueprint.remainderKey) continue;
    for (const s of block.sections) sectionToBlock.set(s, block.key);
  }

  const out: Record<string, string[]> = {};
  for (const block of blueprint.blocks) out[block.key] = [];

  for (const c of candidates) {
    const key = (c.section != null && sectionToBlock.get(c.section)) || blueprint.remainderKey;
    out[key].push(c.id);
  }
  return out;
}
