# Task: wave15-02-constants-modes

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T09:28Z
**Last compute:** ClPcs-Mac-mini

## Goal
Add the four Wave-15 modes + preset constants to `lib/constants.ts` (spec §A). PASS = ALL true:

1. `TEST_MODES` contains the four new literals `"QUICK"`, `"MARATHON"`, `"SIGN_TRAINER"`,
   `"DIAGNOSTIC"` (canonical names per MASTER-PLAN C2 — no aliases), appended after the existing
   seven; `STARTABLE_MODES = TEST_MODES` stays literally true (grep the line).
2. `MODE_LABEL` gains exactly: QUICK → «Швидка сесія», MARATHON → «Марафон», SIGN_TRAINER → «Знаки»,
   DIAGNOSTIC → «Стартова перевірка».
3. Exported preset constants with these exact values (spec §A + mode-contract table):
   `QUICK_COUNT = 10`, `QUICK_NEW_BUDGET = 4`, `QUICK_SOFT_TIME_SEC = 300`, `MARATHON_PAGE = 20`,
   `SIGN_TRAINER_COUNT = 20`, `SIGN_TRAINER_NEW_BUDGET = 8`, `DIAGNOSTIC_COUNT = 15`.
4. `ANALYTICS_EVENTS` includes `"diagnostic_completed"` (recordEvent rejects unknown names — the
   event itself is recorded later, wave15-14).
5. `npx tsc --noEmit` exits 0 — every `Record<TestMode, …>` / exhaustive-switch site from the
   wave15-01 Risks list is satisfied (adding entries for the new modes is in-scope for THIS task,
   but entries only — no logic).
6. `npm test` exits 0.
7. Scope: `git diff --name-only` (unstaged+staged) touches only `lib/constants.ts` plus files whose
   ONLY change is an added Record/label entry for the new modes. No branches, no UI, no selection code.

## Constraints / decisions
- Transitional state is EXPECTED and accepted: the four modes become schema-startable
  (startTestSchema derives from STARTABLE_MODES) while the server still routes them through the
  generic selectQuestions path until wave15-07. No UI entry points exist yet, so no user reaches
  them. Do NOT add cards or server branches here.
- `QUICK_SOFT_TIME_SEC` is a SOFT textual hint threshold (wave15-12), never a countdown (spec Non-goal).
- SIGN_TRAINER_NEW_BUDGET = 8 comes from the mode-contract table (newBudget 8) even though spec §A's
  constant list omits it — "presets in constants, not buried in code".

## Next
- [x] Edit lib/constants.ts (modes, labels, presets, analytics name), then chase tsc exhaustiveness
      fallout with label/Record entries only.
- Goal fully met. No follow-up increment for this task; downstream is wave15-03+.

## Artifacts
- lib/constants.ts

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T09:28Z ClPcs-Mac-mini: Appended QUICK/MARATHON/SIGN_TRAINER/DIAGNOSTIC to TEST_MODES
  (STARTABLE_MODES = TEST_MODES line untouched); added the four MODE_LABEL entries; added preset
  constants (QUICK_COUNT/QUICK_NEW_BUDGET/QUICK_SOFT_TIME_SEC/MARATHON_PAGE/SIGN_TRAINER_COUNT/
  SIGN_TRAINER_NEW_BUDGET/DIAGNOSTIC_COUNT) and ANALYTICS_EVENTS "diagnostic_completed".
  Exhaustiveness fallout: NONE — `MODE_LABEL` is the ONLY `Record<TestMode,…>` full-record site in
  lib/app/components (grep-confirmed); no exhaustive `assertNever`/`never` switch on mode exists, so
  tsc stayed green with label entries alone. `npx tsc --noEmit` exit 0; `npm test` 554 passed;
  `git diff --name-only` = lib/constants.ts only. Status → done.

## Verify
**Last verify:** PASS (2026-07-03T06:28:39Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T06:29:31Z)
