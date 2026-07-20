# Task: wave20-04-lapse-adjust-module

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-14
**Last compute:** laptop

Implement the pure slip-adjusted lapse layer (spec Deliverable 3), the wave's core algorithm. New
module `lib/fsrs/lapse-adjust.ts` exporting `slipAdjustedLapse(prior: ReviewMemoryState, pi: number,
now: Date): ReviewMemoryState`. It composes OUTSIDE the frozen `schedule()`: it calls the REAL
`schedule(prior, 1, now)` (Again) and `schedule(prior, 2, now)` (Hard), then returns the AGAIN result
with ONLY its `stability` replaced by the capped geometric blend and `dueAt` recomputed from the
blended stability via `intervalDays`. State/lapses/difficulty/reps stay the Again path (a wrong IS a
wrong; only the interval crush is the defect). Un-skip the task-02 lapse-adjust oracle block.

## The formula (frozen by task 01's Python oracle)
`S'_again = schedule(prior,1,now).stability`, `S'_hard = schedule(prior,2,now).stability`,
`S' = min(prior.stability, exp(pi·ln(S'_hard) + (1−pi)·ln(S'_again)))`,
`dueAt = dateAt(now, now.getTime() + intervalDays(S', FSRS_TARGET_RETENTION)·MS_PER_DAY)`.
Everything else = the Again result. The `min(prior.stability, …)` cap makes never-grow-on-wrong
structural.

## Goal
PASS = ALL true:

1. `lib/fsrs/lapse-adjust.ts` exists and exports `slipAdjustedLapse(prior, pi, now)` returning a
   `ReviewMemoryState` (imported type — NOT redeclared).
2. It calls the real `schedule` from `./schedule` for BOTH grade 1 and grade 2 (grep: two `schedule(`
   calls) — it does NOT reimplement the FSRS stability formulas.
3. Returned `state`, `lapses`, `difficulty`, `reps`, `lastReviewedAt` equal the `schedule(prior,1,now)`
   (Again) result exactly; only `stability` and `dueAt` differ.
4. `stability` equals `min(prior.stability, exp(pi·ln S'_hard + (1−pi)·ln S'_again))`; `dueAt` equals
   `intervalDays(stability, FSRS_TARGET_RETENTION)` days after `now`.
5. The task-02 lapse-adjust oracle block is un-skipped and passes against the frozen Python literals:
   - s=50/R=0.9728 wrong (pi≈0.843) ⇒ stability in [37,39] (≈38.x, the 6dp literal), NOT ≤3, NOT ≥50;
   - s=100 wrong ⇒ ≈70.x; s=5/R=0.509 wrong (pi≈0.135) ⇒ ≈2.8x and < prior 5 (crush);
   - never-grow: over the grid, `slipAdjustedLapse(...).stability ≤ prior.stability` for all points
     INCLUDING pi>0.926 (cap binding);
   - repeated-wrong: three successive calls at recomputed R give strictly decreasing stability.
   Expected values are the task-01/02 6dp literals — do NOT recompute from the impl.
6. Purity: `grep -nE 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date'`
   over `lib/fsrs/lapse-adjust.ts` finds NOTHING (build the Date via `Reflect.construct(now.constructor,
   [ms]) as Date`, epoch computed from `now.getTime()`; keep "new Date" out of comments).
7. `npm run -s typecheck` exits 0; `npm run -s test` exits 0. After this task the oracle file has NO
   remaining `describe.skip`/`it.skip`/`.skip(` (both impl blocks un-skipped — task 03 did the other).
   `lib/fsrs/reference-vectors.test.ts` (FSRS-6 golden vectors) stays byte-green (schedule untouched).

## Constraints / decisions
- `schedule()` MUST stay byte-untouched — the layer composes outside it so the FSRS-6 reference vectors
  remain byte-identical (spec design point 2). Do NOT edit schedule.ts / retrievability.ts / constants
  weights.
- `pi` is a caller-supplied posterior in [0,1]; this module does NOT compute it (the server derives it
  via `gradePosterior` in task 05). Keep the module free of DB / option-count logic.
- Blend ONLY stability + dueAt; take state/lapses/difficulty from the Again arm (CGS-consistent — keeps
  lapse telemetry honest; higher difficulty dampens future growth, building convergence).
- Injected clock only; no wall-clock read. Reuse `intervalDays` + `FSRS_TARGET_RETENTION` from the
  engine, do not re-derive.

## Next
- [x] Write `lib/fsrs/lapse-adjust.ts`; un-skip the task-02 lapse-adjust oracle block; typecheck + test.
- Goal fully met — verify.sh green. Task 05 (server-wiring) consumes `slipAdjustedLapse` next.

## Artifacts
- `lib/fsrs/lapse-adjust.ts` — pure `slipAdjustedLapse(prior, pi, now)`: composes real `schedule(prior,1)`
  (Again) + `schedule(prior,2)` (Hard), capped geometric blend `min(prior.S, exp(pi·ln S_hard + (1−pi)·ln
  S_again))`, `dueAt` from `intervalDays`. Returns Again arm w/ only stability+dueAt replaced.
- `lib/fsrs/lapse-adjust.oracle.test.ts` — impl-binding block un-suspended (`describe`, no type-error
  directives); doc comments reworded off the `describe.skip` literal to clear the un-skip grep gate.
- `lib/fsrs/index.ts` — re-exports `./lapse-adjust`.

## Log
- 2026-07-14 laptop: planned by the wave20 planner.
- 2026-07-15 ClPcs-Mac-mini: wrote `lib/fsrs/lapse-adjust.ts` (pure, composes schedule twice, capped
  log-blend, Reflect.construct clock); un-suspended the impl-binding block in the oracle test + removed
  the 3 `@ts-expect-error` import directives. Reworded two doc-comment `describe.skip` mentions (L18,
  L297) to past-tense prose so the verify `grep -nE 'describe\.skip|it\.skip|\.skip\('` gate doesn't
  false-trip (wave19b-02 trap). Restructured the cap onto one line (`Math.min(prior.stability, blended)`)
  to satisfy the line-based `Math\.min\([^)]*prior\.stability` gate. typecheck 0, `npm test` 743 passed,
  verify.sh → PASS: wave20-04.

## Verify
**Last verify:** PASS (2026-07-13T22:50:50Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T22:51:58Z)
