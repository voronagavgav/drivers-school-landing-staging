# Task: wave10-07-adaptive-review-mode

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §E — add the `ADAPTIVE_REVIEW` mode constant (no session/UI). PASS = ALL true:

1. `TEST_MODES` (`lib/constants.ts`) includes `"ADAPTIVE_REVIEW"`.
2. `MODE_LABEL["ADAPTIVE_REVIEW"] === "Розумне повторення"` (the `Record<TestMode,string>` gains the member;
   typecheck enforces exhaustiveness).
3. `showsImmediateFeedback("ADAPTIVE_REVIEW") === true` (`lib/server/test-engine.ts`) — it is a practice-style
   mode that reveals correctness immediately.
4. `MIXED_PRACTICE` stays present in `TEST_MODES` and `MODE_LABEL` (working back-compat alias — NOT deleted).
5. Every OTHER exhaustive `switch`/`Record<TestMode,…>` over `TEST_MODES` handles the new member so
   `npm run typecheck` stays 0 (the wave10-01 findings enumerate these consumers — e.g. `z.enum(TEST_MODES)`
   in `lib/validation.ts` picks it up automatically; `MODE_LABEL[...]` UI reads under `app/(app)/**` fall
   back safely).
6. `npm run typecheck` exits 0.
7. `npm test` exits 0 with ZERO failures (no behavioural regression to existing modes).

## Constraints / decisions
- ADDITIVE constant only — do NOT delete or rename `MIXED_PRACTICE` (kept as a back-compat alias per spec).
- `showsImmediateFeedback` today is `mode !== "EXAM_SIMULATION"`, so `ADAPTIVE_REVIEW` is already `true`;
  keep it `true` however the function is expressed (do not special-case it to false).
- Label copy is exactly `Розумне повторення` (Ukrainian; preserve the existing copy conventions).
- Non-Goal: `startAdaptiveReview`, the `/practice` entry, the queue-driven session build (Wave 11). This task
  ONLY registers the mode so downstream waves can reference it; no session may be created in this mode yet.

## Plan
- [x] Add `"ADAPTIVE_REVIEW"` to `TEST_MODES` and `MODE_LABEL` in `lib/constants.ts`.
- [x] Confirm `showsImmediateFeedback("ADAPTIVE_REVIEW")` is `true`.
- [x] Run `npm run typecheck` — fix any newly-exhaustive `switch`/`Record` the compiler flags.
- [x] `npm test`.

## Next
- (none — Goal fully met; verify.sh green)

## Artifacts
- `lib/constants.ts` — `TEST_MODES` gains `"ADAPTIVE_REVIEW"`; `MODE_LABEL["ADAPTIVE_REVIEW"] = "Розумне повторення"`.
- `lib/server/test-engine.ts` — `showsImmediateFeedback("ADAPTIVE_REVIEW")` already returns `true` (`mode !== "EXAM_SIMULATION"`); no change needed.
- `tasks/wave10-07-adaptive-review-mode/verify.sh` — fixed the impossible smoke gate: added `--conditions=react-server` to the `npx tsx` call.

## Log
- 2026-07-01 planner: task authored from specs/wave10-srs-foundation.md §E.
- 2026-07-01T20:20Z ClPcs-Mac-mini: added `"ADAPTIVE_REVIEW"` to `TEST_MODES` + `MODE_LABEL["ADAPTIVE_REVIEW"]="Розумне повторення"` in `lib/constants.ts`; `MIXED_PRACTICE` retained. `showsImmediateFeedback` unchanged (already `true` for the new mode). `npm run typecheck` = 0 (no exhaustiveness breaks — `z.enum(TEST_MODES)` etc. pick it up automatically); `npm test` = 324/324 pass. Fixed verify.sh's smoke gate, which was structurally UNSATISFIABLE: it `npx tsx`-imports `lib/server/test-engine.ts`, whose line 1 `import "server-only"` THROWS under tsx — added `--conditions=react-server` so server-only resolves to its empty `empty.js` stub and the REAL `showsImmediateFeedback` runs (verified: no weakening). Full verify.sh now green (SMOKE OK + typecheck + tests). Status: done.

## Verify
**Last verify:** PASS (2026-07-01T17:21:21Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T17:21:55Z)
