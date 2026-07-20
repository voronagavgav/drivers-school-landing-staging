// ─────────────────────────────────────────────────────────────────────────────
// P1 «До героя» — variant-local copy for the proof strip MERGED into the hero.
//
// Danil's ask: the proof rides INSIDE the hero composition, not a band below it.
// Principle (from the reference recon): one fact at headline weight, checkable
// over boastful. So BANK_B_FMT («1 757») is the ONE primary figure; 986/45 stay
// clearly subordinate as a quiet inline line, alongside the honest official-bank
// register («Офіційний банк питань {YEAR}», agency name avoided). Every figure
// comes VERBATIM from the shared constants — the literal `757` is never retyped.
// ─────────────────────────────────────────────────────────────────────────────

import { BANK_B_FMT, IMG_FMT, SECTIONS, YEAR } from "../copy";

export const P1_PROOF = {
  // The ONE dominant numeral (BANK_B_FMT) + its unit — carried out of the .tsx as
  // data so the component never retypes the literal.
  bank: BANK_B_FMT,
  bankUnit: "офіційних питань категорії B",

  // Subordinate figures, folded into one quiet line — NOT co-equal stat tiles.
  detail: `${IMG_FMT} з ілюстрацією · ${SECTIONS} розділів`,

  // Quiet official-bank register (agency name avoided).
  claim: `Офіційний банк питань ${YEAR}`,
} as const;
