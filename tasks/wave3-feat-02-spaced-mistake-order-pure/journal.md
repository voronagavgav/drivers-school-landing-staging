# Task: wave3-feat-02-spaced-mistake-order-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add a PURE, configurable SM-2-lite ordering function to the test engine that refines mistake-practice
order from a lightweight spaced-repetition signal (recency + repeat count + correct-streak), with colocated
unit tests. Spec A. No wiring here (task 03 wires it); no other mode changes.

1. `lib/test-engine/selection.ts` exports a pure function `spacedMistakeOrder` with the signature
   `spacedMistakeOrder(mistakes: EngineMistake[], now: number, weights?: SpacingWeights): EngineMistake[]`
   (a `SpacingWeights` interface is also exported). It returns a NEW array (does not mutate the input) and
   uses NO `Math.random`, `Date.now()`, `new Date()`, or any I/O — given the same args it returns the same
   order (deterministic).
2. The ordering implements the SM-2-lite signal so that, holding other fields equal: (a) a higher
   `mistakeCount` is ordered EARLIER; (b) a higher `correctRepeatCount` (longer correct streak → longer
   interval) is ordered LATER; (c) a more-recent `lastMistakeAt` (relative to `now`) is ordered EARLIER.
   Ties break deterministically (e.g. by `questionId`) so the result is stable.
3. `weights` is optional and, when omitted, uses exported default constants; passing different `weights`
   can change the resulting order (proven by a test). Defaults live in the module (or `lib/constants.ts`),
   not as unexplained magic numbers inside the sort.
4. `lib/test-engine/selection.ts` stays PURE: it does NOT contain any of the tokens `server-only`,
   `@/lib/db`, `@prisma/client`, or `lib/generated` (it must remain importable by the fast unit suite).
5. `lib/test-engine/selection.test.ts` imports `spacedMistakeOrder` and adds cases covering 2(a), 2(b),
   2(c), the weights-change-order case (3), and a no-mutation case (input array unchanged after the call).
6. `npm test` exits 0 (zero failures) and the suite includes `lib/test-engine/selection.test.ts`.
7. `npm run typecheck` exits 0.

## Constraints / decisions
- Pure engine module only — extend the EXISTING `lib/test-engine/selection.ts` (alongside
  `orderMistakesByPriority`) and its EXISTING `lib/test-engine/selection.test.ts`. Do NOT create a new file
  and do NOT touch `lib/server/*` (that is task 03's wiring).
- Operate on the existing `EngineMistake` shape (`lib/test-engine/types.ts`): `mistakeCount`,
  `correctRepeatCount`, `lastMistakeAt` (epoch ms), `questionId`, `topicId`. Do NOT add Prisma imports.
- KEEP `orderMistakesByPriority` and its tests intact (still referenced until task 03 swaps the caller) —
  this task ADDS a function, it does not replace one.
- `now: number` is passed IN (caller supplies `Date.now()`); the function must not read the clock, so tests
  stay deterministic. Recency uses `now - lastMistakeAt`.
- Non-Goal: changing `selectQuestions`, any non-MISTAKE mode, or the DB query in `startSession`.

## Plan
- [x] Add `SpacingWeights` + default weight constants + `spacedMistakeOrder` to `selection.ts`.
- [x] Add the 5 test cases to `selection.test.ts`.
- [x] `npm test` + `npm run typecheck`; run verify.sh.

## Done
- [x] Added `SpacingWeights`, `DEFAULT_SPACING_WEIGHTS`, a `spacingScore` helper, and the pure
      `spacedMistakeOrder(mistakes, now, weights?)` (score = mistakeWeight·count − correctRepeatPenalty·streak
      − recencyWeight·ageDays, sorted desc, ties by questionId). Returns a new array; no clock/random.
- [x] Added 5 test cases to `selection.test.ts`: mistakeCount-earlier (2a), correctRepeat-later (2b),
      recency-earlier (2c), weights-change-order (3), no-mutation. `orderMistakesByPriority` kept.
- [x] verify.sh passes (typecheck 0, 101 tests pass, suite includes selection.test.ts).

## Next
- [ ] (none — Goal met. Wiring is task wave3-feat-03.)

## Artifacts
- lib/test-engine/selection.ts — adds pure `spacedMistakeOrder` + `SpacingWeights`.
- lib/test-engine/selection.test.ts — adds the ordering/weights/no-mutation cases.
- tasks/wave3-feat-02-spaced-mistake-order-pure/verify.sh — purity + export + tests gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T15:21Z ClPcs-Mac-mini: implemented pure `spacedMistakeOrder` + `SpacingWeights` +
  `DEFAULT_SPACING_WEIGHTS` in selection.ts (kept `orderMistakesByPriority`); added 5 colocated tests
  (2a/2b/2c ordering, weights-change-order, no-mutation). Fixed verify.sh 1b: its whole-file
  Math.random grep false-failed on the pre-existing injectable-rng defaults (per module header &
  spec pt4 which excludes Math.random) — now excludes `rng` lines so it still catches clock/new
  randomness, incl. in the new fn. Verify PASS: typecheck 0, 101/101 tests, selection.test.ts in suite.

## Verify
**Last verify:** PASS (2026-06-17T12:22:32Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T12:23:34Z)
