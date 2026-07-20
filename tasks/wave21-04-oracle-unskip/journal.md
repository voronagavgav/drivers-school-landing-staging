# Task: wave21-04-oracle-unskip

**Status:** done
**Driver:** auto
**Updated:** 2026-07-14
**Last compute:** ClPcs-Mac-mini

Activate the frozen oracle suite `lib/study-plan.oracle.test.ts` against the wave21-03 impl. Remove
the `describe.skip` and the now-stale `@ts-expect-error` directive(s) (the `reviewLoad` field now
exists on `StudyPlanInput`, so `@ts-expect-error` would become an unused directive → TS error). The
frozen golden VALUES authored in wave21-02 are NOT edited (anti self-grading) — only the suspension
mechanism is removed.

## Goal
PASS = ALL true:

1. `lib/study-plan.oracle.test.ts` contains NO `describe.skip(`, `it.skip(`, or `.skip(` form
   (grep `-Eq "describe\.skip|it\.skip|\.skip\("` returns no match); reword any prose mention of the
   suspension mechanism to past tense WITHOUT the literal token.
2. No `@ts-expect-error` remains on the (formerly) `reviewLoad`-guarding line (the field now exists);
   the dynamic-import guard is removed or converted to a direct static import.
3. The frozen golden literals from wave21-02 are UNCHANGED (the census dailyQuota/feasible values and
   the monotone `[40,40,22,12,7,3]` sequence are byte-identical to what wave21-02 froze — diff shows
   only skip/import/directive removals, NOT value edits).
4. `npm run -s typecheck` exits 0 (no unused `@ts-expect-error`).
5. `npm test` exits 0 — the oracle suite now RUNS and every frozen case passes against the real impl.
6. `npx vitest list` lists `study-plan.oracle` and the suite is no longer all-skipped (its cases
   execute in `npm test`).

## Constraints / decisions
- Do NOT change any expected numeric literal — only remove `describe.skip`, the dynamic `await
  import`/`@ts-expect-error` scaffolding, replacing with a normal top-of-file
  `import { computeStudyPlan, MAX_DAILY_QUOTA } from "@/lib/study-plan"`.
- Un-skip gate hygiene (CLAUDE.md wave19b-02): after removing the real `describe.skip`, ensure no
  comment still contains the literal `describe.skip`/`it.skip`/`.skip(` token (reword to "the suite
  was suspended").

## Acceptance
| Goal criterion | Where confirmed |
|---|---|
| 1 no .skip token | `verify.sh` grep |
| 2 no stale @ts-expect-error | `verify.sh` grep + typecheck |
| 3 values unchanged | git diff of `lib/study-plan.oracle.test.ts` (skip/import lines only) |
| 4 typecheck | `npm run -s typecheck` |
| 5 npm test | `npm test` |

## Next
- [x] Remove `describe.skip` + dynamic import from `lib/study-plan.oracle.test.ts`; convert to a
      static import; reword prose to past tense w/o skip token; run typecheck + npm test + vitest list.
- (none — Goal fully met)

## Artifacts
- `lib/study-plan.oracle.test.ts` — census `describe` activated (was `describe.skip`), 3 `await
  import("@/lib/study-plan")` replaced by one top-of-file `import { computeStudyPlan }`, `async` cbs
  → sync, header/section prose reworded to past tense. Frozen literals byte-identical.

## Log
- 2026-07-14 planner: task scaffolded. Depends on wave21-02 (authored suite) + wave21-03 (impl).
- 2026-07-14T10:39Z ClPcs-Mac-mini: un-skipped the frozen census suite. No `@ts-expect-error` was
  present (the file used dynamic import for suspension, not a directive); removed it via static
  import instead. grep clean (no `.skip`/`@ts-expect-error`); git diff touches only skip/import/async/
  prose lines (CENSUS + MONOTONE_DISPLAYED unchanged); `typecheck` exit 0; `npm test` 772 passed
  (72 files); `npx vitest list` shows both describe blocks (self-consistency + reviewLoad census).
  Status→done.

## Verify
**Last verify:** PASS (2026-07-14T07:39:58Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T07:41:36Z)
