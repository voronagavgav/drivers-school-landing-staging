# Task: wave9-03-content-flags-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec §B — PURE content-quality flags. Add `lib/content-flags.ts` + `lib/content-flags.test.ts`.
Depends on task 02 (consumes the `QuestionStat` shape from `lib/content-stats.ts`). PASS = ALL true:

1. `lib/content-flags.ts` exists and exports `flagQuestion(stat, { minSample })` returning an ARRAY of
   flag objects. Each flag object carries (a) its kind, (b) a short Ukrainian human label (Cyrillic), and
   (c) evidence counts for the admin row.
2. The module defines exactly these three flag kinds (string literals present in the source):
   `WRONG_KEY_SUSPECTED`, `LOW_DISCRIMINATION`, `INSUFFICIENT_DATA`.
3. PURITY: `lib/content-flags.ts` contains NONE of these tokens anywhere (incl. comments):
   `server-only`, `@/lib/db`, `@prisma/client`, `lib/generated`, `Math.random`, `Date.now`, `new Date`.
4. BEHAVIOUR (provable via the unit test + a tsx smoke):
   - a stat where an `isCorrect:false` option has MORE picks than the `isCorrect:true` option, with
     `timesAnswered >= minSample` → flags INCLUDE `WRONG_KEY_SUSPECTED`;
   - a near-random stat (`accuracy ≈ 1/optionCount`) with `timesAnswered >= minSample` → flags INCLUDE
     `LOW_DISCRIMINATION`;
   - a thin stat (`timesAnswered < minSample`) → flags are EXACTLY `[INSUFFICIENT_DATA]` (none of the
     others; never flag on thin data);
   - a healthy stat (correct option dominates, accuracy high, `timesAnswered >= minSample`) → flags is
     an EMPTY array.
5. `lib/content-flags.test.ts` exists, is INCLUDED in the unit suite (`npx vitest list` shows it), and
   asserts all four cases in item 4.
6. `npm run typecheck` exits 0; `npm test` exits 0 with ZERO failures.

## Constraints / decisions
- **Evaluate: yes** — `WRONG_KEY_SUSPECTED` is the high-value "likely wrong answer key" signal; a false
  negative hides a real content error and a false positive misleads an editor, so an independent judge
  re-confirms the four boolean cases hold for real.
- PURE module — no DB, no React. Operates on the `QuestionStat` produced by `summarizeQuestion` (task 02);
  `optionCount` for the random band is derived from the stat's options (task 04 supplies the FULL option
  set incl. never-picked options so the band and the WRONG_KEY comparison are accurate).
- `INSUFFICIENT_DATA` is emitted INSTEAD of the other flags (short-circuit on thin data) — never combine.
- The exact `LOW_DISCRIMINATION` band half-width is the implementer's choice (e.g. ±0.08 around
  `1/optionCount`) but must be deterministic; the test's near-random case uses the band centre so any
  reasonable band includes it.
- Ukrainian labels are owned HERE (the UI badge in task 05 just renders `flag.label`).
- Non-Goal: the DB read (task 04), the UI (tasks 05/06), new flag kinds beyond the three above.

## Plan
- [x] Write `lib/content-flags.ts`: flag-kind union + labels + `flagQuestion`.
- [x] Write `lib/content-flags.test.ts` for the four cases.
- [x] `npm run typecheck` && `npm test`; confirm inclusion via `npx vitest list`.

## Done
- [x] `flagQuestion(stat, { minSample })` implemented — returns `ContentFlag[]`
      (kind + Ukrainian label + evidence counts); three kinds defined; thin data
      short-circuits to `[INSUFFICIENT_DATA]`.
- [x] Unit test covers all four behaviour cases + label/evidence shape.
- [x] `verify.sh` PASSES end-to-end: smoke OK, typecheck 0, npm test 292/292 green.

## Next
- [ ] (none — Goal met; verify.sh green)

## Artifacts
- `lib/content-flags.ts` — pure flag detector.
- `lib/content-flags.test.ts` — unit tests.
- `tasks/wave9-03-content-flags-pure/verify.sh` — executable gate.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T23:58Z ClPcs-Mac-mini: implemented `lib/content-flags.ts` (pure;
  imports only `type` from `./content-stats`) + `lib/content-flags.test.ts`
  (5 specs, mirrors content-stats.test.ts style). Logic: thin → exactly
  `[INSUFFICIENT_DATA]`; WRONG_KEY_SUSPECTED when top distractor picks >
  summed correct picks; LOW_DISCRIMINATION when `|accuracy − 1/optionCount| ≤
  0.08`. Ran verify.sh → PASS (smoke OK, typecheck 0, 292/292 tests). Status: done.

## Verify
**Last verify:** PASS (2026-06-23T20:59:12Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T21:00:11Z)
