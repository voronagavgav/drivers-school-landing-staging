# Task: wave23-05-sim-harness

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** mac-mini

**Artifacts:** `lib/exam-allocator-sim.ts` (PURE cell engine — exports `runCell`, `scorePassProb`,
`makeLcg`, `deriveSeed`, `runGrid`, `formatReport`); `scripts/spikes/exam-allocator-sim.ts`
(thin tsx runner: `console.log(formatReport(runGrid()))`).

IMPLEMENTATION of the honest simulation harness (spec Deliverable 3). Runs BOTH policies (the greedy
allocator vs the current queue baseline) at equal budget through the SHIPPED FSRS pipeline and scores
exam-day pass-prob with the same `releaseDial` call. Depends on: wave23-02 (pipeline contract),
wave23-04 (allocator). NOT in the unit suite.

## The harness (spec §Simulation harness)
Split into a PURE importable cell engine + a thin tsx runner so the wave23-06 unit test can share the
exact same code path:
- `lib/exam-allocator-sim.ts` — PURE cell engine, exports a callable `runCell(params, seed)` (and any
  grid helpers). No stdout, no DB, no `server-only`, no wall clock, no `Math.random` (seeded LCG only).
- `scripts/spikes/exam-allocator-sim.ts` — thin tsx runner: imports `runCell` from
  `@/lib/exam-allocator-sim`, iterates the full profile grid, and PRINTS the per-cell rows + verdict.

Deterministic via a seeded LCG (no `Math.random`, no wall clock; the "today" clock is a simulated
`Date` advanced per day).
- **Profiles**: {weak / median / strong priors} × horizons {14, 30, 60}d × budgets {15, 30}/day; each
  cell run with ≥ 50 seeded replicas (distinct LCG seeds derived deterministically from a base seed).
- **Per day**: for each policy's OWN copy of the student, pick B items (allocator via
  `lib/exam-allocator`; baseline via `selectReviewQueue` semantics per wave23-02 FINDINGS); sample each
  answer `correct ~ Bernoulli(p)`, p = retrievability for a seen item, p = guess floor g for an unseen
  item; update states via the real `deriveGrade`/`gradePosterior` → `schedule` pipeline.
- **At exam date**: score BOTH copies with the SAME `releaseDial(input)` over the 4-strata blueprint;
  record `.final` (pass-prob) per policy.
- **Report to stdout**: per cell, mean pass-prob + a CI (e.g. ±1.96·SE) for BOTH policies, the lift
  (allocator − baseline) in percentage points, and the decision-gate line (mean lift ≥ 2pp on the
  below-threshold population, no profile harmed by > 0.5pp).

## Goal
PASS = ALL true:

1. `lib/exam-allocator-sim.ts` exists and exports a pure `runCell` cell engine;
   `scripts/spikes/exam-allocator-sim.ts` exists, imports `runCell`, and runs to exit 0 under
   `npx tsx` (repo-root cwd), printing per-cell rows and a final decision-gate verdict line.
2. Determinism: two consecutive `npx tsx scripts/spikes/exam-allocator-sim.ts` runs produce
   BYTE-IDENTICAL stdout (verify.sh diffs two captured runs).
3. The harness uses NO `Math.random` and NO wall-clock read (`Date.now`/argless `new Date()`): all
   randomness is the seeded LCG, all clocks are the simulated advancing date (grep scoped to the file,
   excluding any documented `new Date(<explicit-ms>)` construction of the simulated clock).
4. It drives the REAL pipeline: imports `schedule`/`retrievability`/grade from `@/lib/fsrs`,
   `releaseDial` from `@/lib/readiness-release`, the allocator from `@/lib/exam-allocator`, and the
   baseline from `@/lib/test-engine/queue` (`selectReviewQueue`) — NOT re-implementations (grep the
   imports).
