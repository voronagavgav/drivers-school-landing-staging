# Task: wave22-05-oracle-unskip

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** mac-mini

Un-suspend the frozen Elo oracle: flip `lib/elo.oracle.test.ts` from `describe.skip` to live, convert
the dynamic `await import("./elo")` to a static `import`, remove the now-unused `// @ts-expect-error`
directive, and prove every frozen (a)–(f) vector binds against the real `lib/elo.ts`. This is the
anti-self-grading gate: the impl (task 04) could not edit this file, so a green run here is the
external oracle confirming the impl.

Depends on: wave22-03 (the suspended oracle), wave22-04 (the impl).

## Goal
PASS = ALL true:

1. `lib/elo.oracle.test.ts` no longer contains a runtime `describe.skip(`/`it.skip(`/`.skip(` — grep
   `grep -Eq "describe\.skip|it\.skip|\.skip\(" lib/elo.oracle.test.ts` finds NOTHING (also reword any
   remaining PROSE mention of `.skip` so the grep stays clean).
2. The impl is imported STATICALLY (`import { foldEloStream, eloUpdate ... } from "./elo"`); no
   `// @ts-expect-error` remains on that import (else TS2578 unused-directive fails typecheck).
3. `npx vitest list` includes `elo.oracle` (var-captured, token-retry).
4. `npm run -s typecheck` exits 0.
5. `npm test` exits 0 — including all previously-skipped frozen assertions ((a′) plain/guess contrast,
   (a″) K-schedule, (b) 40-answer fold β/n/θ, (c) order-sensitivity pair, (d) convergence direction,
   (e) guess-adjustment direction, (f) K decay), each matching the python golden to 6dp.
6. No frozen numeric literal in `lib/elo.oracle.test.ts` changed vs task 03's version — `git diff`
   for this task touches only the `.skip`→live flip, the import form, and the `@ts-expect-error`
   removal (no expectation edits). If a literal MUST change, the impl (task 04) is wrong, not the
   oracle — fix the impl instead.

## Constraints / decisions
- The oracle numbers are frozen truth from the python (wave22-01). If an assertion fails, the IMPL is
  wrong — never edit the expectation to match the impl (that is self-grading).
- Removing the unused `@ts-expect-error` is mandatory (TS2578), not oracle tampering.
- Non-goal: no impl changes here beyond what a failing assertion legitimately reveals as an impl bug
  (if so, note it and fix lib/elo.ts, leaving expectations intact).

## Next
- [x] Flip describe.skip→live, static-import ./elo, drop @ts-expect-error, run typecheck + npm test.

## Acceptance
Static evidence for the read-only evaluator (verify.sh re-runs these):
1. `.skip` gone — `grep -Eq "describe\.skip|it\.skip|\.skip\(" lib/elo.oracle.test.ts` finds NOTHING
   (line 102 `describe.skip(`→`describe(`; no prose `.skip` remains; header comment reworded to
   "impl-binding suite is live").
2. Static import — `lib/elo.oracle.test.ts:2` `import { kFor, guessFloor, eloUpdate, foldEloStream } from "./elo";`
   (all 4 exports exist in `lib/elo.ts`); every `it` callback is now sync `() =>`, no `await import`,
   no `@ts-expect-error` anywhere in the file (grep clean → no TS2578).
3. Collected — `npx vitest list | grep elo.oracle` → COLLECTED.
4. `npm run -s typecheck` → exit 0.
5. `npm test` → exit 0 (74 files / 786 tests); the un-skipped 4 impl-binding vectors ((a″) K schedule,
   (a′) g=0.2 update, (b) 40-answer fold β/n + θ/n, (c) reversed-stream order sensitivity) match the
   python golden to 5–6dp against the real `lib/elo.ts`.
6. No frozen literal edited — `git diff` touches only the `.skip`→live flip, the added static import,
   the async→sync `it` signatures, and the header prose reword; the only diffed line carrying a digit
   is the `(a′)` test description string ("g=0.2 … K(0)"), not an expectation.

## Log
- 2026-07-14T14:36Z ClPcs-Mac-mini — Un-suspended the frozen Elo oracle: added static
  `import { kFor, guessFloor, eloUpdate, foldEloStream } from "./elo"`, flipped `describe.skip`→`describe`,
  converted all 4 impl-binding `it`s from `async () => { const {…} = await import("./elo") }` to plain
  sync closures using the static imports, reworded the header comment (dynamic-import/@ts-expect-error →
  "suite is live"). typecheck 0, `npx vitest run lib/elo.oracle.test.ts` 8/8 pass, `npm test` 786/786
  pass, vitest-list collects elo.oracle. No frozen numeric literal touched — the impl (wave22-04) is
  confirmed by the external oracle. Status→done.

## Artifacts
- `lib/elo.oracle.test.ts` — un-skipped, static import (the deliverable).

## Verify
**Last verify:** PASS (2026-07-14T11:36:40Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T11:38:00Z)
