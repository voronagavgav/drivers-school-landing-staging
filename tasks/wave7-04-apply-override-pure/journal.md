# Task: wave7-04-apply-override-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
Spec C (pure part) — a PURE shallow per-field merge helper + unit tests. Pass = ALL true:
1. `lib/content-override.ts` exists and EXPORTS `applyOverride(planEntry, overrideEntry)` where the second arg
   may be `null`/`undefined`, returning the EFFECTIVE content object.
2. Merge semantics are SHALLOW per top-level field: for each of the overridable fields
   `text`, `options`, `answer`, `topic`, `categories`, `explanation`, `imageKey`, a field PRESENT in the
   override REPLACES the plan's field wholesale (no deep-merge of arrays/objects); a field ABSENT from the
   override leaves the plan's value unchanged.
3. `applyOverride(plan, null)` deep-equals `plan` (returns the plan content unchanged).
4. The function is non-mutating: the input `planEntry` and `overrideEntry` objects are NOT modified
   (assert the original `planEntry` is unchanged after the call).
5. PURITY: `lib/content-override.ts` contains NONE of `server-only`, `@/lib/db`, `@prisma/client`,
   `lib/generated`, `Math.random`, `Date.now`, `new Date` (whole-file grep); no I/O, no DB import. (It MAY
   import a TYPE from `lib/content-key.ts` if useful, but no runtime DB dependency.)
6. `lib/content-override.test.ts` asserts: override wins (full field replace); absent override = plan unchanged
   (criterion 3); a PARTIAL override (only `text`, or only `answer`) merges — overridden field changes, the
   others keep the plan value; non-mutation (criterion 4).
7. `npm run typecheck` exits 0; `npm test` exits 0 and `npx vitest list` includes `lib/content-override.test.ts`.

## Constraints / decisions
- PURE module — same forbidden-token rule as task 03; merge is data-in/data-out only. No file reads here: the
  loader (task 06) reads the override JSON off disk and CALLS this helper.
- SHALLOW by design: an override that supplies `options` REPLACES the whole options array (you don't partially
  patch one option) — document this in the header so task 06 writes override files accordingly. `answer` is the
  1-based correct option number that pairs with `options`.
- Treat `null` and `undefined` override args identically (both → plan unchanged). A field whose override value
  is explicitly `null` is a DELIBERATE clear (override wins, value becomes null) — distinguish "key absent"
  (keep plan) from "key present and null" (override to null); document and test this distinction.
- Non-Goal: NO disk I/O, NO loader wiring, NO schema/DB. That is task 06.

## Plan
- [ ] Write `lib/content-override.ts` (`applyOverride` + the overridable-field list + header doc).
- [ ] Write `lib/content-override.test.ts` (wins / absent / partial / non-mutation / explicit-null-clears).
- [ ] `npm run typecheck` + `npm test` (+ `npx vitest list` includes the new test).

## Done
- [x] Write `lib/content-override.ts` (`applyOverride` + `OVERRIDABLE_FIELDS` + header doc).
- [x] Write `lib/content-override.test.ts` (wins / absent / partial / non-mutation / explicit-null-clears, 11 cases).
- [x] `npm run typecheck` (0) + `npm test` (283 pass) + `npx vitest list` includes the new test; full `verify.sh` PASS.

## Next
- [ ] (none — Goal met; verify.sh green. Downstream: task 06 loader reads `.content-import/overrides/<questionKey>.json` and calls `applyOverride`.)

## Artifacts
- `lib/content-override.ts` — pure shallow per-field override merge.
- `lib/content-override.test.ts` — merge-semantics unit tests.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T15:14Z ClPcs-Mac-mini: wrote pure `lib/content-override.ts` — `applyOverride<T>(planEntry, overrideEntry?)` does a shallow, per-field, override-wins merge over `OVERRIDABLE_FIELDS` (`text/options/answer/topic/categories/explanation/imageKey`); presence decided by `Object.prototype.hasOwnProperty` so an explicit `null` value is a deliberate clear while an absent key keeps the plan's value; `null`/`undefined` override returns a fresh shallow copy of the plan (non-mutating). Added `lib/content-override.test.ts` (11 cases: no-override null/undefined, full per-field replace incl. options-wholesale, partial text/answer, explicit-null-clear vs empty-override no-op, non-mutation of both inputs), mirroring `content-key.test.ts` style. typecheck 0; new test 11/11; full `npm test` 24 files/283 pass; `npx vitest list` includes the file; purity grep clean; `tasks/wave7-04-apply-override-pure/verify.sh` → PASS. Status: done.

## Verify
**Last verify:** PASS (2026-06-23T12:14:50Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T12:16:04Z)
