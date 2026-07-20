# Task: wave1-sec-03-validation-unit-tests

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add unit tests for the pure validation schemas from task 02 (spec section A: "Pure validation helpers
have unit tests (valid + invalid cases)"). Test code only — do NOT modify `lib/validation.ts` or any
action.

1. A NEW file `lib/validation.test.ts` exists and imports the schemas + `firstIssueMessage` from
   `@/lib/validation`, importing test utilities from `vitest`.
2. For EACH non-admin schema (`registerSchema`, `loginSchema`, `selectCategorySchema`,
   `startTestSchema`, `submitAnswerSchema`, `finishTestSchema`, `toggleSaveSchema`,
   `removeSavedSchema`) there is at least one VALID case asserting `.safeParse(...).success === true`
   and at least one INVALID case asserting `.safeParse(...).success === false`.
3. At least one test asserts `firstIssueMessage(result.error)` returns a NON-EMPTY string for a failed
   parse.
4. At least one test asserts `startTestSchema` REJECTS a `mode` value not in `TEST_MODES` (e.g.
   `"NONSENSE"`) and ACCEPTS a valid mode (e.g. `"EXAM_SIMULATION"`).
5. `npm run typecheck` exits 0. `npm test` exits 0, reports ZERO failures, and the passing-test count
   is STRICTLY GREATER than the pre-task baseline (the new file adds cases). Test-file count increases
   by exactly 1.

## Constraints / decisions
- ONLY add `lib/validation.test.ts`. Do NOT edit `lib/validation.ts` (if a test reveals a schema bug,
  set task 02 back to `active` with a note and stop — do not fix it here).
- Tests must be DB-free (they run under the fast `npm test` config that excludes integration tests).
- Cover boundary cases that matter: name length 1 vs 2, password length 7 vs 8, malformed vs valid
  email, empty vs non-empty ids, negative vs ≥0 `timeSpentSeconds`, `selectedOptionId` null allowed.
- Non-Goal: testing admin schemas (added/tested in task 07) or wiring behaviour.

## Plan
- [ ] Capture the current `npm test` passing count (baseline) before writing.
- [ ] Write `lib/validation.test.ts` with valid+invalid `describe`/`it` blocks per schema.
- [ ] Add the `firstIssueMessage` and `startTestSchema` mode cases.
- [ ] Run `npm run typecheck` && `npm test`; confirm count rose and zero failures.

## Done
- [x] Captured baseline `npm test`: 5 test files / 38 tests passing.
- [x] Wrote `lib/validation.test.ts` with valid+invalid `describe`/`it` blocks for all 8 non-admin schemas.
- [x] Added the `firstIssueMessage` (non-empty string) and `startTestSchema` mode reject/accept cases.
- [x] Ran `npm run typecheck` (exit 0) && `npm test` (6 files / 63 passing, +1 file, count rose, zero failures); verify.sh → PASS.

## Next
- [ ] (none — goal met; verify.sh green at 6 test files / 63 tests)

## Artifacts
- lib/validation.test.ts — unit tests for the pure validation schemas
- tasks/wave1-sec-03-validation-unit-tests/verify.sh — test-present + suite-green gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T11:07Z ClPcs-Mac-mini: baseline npm test = 5 files/38 tests. Created lib/validation.test.ts
  (25 cases over all 8 non-admin schemas + firstIssueMessage + startTestSchema mode reject/accept,
  with name 1-vs-2 / password 7-vs-8 / email / empty-id / negative-time / null-selectedOptionId
  boundaries). Imports via `@/lib/validation` to satisfy verify.sh grep. typecheck exit 0; npm test
  6 files/63 tests passing (+1 file, count rose, zero fail); verify.sh → PASS. Status: done.

## Verify
**Last verify:** PASS (2026-06-17T08:08:29Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:09:36Z)
