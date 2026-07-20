# Task: wave10-03-fsrs-grade-retrievability

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Spec §B (part 1) — the pure, deterministic FSRS primitives that DON'T need the full state machine:
constants + `retrievability` + `deriveGrade`. All in `lib/fsrs/` (pure, unit-tested). PASS = ALL true:

1. `lib/fsrs/` exports (importable from the package, e.g. via `lib/fsrs/index.ts` or named modules):
   - `FSRS_DEFAULT_WEIGHTS` — a documented numeric constant array of ~19 FSRS parameters (length ≥ 17).
   - `FSRS_TARGET_RETENTION` — a number defaulting to `0.90`.
   - `retrievability(state, now)` — a function `(state: { stability: number; lastReviewedAt: Date | null },
     now: Date) => number`.
   - `deriveGrade(input)` — a function `({ correct: boolean; latencyMs?: number; confidence?: number })
     => 1 | 2 | 3 | 4`.
2. `retrievability` returns a value in `[0,1]`, equals `1` (±1e-9) when `now === lastReviewedAt` (elapsed 0)
   or `lastReviewedAt` is null-with-elapsed-0-equivalent, and STRICTLY decreases as `now` advances for a
   fixed positive `stability` (e.g. R(30d) < R(1d) < R(0)). Never stored — computed on demand.
3. `deriveGrade` maps ALL four cases per spec §2:
   - `{ correct: false }` → `1` (Again), regardless of latency/confidence.
   - `{ correct: true }` with no latency/confidence signal → `3` (Good).
   - `correct` AND fast AND confident → `4` (Easy).
   - `correct` AND (slow OR low-confidence) → `2` (Hard).
   The fast/slow latency boundary and the confident/low-confidence boundary are DOCUMENTED, exported
   threshold constants (e.g. `FSRS_FAST_LATENCY_MS`, and confidence on a 1..4 scale where confident is the
   top and low-confidence the bottom). `deriveGrade` always returns one of `1|2|3|4`.
4. PURITY: every file under `lib/fsrs/` contains NONE of these tokens anywhere (incl. comments):
   `server-only`, `@/lib/db`, `@prisma/client`, `lib/generated`, `Math.random`, `Date.now`, `new Date`.
   (No JSX either.) The clock is the injected `now: Date` argument.
5. Unit test(s) `lib/fsrs/*.test.ts` are INCLUDED in the unit suite (`npx vitest list` shows them) and assert:
   `retrievability` = 1 at elapsed 0 and monotonic-decreasing; and `deriveGrade` mapping for all four cases
   (grades 1, 2, 3, 4).
6. `npm run typecheck` exits 0.
7. `npm test` exits 0 with ZERO failures.

## Constraints / decisions
- PURE + deterministic. Inject the clock as `now: Date`; never read the wall clock. Purity greps match
  comments too — never write the forbidden tokens even in a doc comment (CLAUDE.md).
- ПДР is single-correct MCQ, not free-recall → the grade is INFERRED (two-tap simple), not self-reported.
  The heuristic is `wrong→Again`, `correct→Good`, `correct&fast&confident→Easy`, `correct&(slow|low-conf)→Hard`.
- A shared `lib/fsrs/types.ts` (e.g. a `ReviewMemoryState` interface / `Grade = 1|2|3|4`) is welcome and will
  be reused by task 04's `schedule`; keep it type-only + pure.
- Non-Goal: the `schedule` DSR state machine (task 04), the queue (05), readiness (06), any DB wiring.

## Plan
- [x] Add `lib/fsrs/constants.ts` (`FSRS_DEFAULT_WEIGHTS`, `FSRS_TARGET_RETENTION`, latency/confidence thresholds).
- [x] Add `lib/fsrs/retrievability.ts` (elapsed-days → R decay from stability).
- [x] Add `lib/fsrs/grade.ts` (`deriveGrade`) + `lib/fsrs/types.ts` if useful; re-export from `lib/fsrs/index.ts`.
- [x] Add `lib/fsrs/*.test.ts` covering Goal 2 & 3; confirm inclusion via `npx vitest list`.
- [x] `npm run typecheck` && `npm test`.

## Next
- (none) — Goal fully met; verify PASSES. Downstream: task 04 (`schedule.ts`) consumes
  `FSRS_DEFAULT_WEIGHTS`/`ReviewMemoryState`; task 05 (`queue`) reuses `retrievability`.

## Log
- 2026-07-01T19:47Z ClPcs-Mac-mini: Completed the module (prior tick's verify failed only because
  `lib/fsrs/index.ts` + primitives didn't exist yet). Added `types.ts` (`Grade`, `LearningState`,
  `ReviewMemoryState`), `retrievability.ts` (FSRS-5 curve `R=(1+FACTOR·t/S)^DECAY`, `FSRS_DECAY=-0.5`,
  `FSRS_FACTOR=target^(1/DECAY)-1=19/81`; =1 at elapsed 0 / null lastReviewedAt, strictly decreasing,
  clamped [0,1]; R==target exactly at elapsed==stability), `grade.ts` (`deriveGrade` per spec §2:
  wrong→1, correct→3, fast&confident→4, slow|low-conf→2), and `index.ts` barrel re-export. Two unit
  test files (`retrievability.test.ts`, `grade.test.ts`) mirroring `scoring.test.ts` style. Verify
  GREEN: SMOKE OK, purity clean, typecheck exits 0, 28 files / 304 tests pass. Status→done.
- 2026-07-01 planner: task authored from specs/wave10-srs-foundation.md §B (grade + retrievability + constants).
- 2026-07-01 ClPcs-Mac-mini: Created `lib/fsrs/constants.ts` — `FSRS_DEFAULT_WEIGHTS` (FSRS-5 19-param
  default vector, len 19 ≥17), `FSRS_TARGET_RETENTION=0.9`, plus the inferred-grade thresholds
  (`FSRS_FAST_LATENCY_MS`, `FSRS_CONFIDENT_MIN`/`FSRS_LOW_CONFIDENCE_MAX` on a 1..4 scale) for the
  later `grade.ts`. Verified via context7 that FSRS default request_retention is 0.9 (ts-fsrs now
  ships FSRS-6/21-param defaults; spec wants FSRS-5/19). Purity grep clean; weights len=19;
  `npm run typecheck` exits 0. Added `lib/fsrs/CLAUDE.md` documenting the FSRS-5-vs-6 gotcha for
  sibling tasks 04/05.

## Artifacts
- `lib/fsrs/constants.ts` — FSRS weights, target retention, grade thresholds (pure, no forbidden tokens).
- `lib/fsrs/types.ts` — `Grade`, `LearningState`, `ReviewMemoryState` (type-only, reused by task 04).
- `lib/fsrs/retrievability.ts` — FSRS-5 forgetting curve `retrievability(state, now)` + `FSRS_DECAY`/`FSRS_FACTOR`.
- `lib/fsrs/grade.ts` — `deriveGrade(input)` inferred 1..4 grade (spec §2).
- `lib/fsrs/index.ts` — barrel re-export (`@/lib/fsrs`).
- `lib/fsrs/retrievability.test.ts`, `lib/fsrs/grade.test.ts` — unit tests (in the `npm test` suite).
- `lib/fsrs/CLAUDE.md` — subdir purity rules + FSRS-5/19-param note + curve-formula note.


## Verify
**Last verify:** PASS (2026-07-01T16:48:25Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T16:50:10Z)
