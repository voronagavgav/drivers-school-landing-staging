// ---------------------------------------------------------------------------
// Thin tsx RUNNER for the Wave 23 exam-allocator simulation spike
// (spec `specs/wave23-exam-allocator-spike.md`, Deliverable 3).
//
// All model + wiring lives in the PURE cell engine `@/lib/exam-allocator-sim`
// (so wave23-06's determinism unit test shares the exact same code path). This
// file only iterates the full profile grid and PRINTS the per-cell rows + the
// decision-gate verdict to stdout.
//
// Run from repo root:  npx tsx scripts/spikes/exam-allocator-sim.ts
// Deterministic: no DB, no clock, no RNG global — two runs are byte-identical.
// The reported lift numbers are the wave23-07 deliverable, captured verbatim.
// ---------------------------------------------------------------------------

import { runGrid, formatReport } from "@/lib/exam-allocator-sim";

console.log(formatReport(runGrid()));
