# Task: wave12b-02-recommend-action-pure

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §A: the recommended-action decision matrix as a PURE module, so the dashboard copy can branch on
real state (UX-FINDINGS: post-fail tone bug, brand-new-user-gets-exam bug).

PASS = ALL true:

1. `lib/recommend-action.ts` exists, is PURE (no imports from `@/lib/db`, `@/lib/auth`, `server-only`,
   no `Math.random`/`Date.now`/`new Date` anywhere in the file), and exports:
   - `type RecommendInput = { sufficientData: boolean; lastExamPassed: boolean | null; hasWeakTopics: boolean }`
     (`lastExamPassed: null` = no completed EXAM_SIMULATION yet)
   - `type RecommendKind = "mixed-practice" | "weak-topics" | "keep-pace-exam"`
   - `function recommendAction(input: RecommendInput): { kind: RecommendKind }`
2. The FROZEN decision matrix (planner oracle — verify.sh probes these exact vectors; do NOT edit verify.sh):
   - sufficientData=false → kind "mixed-practice" for EVERY combination of the other fields
     (thin data/brand-new NEVER gets the timed exam — spec §A).
   - sufficientData=true, lastExamPassed=false → "weak-topics" (corrective; regardless of hasWeakTopics).
   - sufficientData=true, lastExamPassed=true → "keep-pace-exam" (regardless of hasWeakTopics).
   - sufficientData=true, lastExamPassed=null, hasWeakTopics=true → "weak-topics".
   - sufficientData=true, lastExamPassed=null, hasWeakTopics=false → "mixed-practice".
3. `lib/recommend-action.test.ts` exists and covers all 9 matrix vectors (the 4 sufficientData=false
   combos may be table-driven); `npm test` exits 0.
4. `npx vitest list` includes `recommend-action.test.ts` (verify.sh captures list output to a var first).
5. `npm run typecheck` exits 0.

## Constraints / decisions
- PURE module: copy strings do NOT live here — the component maps kind → Ukrainian copy (task 06).
  Keeping copy out is what makes the matrix probe-able.
- No mode/CTA-target in the return: which mode/link each kind maps to is the dashboard's concern
  (weak-topics may target the bottleneck topic OR mixed practice depending on available data).
- Do not edit `tasks/wave12b-02-recommend-action-pure/verify.sh` — it is the plan-time oracle.
- Non-Goal: wiring into the dashboard (task 06).

## Plan
- [x] Write lib/recommend-action.ts (types + fn).
- [x] Write lib/recommend-action.test.ts covering the 9 vectors.
- [x] npm test + typecheck + verify.sh.

## Done
- [x] lib/recommend-action.ts written (RecommendInput/RecommendKind types + recommendAction implementing the frozen §A matrix); typecheck green.
- [x] lib/recommend-action.test.ts written (all 10 matrix vectors: 4 sufficientData=false combos table-driven + 6 sufficientData=true cases); npm test 415/415 green, typecheck green, verify.sh prints PASS wave12b-02.

## Next
- [ ] (none — Goal met; task done)

## Artifacts
- lib/recommend-action.ts, lib/recommend-action.test.ts

## Log
- 2026-07-02 laptop: task scaffolded by planner; matrix frozen in verify.sh at plan time.
- 2026-07-02 07:53 UTC ClPcs-Mac-mini: wrote lib/recommend-action.ts — pure module (no server/db imports, no time/random tokens anywhere incl. comments), exports RecommendInput, RecommendKind, recommendAction per the frozen matrix (insufficient→mixed-practice; failed→weak-topics; passed→keep-pace-exam; null exam→weak-topics iff hasWeakTopics else mixed-practice). Styled after lib/glass-tier.ts (doc header + precedence-list comment). `npm run typecheck` exits 0. Test file is the next increment.
- 2026-07-02 10:55 UTC ClPcs-Mac-mini: wrote lib/recommend-action.test.ts mirroring lib/glass-tier.test.ts (table-driven frozen vectors, `@/lib/…` import, do-not-edit-expectations comment) — 4 sufficientData=false combos via a combos table + 6 named sufficientData=true cases (all 10 probe vectors). npm test 39 files/415 tests green; typecheck green; task verify.sh full run prints `PASS wave12b-02` (matrix probe, collection, typecheck, test all green). Status → done.


## Verify
**Last verify:** PASS (2026-07-02T07:56:03Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T07:56:37Z)
