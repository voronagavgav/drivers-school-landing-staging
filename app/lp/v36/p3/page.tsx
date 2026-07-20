// P3 «Одна цифра» — the shared V36 shell with the proof band swapped for P3's
// one-numeral variant. Nav/hero/features/pricing/FAQ all come from V36Body; only
// the proof slot changes. Metadata (noindex) is inherited from ./layout.tsx.
import { V36Body } from "../_body";
import { HeroProspekt } from "../_hero-prospekt";
import { P3Proof } from "./_proof";

export default function V36P3Page() {
  return <V36Body hero={<HeroProspekt />} navDark proofSlot={<P3Proof />} />;
}
