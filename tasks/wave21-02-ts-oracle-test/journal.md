# Task: wave21-02-ts-oracle-test

**Status:** done
**Driver:** auto
**Updated:** 2026-07-14
**Last compute:** ClPcs-Mac-mini

ORACLE-AUTHORING (2nd task) — transcribe the frozen literals from
`tasks/wave21-01-python-oracle/PREVERIFY-OUTPUT.txt` into a NEW TS oracle test
`lib/study-plan.oracle.test.ts`. The suite is SUSPENDED here (`describe.skip` + dynamic import of the
new `reviewLoad` field) because `computeStudyPlan` does not yet accept `reviewLoad` — task
wave21-03 implements the model and task wave21-04 un-skips this suite. This task authors the golden
values ONLY; task 03 may NOT edit these values (anti self-grading).

## Goal
PASS = ALL true:

1. `lib/study-plan.oracle.test.ts` exists and encodes the frozen values as LITERALS transcribed from
   `tasks/wave21-01-python-oracle/PREVERIFY-OUTPUT.txt` (NOT computed from the TS impl).
2. The suite's impl-dependent cases live under `describe.skip(...)`, and call `computeStudyPlan`
   through a dynamic `await import("@/lib/study-plan")` guarded by a `// @ts-expect-error` on the
   line above the `reviewLoad`-bearing input (the field does not exist on `StudyPlanInput` yet).
   These frozen cases assert the (a) census dailyQuota/feasible: `nodate`→{quota 15, feasible true,
   daysLeft null}, `pace`→{12,true}, `priori`→{40,false}, `maint`→{8,true}, `explode`→{45,true},
   `today_ok`→{10,true}, `today_over`→{30,false}, `today_clamp`→{40,false}, `fresh`→{10,true},
   `maint0`→{0,true}; the (b) clamp (`priori.dailyQuota`≤40, `explode.dailyQuota`===45); the (c)
   monotone displayed sequence `[40,40,22,12,7,3]`.
3. At least ONE NON-skipped, impl-INDEPENDENT self-consistency test keeps the file listed by
   `npx vitest list`: assert the FROZEN literal vectors themselves are internally consistent (the
   monotone displayed sequence is non-increasing; `explode` literal `45 > MAX_DAILY_QUOTA 40`;
   `fresh` new-quota literal `10` equals the old-formula literal `Math.ceil(100/10) = 10`). This
   grades the frozen numbers, NOT the not-yet-written impl.
4. `npm run -s typecheck` exits 0 (the `@ts-expect-error` directives make the skipped block compile
   against the CURRENT `StudyPlanInput` that lacks `reviewLoad`).
5. `npm test` exits 0 (the non-skipped self-consistency test passes; the impl-dependent block is
   skipped).
6. `npx vitest list` LISTS `study-plan.oracle` (proves collection; the non-skipped test keeps it
   listed even though the impl block is skipped).

## Constraints / decisions
- Golden source = `PREVERIFY-OUTPUT.txt` from wave21-01 ONLY. Do NOT read `lib/study-plan.ts` for
  expected values (it does not yet implement the new model).
- This suite asserts `dailyQuota`/`feasible`/`daysLeft` NUMERICS only; the exact Ukrainian
  copy-token asserts (message class strings) are deferred to task 03's re-frozen
  `study-plan.test.ts`. Do not invent copy strings here.
- Encode `computeStudyPlan` inputs with the new field named EXACTLY `reviewLoad` so task 03's impl
  and task 04's un-skip line up.
- Suspended-suite hygiene (CLAUDE.md wave19b): keep the `describe.skip` token literal so the task-04
  un-skip gate can grep it; do not write `describe.skip` in prose/comments. To hold the file green
  before the impl field exists, pull the module via dynamic `await import("@/lib/study-plan")` inside
  the skipped block, with a `// @ts-expect-error` on the line above the `reviewLoad` field.

## Acceptance
| Goal criterion | Where confirmed |
|---|---|
| 1–2 frozen census under describe.skip | `lib/study-plan.oracle.test.ts` |
| 3 non-skipped self-consistency keeps file listed | `npx vitest list` output contains `study-plan.oracle` |
| 4 typecheck 0 | `npm run -s typecheck` |
| 5 npm test 0 | `npm test` |
| 6 file collected | `npx vitest list` |

## Next
- [x] Read `tasks/wave21-01-python-oracle/PREVERIFY-OUTPUT.txt`; write
      `lib/study-plan.oracle.test.ts` with the frozen census under `describe.skip` (dynamic import +
      `@ts-expect-error` for the `reviewLoad` field) + one non-skipped self-consistency test; run
      typecheck + npm test + vitest list.
- Goal fully met — Status: done. (wave21-03 implements `reviewLoad`; wave21-04 un-skips this suite.)

## Artifacts
- `lib/study-plan.oracle.test.ts` — new frozen oracle. Non-skipped self-consistency block (3 tests)
  keeps the file listed; `describe.skip` census block (a/b/c) dynamic-imports `@/lib/study-plan` with
  `@ts-expect-error` on each `reviewLoad` field. Literals transcribed from wave21-01 PREVERIFY-OUTPUT.txt.

## Log
- 2026-07-14 planner: task scaffolded. Depends on wave21-01 PREVERIFY-OUTPUT.txt.
- 2026-07-14T10:20Z ClPcs-Mac-mini: Authored `lib/study-plan.oracle.test.ts`. Transcribed the (a)
  10-row census, (b) clamp (priori 40, explode 45 MAINT-exempt), and (c) monotone displayed
  `[40,40,22,12,7,3]` frozen literals from PREVERIFY-OUTPUT.txt (examDate = TODAY 2026-07-02 + daysLeft,
  verified via node UTC date math). Census lives under `describe.skip` calling `computeStudyPlan` via
  dynamic `await import("@/lib/study-plan")` with `@ts-expect-error` above each new `reviewLoad` field
  (excess-property error against current `StudyPlanInput`). Three NON-skipped self-consistency tests
  (monotone non-increasing; explode 45 > FROZEN_MAX 40; fresh 10 === Math.ceil(100/10)) grade the frozen
  numbers only. Verified: `npm run -s typecheck` exits 0, `npx vitest list` lists `study-plan.oracle`,
  `npm test` 762 passed / 3 skipped. Status → done.

## Verify
**Last verify:** PASS (2026-07-14T07:20:33Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T07:24:34Z)
