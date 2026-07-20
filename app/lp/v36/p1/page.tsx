// P1 «До героя» — the shared V36 shell with the proof MERGED into the hero.
// Danil's explicit ask: no separate proof band below the hero (`proofSlot={null}`);
// the bank facts ride a compact strip INSIDE the hero composition. Nav/features/
// pricing/FAQ all come from V36Body; the hero is P1's own component. Metadata
// (noindex) is inherited from ./layout.tsx.
import { V36Body } from "../_body";
import { HeroProspektP1 } from "./_hero-prospekt-p1";

export default function V36P1Page() {
  return <V36Body hero={<HeroProspektP1 />} navDark proofSlot={null} />;
}
