// ─────────────────────────────────────────────────────────────────────────────
// P2 «Показати, не порахувати» — variant-local copy for the evidence-strip band.
//
// The band leads with REAL restyled illustrations from the official bank; the
// figures then land as CAPTIONS pinned to that evidence, never as a floating
// stat-tile row. 986 is anchored to the illustrations, 1 757 + the official-bank
// claim stay as quiet prose. Every figure comes VERBATIM from the shared
// constants — the literal `757` is never retyped here.
//
// Honesty law: the caption frames the shown images as a HANDFUL of real
// illustrations from the official bank — it never claims they are all/typical of
// 986, nor implies full restyle coverage.
// ─────────────────────────────────────────────────────────────────────────────

import { BANK_B_FMT, IMG_FMT, SECTIONS, YEAR } from "../copy";

export const P2_PROOF = {
  // Quiet register chip, «Офіційний банк питань {YEAR}» (agency name avoided).
  chip: `Офіційний банк питань ${YEAR}`,

  // Lead ABOVE the strip: point at the evidence itself, honestly framed as a few
  // real illustrations — not "all", not "typical".
  lead: "Кілька справжніх ілюстрацій із офіційного банку — саме такі питання ти бачитимеш у застосунку.",

  // Caption pinned UNDER the strip: 986 anchored to the illustrations. Framed as
  // "so many questions come with an illustration", NOT "all of these are 986".
  imgCaption: `${IMG_FMT} питань — з ілюстрацією до відповіді, як ці.`,

  // Subordinate prose — bank total + sections, then the honest official-bank
  // claim. NOT a co-equal tile.
  detail: `Загалом ${BANK_B_FMT} офіційних питань категорії B, розкладених по ${SECTIONS} розділах.`,
  claim: "Справжній офіційний банк, а не демо. Звіряйся з офіційним джерелом.",
} as const;

// The 12 real restyled illustrations shown in the strip — every file EXISTS
// under `public/restyled-live/` (verified by the task). A handful of the bank's
// illustrated questions, spread across sections; deliberately NOT presented as
// all/typical of the 986.
export const P2_FIGURES: readonly { src: string; alt: string }[] = [
  { src: "/restyled-live/11_1_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
  { src: "/restyled-live/11_10_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
  { src: "/restyled-live/12_1_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
  { src: "/restyled-live/12_5_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
  { src: "/restyled-live/12_39_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
  { src: "/restyled-live/13_2_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
  { src: "/restyled-live/13_6_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
  { src: "/restyled-live/14_10_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
  { src: "/restyled-live/14_13_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
  { src: "/restyled-live/15_3_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
  { src: "/restyled-live/15_20_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
  { src: "/restyled-live/15_40_0.png", alt: "Ілюстрація до офіційного питання категорії B" },
] as const;
