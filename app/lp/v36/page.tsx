/* ══════════════════════════════════════════════════════════════════════════
   v36 — the DECIDED landing, hero «Проспект» (Danil's pick, 2026-07-20).

   The page shell (nav · proof · features · benefits · demo · pricing · FAQ ·
   footer), the road-palette identity, the fonts, and the interactive q_11_16
   demo all live in ./_body (V36Body). The hero is a swappable slot; the
   canonical hero is ./_hero-prospekt — the real Kyiv artery at dusk with
   Батьківщина-мати on the horizon, aspect-adaptive (three prebaked crops
   swap by media query so nothing important is cut on any screen).

   The hero-lab experiment routes (h1..h8g) were retired after the pick —
   they live in git history (see docs/NEXT-SESSION.md for the lab record).

   Metadata + fonts + JSON-LD are inherited from ./layout.tsx (this page adds
   no robots override → it stays the canonical, indexable v36).
   ══════════════════════════════════════════════════════════════════════════ */

import { V36Body } from "./_body";
import { HeroProspekt } from "./_hero-prospekt";

export default function V36Page() {
  return <V36Body hero={<HeroProspekt />} navDark />;
}
