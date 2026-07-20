# Task: wave8-03-remove-serving-gate-production

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §A — remove the `SERVE_DEMO_QUESTIONS` / `demoWhere` serving gate from ALL production code, leaving live
pools to serve every published+active question directly. Behaviour UNCHANGED (zero demo rows → the removed
`isDemo:false` filter was already a no-op). PASS = ALL true:
1. `lib/constants.ts` no longer declares `export const SERVE_DEMO_QUESTIONS` (and its preceding
   "Demo question gating" comment block is removed).
2. `lib/server/test-engine.ts` contains NO `SERVE_DEMO_QUESTIONS` and NO `demoWhere`: the import is dropped,
   the `demoWhere` constant + its two spreads (the `startSession` `baseWhere` and the `MISTAKE_PRACTICE`
   `where`) are gone, and the `SAVED_QUESTIONS` filter keeps a question when
   `q.isActive && q.isPublished && q.archivedAt === null` (the `(SERVE_DEMO_QUESTIONS || !q.isDemo)`
   sub-condition is dropped).
3. `lib/server/mastery.ts` contains NO `SERVE_DEMO_QUESTIONS` and NO `demoWhere`: the import is dropped and
   `liveWhere` is `{ isActive:true, isPublished:true, archivedAt:null, ...(categoryId ? … : {}) }` with no
   demo spread.
4. `app/(app)/practice/page.tsx` contains NO `SERVE_DEMO_QUESTIONS` and NO `demoWhere`: the import is dropped
   and the per-topic servable-count `where` is `{ isActive:true, isPublished:true, archivedAt:null,
   categories:{ some:{ id: categoryId } } }` (no demo spread); the servable-topic filtering is otherwise
   unchanged.
5. `grep -rnE "SERVE_DEMO_QUESTIONS|demoWhere"` over exactly those four files returns NOTHING.
6. `npm run typecheck` exits 0.
7. `npm test` exits 0, ZERO failures.
8. PRESERVED (unchanged): `SOURCE_TYPES` in `lib/constants.ts` still contains `"DEMO"`; the
   `lib/validation.ts` `(q.sourceType === "DEMO") === (q.isDemo === true)` refine still exists.

## Constraints / decisions
- DEPENDS ON task 02: `demo-retired.integration.test.ts` (the only other code importer of the constant) must
  already be deleted, else dropping the export fails typecheck on its dangling import. If task 02 is not done,
  mark this BLOCKED on it rather than working around.
- Edit ONLY these four files. The lingering `SERVE_DEMO_QUESTIONS`/`demoWhere` mentions in OTHER integration
  test COMMENTS are out of scope here — task 04 scrubs them (so the FULL `lib/`+`app/` grep is NOT this task's
  gate; only the four-file grep is).
- The returned-shape `isDemo` passthrough in `getSessionState` (`test-engine.ts` ~L294) is harmless data —
  leaving it OR removing it both pass. Prefer leaving it (smaller diff, no behaviour change).
- KEEP the `isDemo`/`sourceType` columns and the validation refine — this wave removes the SERVING gate only,
  never the data fields (spec "Out of scope").
- No behaviour change intended; if `npm test` or any integration assertion changes outcome, STOP — that means
  a non-no-op was introduced.

## Plan
- [x] `lib/constants.ts`: delete the `// ---- Demo question gating …` comment block + the
      `export const SERVE_DEMO_QUESTIONS = false;` line. Leave `SOURCE_TYPES`/`SourceType` intact.
- [x] `lib/server/test-engine.ts`: drop the `SERVE_DEMO_QUESTIONS` import line; delete the `demoWhere` const +
      its comment; remove `...demoWhere` from `baseWhere`; remove `...demoWhere` from the MISTAKE_PRACTICE
      `where`; simplify the SAVED_QUESTIONS `.filter` to drop `(SERVE_DEMO_QUESTIONS || !q.isDemo)`.
- [x] `lib/server/mastery.ts`: drop the import; delete the `demoWhere` const; remove `...demoWhere` from
      `liveWhere`; tidy the now-stale "incl. the SERVE_DEMO_QUESTIONS gate" comment wording.
- [x] `app/(app)/practice/page.tsx`: drop the import; delete the `demoWhere` const; remove `...demoWhere`
      from the count `where`; tidy the now-stale comment.
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] Removed the `SERVE_DEMO_QUESTIONS`/`demoWhere` serving gate from all four production files;
      `SOURCE_TYPES "DEMO"` + the `lib/validation.ts` refine preserved. typecheck 0, 283/283 unit tests pass,
      four-file grep returns nothing.

## Next
- [ ] (none — Goal met; verify.sh re-run by driver)

## Artifacts
- lib/constants.ts (removed gate constant + comment block)
- lib/server/test-engine.ts (dropped import, demoWhere const + 3 uses)
- lib/server/mastery.ts (dropped import, demoWhere const + liveWhere spread)
- app/(app)/practice/page.tsx (dropped import, demoWhere const + count-where spread)

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 ClPcs-Mac-mini: confirmed task 02 done (`demo-retired.integration.test.ts` deleted), so the
  dangling-importer risk is gone. Removed the `SERVE_DEMO_QUESTIONS`/`demoWhere` serving gate from all four
  prod files: deleted the constant + its "Demo question gating" comment block in `lib/constants.ts`; dropped
  the import + `demoWhere` const and its 3 spreads (`baseWhere`, MISTAKE_PRACTICE `where`, SAVED_QUESTIONS
  `.filter`'s `(SERVE_DEMO_QUESTIONS || !q.isDemo)`) in `test-engine.ts`; dropped import + `demoWhere` const +
  `liveWhere` spread in `mastery.ts`; dropped import + `demoWhere` const + count-`where` spread in
  `practice/page.tsx`; tidied stale gate comments in the latter two. Verified: four-file grep empty (exit 1),
  `SOURCE_TYPES "DEMO"` + validation refine intact, `npm run typecheck` 0, `npm test` 283/283 pass, zero
  failures. No behaviour change (zero demo rows → the removed `isDemo:false` filter was already a no-op).
  Status → done.

## Verify
**Last verify:** PASS (2026-06-23T16:35:40Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T16:36:54Z)
