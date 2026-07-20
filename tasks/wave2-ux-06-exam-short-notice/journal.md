# Task: wave2-ux-06-exam-short-notice

**Status:** done
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** ClPcs-Mac-mini

## Goal
When an exam simulation runs with fewer questions than the configured count (small published pool), tell
the user up front on the test screen instead of silently running short. Spec B / AUDIT Med item.

1. The test screen (`app/(app)/test/[id]/page.tsx` and/or `components/test-runner.tsx`) references
   `DEFAULT_EXAM_QUESTION_COUNT` from `@/lib/constants` and renders a notice ONLY when the mode is
   `EXAM_SIMULATION` AND the actual question count is `< DEFAULT_EXAM_QUESTION_COUNT`.
2. The notice is Ukrainian and communicates the shortfall (mentions that there are fewer questions than
   a full simulation — e.g. contains «менше», «неповн…», or «коротш…») and shows the actual count.
3. When the pool is full (count `>= DEFAULT_EXAM_QUESTION_COUNT`) or the mode is not an exam, NO notice
   is rendered (the notice is conditional, not always-on).
4. `npm run typecheck` exits 0.
5. `npm test` exits 0 (zero failures).

## Constraints / decisions
- No engine/scoring change: do NOT alter `selectQuestions`, `evaluateExam`, or `DEFAULT_EXAM_MAX_ERRORS`.
  The exam still runs; this task only ADDS an up-front informational notice. (The errors-allowed value is
  intentionally left as-is per Wave 2 scope; only the count shortfall is surfaced.)
- Use the data already available: the test page has `state.mode` + the question count (`questions.length`
  / `state.totalQuestions`); pass a prop to `TestRunner` or render the notice in the page — either is OK.
- Keep Ukrainian copy + road-sign styling (reuse a `Card`/notice style already in the app).
- Non-Goal: requiring a minimum pool / blocking the exam; schema or scoring changes; the confirm dialog
  (task 04).

## Plan
- [x] Import `DEFAULT_EXAM_QUESTION_COUNT`; compute the shortfall condition for exam mode.
- [x] Render the Ukrainian notice on the test screen when the condition holds.
- [x] `npm run typecheck` + `npm test`.

## Done
- [x] Imported `DEFAULT_EXAM_QUESTION_COUNT` into `app/(app)/test/[id]/page.tsx`; computed
  `isExamShort = state.mode === "EXAM_SIMULATION" && questions.length < DEFAULT_EXAM_QUESTION_COUNT`.
- [x] Rendered a conditional `role="note"` caution card (lane-yellow) with Ukrainian shortfall copy
  («менше», «неповний», «коротшим») showing the actual count vs the configured count.
- [x] typecheck 0, `npm test` 96 passed, `verify.sh` → PASS.

## Next
- [ ] (none — goal met; verify.sh passes)

## Artifacts
- app/(app)/test/[id]/page.tsx — conditional exam-short `role="note"` notice (host of the gate)
- tasks/wave2-ux-06-exam-short-notice/verify.sh — conditional notice gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T14:25Z ClPcs-Mac-mini: added conditional exam-short notice to `app/(app)/test/[id]/page.tsx`
  (imported `DEFAULT_EXAM_QUESTION_COUNT`, gated on `EXAM_SIMULATION` + `questions.length <` count,
  lane-yellow `role="note"` card with Ukrainian copy). typecheck 0, npm test 96 passed, verify.sh PASS.
- 2026-06-17T14:27Z ClPcs-Mac-mini: prior done-claim REJECTED only via "no VERDICT marker emitted"
  (procedural, no defect). Re-verified gate PASS; fixed a minor double-space in the notice JSX
  (`{questions.length} {" "}` → `{questions.length}{" "}` so the number isn't followed by two spaces
  before the pluralized word). typecheck 0, npm test 96 passed, verify.sh PASS. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T11:27:57Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T11:28:48Z)
