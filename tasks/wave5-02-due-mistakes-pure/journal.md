# Task: wave5-02-due-mistakes-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-22
**Last compute:** cloud-agent

## Goal
Spec A (pure core). Add a PURE, deterministic "due for spaced review" predicate to the test engine plus
its tunable interval ladder, with colocated unit tests in a NEW sibling test file. No DB, no wiring
(task 03 wires it; task 04 surfaces it). No change to other modes.

1. `lib/constants.ts` exports `REVIEW_INTERVALS_HOURS` — a `readonly number[]` (e.g.
   `[0, 24, 72, 168, 336, 720] as const`) documented as the SM-2-lite spacing ladder (index =
   correct-streak; hours to wait before a mistake is due again; streaks beyond the array clamp to the
   last entry). It is a named constant with an explaining comment, not a magic number in code.
2. `lib/test-engine/selection.ts` exports a PURE function
   `dueMistakes(mistakes: EngineMistake[], now: number, intervalsHours?: readonly number[]): EngineMistake[]`
   that returns the subset of `mistakes` whose elapsed time since `lastMistakeAt`
   (`now - lastMistakeAt`, ms) is `>=` the interval selected by its `correctRepeatCount`
   (`intervalsHours[min(correctRepeatCount, len-1)]` converted hours→ms). `intervalsHours` defaults to
   `REVIEW_INTERVALS_HOURS`. It returns a NEW array, does NOT mutate the input, and uses NO
   `Math.random`, `Date.now()`, `new Date(...)`, or any I/O — same args ⇒ same result.
3. Behaviour, provable by tests: (a) a streak-0 mistake with interval `0` is due immediately;
   (b) a just-reviewed mistake (small elapsed, streak ≥ 1) is NOT due; (c) a mistake whose interval has
   elapsed IS due; (d) a higher `correctRepeatCount` requires a LONGER wait before due (same elapsed,
   higher streak ⇒ not due where a lower streak would be); (e) the boundary `elapsed === interval` is
   DUE (inclusive `>=`); (f) `correctRepeatCount` past the ladder length clamps to the last interval.
4. `lib/test-engine/selection.ts` stays PURE: it does NOT contain the tokens `server-only`,
   `@/lib/db`, `@prisma/client`, or `lib/generated`, and `dueMistakes` introduces no clock/global random
   (existing injectable `rng = Math.random` defaults elsewhere in the file are unchanged and out of scope).
5. NEW file `lib/test-engine/due-mistakes.test.ts` imports `dueMistakes` (via the `./selection` or
   `@/lib/test-engine/selection` path) and covers cases 3(a)–3(f) plus a no-mutation assertion.
6. `npm run typecheck` exits 0.
7. `npm test` exits 0 (zero failures) and `npx vitest list` includes `due-mistakes.test.ts`.

## Constraints / decisions
- ADD only — do NOT modify `spacedMistakeOrder`, `selectQuestions`, `orderMistakesByPriority`, or any
  other mode's behaviour. Operate on the existing `EngineMistake` shape (`lib/test-engine/types.ts`).
- `now` is passed IN; the function NEVER reads the clock (tests stay deterministic). Hours→ms uses a
  named local constant (e.g. `MS_PER_HOUR = 3_600_000`), not a bare literal in the expression.
- Tests live in a NEW file `lib/test-engine/due-mistakes.test.ts` (so the gate can assert a distinct
  new A test file) — do NOT fold them into the existing `selection.test.ts`.
- Non-Goal: ordering/ranking of the due set (optional; the predicate is what matters), any DB query,
  dashboard wiring, or touching `lib/server/*`.

## Plan
- [x] Add `REVIEW_INTERVALS_HOURS` (+ comment) to `lib/constants.ts`.
- [x] Add `dueMistakes` to `lib/test-engine/selection.ts` (import the constant).
- [x] Write `lib/test-engine/due-mistakes.test.ts` covering 3(a)–3(f) + no-mutation.
- [x] Run verify.sh.

## Done
- [x] Add `REVIEW_INTERVALS_HOURS = [0, 24, 72, 168, 336, 720] as const` (+ explaining
  comment) to `lib/constants.ts`, under a new "Spaced review of mistakes" section after the
  mistake-resolution rule.
- [x] Add pure `dueMistakes(mistakes, now, intervalsHours = REVIEW_INTERVALS_HOURS)` to
  `lib/test-engine/selection.ts` (imports the constant; named `MS_PER_HOUR = 3_600_000`;
  `filter` returns a new array, no mutation, no clock/random; file stays pure).
- [x] Write `lib/test-engine/due-mistakes.test.ts` covering 3(a)–3(f), a custom-ladder case,
  and a no-mutation assertion.
- [x] Run verify.sh → PASS (typecheck 0, 224 tests pass, new file listed).

## Next
- [ ] Goal fully met (verify PASS). Nothing further for this task; downstream wiring is
  task 03 (`countDueMistakes` server helper) and task 04 (dashboard card).

## Artifacts
- lib/constants.ts — adds `REVIEW_INTERVALS_HOURS`.
- lib/test-engine/selection.ts — adds pure `dueMistakes`.
- lib/test-engine/due-mistakes.test.ts — new unit suite.
- tasks/wave5-02-due-mistakes-pure/verify.sh — purity + export + tests gate.

## Log
- 2026-06-22 cloud-agent: scaffolded by planner.
- 2026-06-22T00:00Z ClPcs-Mac-mini: added `REVIEW_INTERVALS_HOURS = [0,24,72,168,336,720] as const`
  (+ SM-2-lite ladder comment) to `lib/constants.ts`. `as const` yields a readonly tuple,
  assignable to the planned `readonly number[]` param of `dueMistakes`.
- 2026-06-22T22:06Z ClPcs-Mac-mini: added pure `dueMistakes` to `lib/test-engine/selection.ts`
  (imports `REVIEW_INTERVALS_HOURS`, named `MS_PER_HOUR`, inclusive `>=`, clamps streak to last
  ladder index, `filter` → new array no mutation) and the new `due-mistakes.test.ts` suite
  (cases a–f + custom-ladder + no-mutation). verify.sh PASS. Status → done.


## Verify
**Last verify:** PASS (2026-06-22T19:06:32Z)

## Evaluation
**Last evaluation:** PASS (2026-06-22T19:07:15Z)
