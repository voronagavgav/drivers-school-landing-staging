# Task: wave4-test-10-mistakes-copy-threshold

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
AUDIT Low (UX/copy): the mistakes page hardcodes "Двічі" in the resolve-instruction copy
(`app/(app)/mistakes/page.tsx:17`) while the real threshold is the constant
`MISTAKE_RESOLVE_THRESHOLD` (=2, `lib/constants.ts:73`) — if the constant changes the copy silently
lies. Interpolate the constant. Depends on task 08 confirming the item is still open. No schema change.

1. `app/(app)/mistakes/page.tsx` imports `MISTAKE_RESOLVE_THRESHOLD` from `@/lib/constants`.
2. The resolve-instruction string (currently "Двічі поспіль відповівши правильно, ви закриєте помилку.")
   is rewritten to INTERPOLATE `${MISTAKE_RESOLVE_THRESHOLD}` for the count instead of the hardcoded
   word, and the literal word "Двічі"/"двічі" no longer appears in the file.
3. The new copy remains valid Ukrainian and conveys "answer correctly N times in a row to close the
   mistake" (N = `MISTAKE_RESOLVE_THRESHOLD`).
4. `npm run typecheck` exits 0 and `npm test` exits 0 (no regression).

## Constraints / decisions
- Copy-only change to `app/(app)/mistakes/page.tsx` — do NOT change `MISTAKE_RESOLVE_THRESHOLD`, the
  resolve logic, or any other file.
- Use the constant already exported from `@/lib/constants` (do not re-declare a literal `2`).
- Non-Goal: changing the threshold value or the mistakes-resolution behavior; other copy on the page.

## Plan
- [x] Import `MISTAKE_RESOLVE_THRESHOLD` and interpolate it into the resolve-instruction string;
  remove the hardcoded "Двічі".
- [x] `npm run typecheck` + `npm test`; run verify.sh.

## Done
- [x] Imported `MISTAKE_RESOLVE_THRESHOLD` from `@/lib/constants` into the mistakes page.
- [x] Rewrote resolve-instruction copy to interpolate `${MISTAKE_RESOLVE_THRESHOLD}`; removed "Двічі".
- [x] typecheck 0, test 0 (122 passed), verify.sh PASS.

## Next
- [ ] (none — Goal met; verify.sh PASSes)

## Artifacts
- app/(app)/mistakes/page.tsx — threshold-interpolated resolve copy.
- tasks/wave4-test-10-mistakes-copy-threshold/verify.sh — copy + typecheck/test gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T19:33Z ClPcs-Mac-mini: imported MISTAKE_RESOLVE_THRESHOLD into
  app/(app)/mistakes/page.tsx and interpolated it into the resolve-instruction copy
  ("Відповівши правильно ${MISTAKE_RESOLVE_THRESHOLD} рази поспіль, ви закриєте помилку."),
  dropping the hardcoded "Двічі". typecheck 0, npm test 122 passed, verify.sh PASS. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T16:34:11Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T16:35:01Z)
