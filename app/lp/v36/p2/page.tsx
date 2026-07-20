// P2 «Показати, не порахувати» — the shared V36 shell with the proof band swapped
// for P2's evidence-strip variant: REAL restyled question illustrations from the
// live bank, with the figures pinned as captions rather than floating stat tiles.
// Nav/hero/features/pricing/FAQ all come from V36Body; only the proof slot
// changes. Metadata (noindex) is inherited from ./layout.tsx.
import { V36Body } from "../_body";
import { HeroProspekt } from "../_hero-prospekt";
import { P2Proof } from "./_proof";

export default function V36P2Page() {
  return <V36Body hero={<HeroProspekt />} navDark proofSlot={<P2Proof />} />;
}
