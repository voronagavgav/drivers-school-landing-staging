// ---------------------------------------------------------------------------
// Emits the frozen FSRS-6 retrievability cross-check grid via the TRUSTED TS
// engine (`@/lib/fsrs` `retrievability`, oracle-verified vs py-fsrs 6.3.1 in
// wave19a). Its 6dp output is the source of truth for
// `fixtures/retrievability-grid.json`; the Python `predict.py` re-derivation is
// cross-checked against it, never the reverse (gen-19a discipline).
//
// Deterministic: no clock, no RNG — two runs are byte-identical, so
//   npx tsx --conditions=react-server scripts/fsrs-fit/emit-ts-retrievability.ts
// regenerates the fixture byte-stably.
//
// Grid: stability ∈ {1,10,50,100,365} × elapsedDays ∈ {0,1,10,S,2·S} = 25 rows.
// ---------------------------------------------------------------------------

import { retrievability } from "@/lib/fsrs";

const MS_PER_DAY = 86_400_000;
const STABILITIES = [1, 10, 50, 100, 365];

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

type Row = { stability: number; elapsedDays: number; r: number };

const rows: Row[] = [];
for (const stability of STABILITIES) {
  const elapsedList = [0, 1, 10, stability, 2 * stability];
  for (const elapsedDays of elapsedList) {
    const lastReviewedAt = new Date(0);
    const now = new Date(elapsedDays * MS_PER_DAY);
    const r = retrievability({ stability, lastReviewedAt }, now);
    rows.push({ stability, elapsedDays, r: round6(r) });
  }
}

console.log(JSON.stringify(rows, null, 2));