5. Both policies are scored with the SAME `releaseDial` call path (one shared scoring helper applied to
   each policy's final states) — verify.sh greps for a single scoring helper used for both.
6. `npm run -s typecheck` exits 0 (the sim is under `**/*.ts` so it must typecheck).

## Constraints / decisions
- DIRECTIONAL-ORACLE / measurement HONESTY (spec ⚠ + wave19b lesson): the sim reports whatever it
  measures. If the allocator loses on the below-threshold population, the harness still prints that
  verdict — NEVER re-fixture / re-seed to a population where it wins. This task builds the instrument;
  wave23-07 runs it and writes the report.
- The sim is NOT added to the unit suite (`npm test`) — it is a tsx spike. The determinism PIN as a
  unit test is a SEPARATE deliverable (wave23-06).
- Baseline fidelity: invoke `selectReviewQueue` with production-equivalent options (`size = B`,
  `newItemShare`/`backfillWithNew` per its production callers) as documented in wave23-02 FINDINGS —
  do not hand-roll a different ranking.
- tsx relative-import trap (CLAUDE.md): use `@/…` alias imports; run from repo root.

## Acceptance
verify.sh: file runs to exit 0; two runs byte-identical; import + single-scoring-helper greps; purity
greps; typecheck green. (The reported lift numbers are the wave23-07 deliverable, not gated here.)

## Next
- [x] Build the LCG + profile grid + per-day loop wiring both policies through the real pipeline;
      print per-cell rows + verdict; confirm two runs are byte-identical.
- Goal fully met — nothing outstanding. Downstream: wave23-06 imports `runCell` to PIN the seed-42
  determinism; wave23-07 runs the runner, captures stdout, writes the report.

## Acceptance
| Goal | Evidence |
|------|----------|
| 1. engine exports `runCell`; runner imports it; runs to exit 0 with per-cell rows + verdict | `lib/exam-allocator-sim.ts:379` `export function runCell`; runner `scripts/spikes/exam-allocator-sim.ts` imports `runGrid`/`formatReport`; ran exit 0 (18 rows + `VERDICT:` line) |
| 2. two runs byte-identical | ran twice (`/tmp/full6.txt` vs `/tmp/full6b.txt`) → `diff` BYTE-IDENTICAL ✓ |
| 3. no `Math.random`, no `Date.now`/argless `new Date()` (LCG + simulated clock only) | purity greps clean after stripping the literal tokens from doc comments; only `new Date(SIM_EPOCH_MS + …)` explicit-ms clock |
| 4. imports the REAL pipeline (not reimplementations) | `@/lib/fsrs`, `@/lib/readiness-release` (`releaseDial`), `@/lib/exam-allocator` (`allocate`), `@/lib/test-engine/queue` (`selectReviewQueue`) — all imported |
| 5. both policies scored via ONE shared helper | `scorePassProb` (`lib/exam-allocator-sim.ts:212`) called for baseline (`:397`) and allocator (`:398`) |
| 6. typecheck 0 | `npm run -s typecheck` exit 0 |

## Log
- 2026-07-14 mac-mini: planned.
- 2026-07-14 ClPcs-Mac-mini: built the pure cell engine `lib/exam-allocator-sim.ts` + thin runner.
  Wiring per wave23-02 FINDINGS: seeded LCG (`makeLcg`/`deriveSeed`), 4-strata pool (quota × POOL_MULT
  from real `CATEGORY_B_BLUEPRINT`), per-day loop mirroring `study.ts`'s exact answer path (wrong+seen ⇒
  `slipAdjustedLapse`, else `schedule`), exam scoring via the shared `scorePassProb` = `releaseDial(...).final`.
  BASELINE arm = `selectReviewQueue` verbatim; ALLOCATOR arm = REAL `allocate` on the SEEN lane + the same
  `round(B×DEFAULT_NEW_ITEM_SHARE)` unseen-coverage lane the queue reserves (isolates the ranking variable;
  a seen-only allocator would be starved of coverage the dial's honesty clamp punishes — a modeling
  artifact, not a real finding). CALIBRATION: POOL_MULT=2 saturated every student to ~100% (no
  below-threshold population to measure) → raised to 6, which yields a real spread (weak h14 ~15%,
  median h14 ~57%, strong h14 ~97%; 4 below-threshold cells). DIRECTIONAL-ORACLE DISCIPLINE: the
  instrument reports NO-GO honestly — below-threshold mean lift = −0.27pp (< +2pp target), worst-cell
  −1.20pp; NOT re-tuned to make the allocator win. typecheck 0; two full runs BYTE-IDENTICAL. Hit the
  documented whole-file purity-grep trap (doc comments naming `Math.random`/`server-only` false-fail the
  greps) → reworded those comments. ~150s/run.

## Verify
**Last verify:** PASS (2026-07-14T14:13:13Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T14:19:33Z)
