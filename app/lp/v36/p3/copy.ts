// ─────────────────────────────────────────────────────────────────────────────
// P3 «Одна цифра» — variant-local copy for the one-numeral proof band.
//
// The band's single dominant element is the BANK_B_FMT numeral («1 757») at
// display scale, framed as the USER'S OWN outcome. 986/45 + the official-bank
// claim stay clearly subordinate as quiet prose. Every figure comes VERBATIM
// from the shared constants — the literal `757` is never retyped here.
// ─────────────────────────────────────────────────────────────────────────────

import { BANK_B_FMT, IMG_FMT, SECTIONS, YEAR } from "../copy";

export const P3_PROOF = {
  // Quiet register chip, «Офіційний банк питань {YEAR}» (agency name avoided).
  chip: `Офіційний банк питань ${YEAR}`,

  // The outcome-framed lead ABOVE the hero numeral: the number is the reader's
  // own exam surface, not a bragging stat.
  lead: "Стільки офіційних питань категорії B може випасти тобі на іспиті.",

  // The one dominant numeral (BANK_B_FMT) + its unit, kept out of the .tsx as
  // data so the component never retypes the literal.
  hero: BANK_B_FMT,
  heroUnit: "питань",

  // The outcome sentence that lands right under the numeral.
  outcome: "Рівно стільки. Усі вони — тут, у тебе в кишені.",

  // Subordinate prose — 986 illustrated + 45 sections, folded into one quiet
  // line, then the honest official-bank claim. NOT co-equal stat tiles.
  detail: `З них ${IMG_FMT} — з ілюстрацією до відповіді, розкладені по ${SECTIONS} розділах.`,
  claim: "Справжній офіційний банк, а не демо. Звіряйся з офіційним джерелом.",
} as const;
