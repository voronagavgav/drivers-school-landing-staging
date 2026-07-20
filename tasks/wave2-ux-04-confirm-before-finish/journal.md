# Task: wave2-ux-04-confirm-before-finish

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add a confirm-before-finish step to the test runner; when the user finishes with unanswered questions,
warn them with the answered/total count. Spec B.

1. In `components/test-runner.tsx`, clicking "Завершити тест" no longer calls `finishTestAction`
   immediately: it opens a confirmation step first (a new client state such as `confirming`/`showFinish`
   and/or a `<dialog>`/modal). Only an explicit confirm control inside that step calls the existing
   `finish()` → `finishTestAction`.
2. The confirmation step shows the answered count using the Ukrainian phrase
   `Ви відповіли на {answeredCount} з {questions.length}` (capital "Ви …") whenever
   `answeredCount < questions.length`.
3. The confirmation step has a confirm control AND a cancel/«Скасувати» control that closes it without
   finishing.
4. The existing finish idempotency latch (`finishingRef` / `finishing`) is preserved — confirming still
   guards against double-finish (the `finishingRef.current` early-return remains).
5. `npm run typecheck` exits 0.
6. `npm test` exits 0 (zero failures).

## Constraints / decisions
- Edit `components/test-runner.tsx` only. Keep it a client component.
- The warning phrase must be present for the unanswered case; an "all answered" confirm may use a
  simpler message, but the «Ви відповіли на … з …» string MUST exist in the file for the warning path.
- Do NOT remove or weaken `finishingRef`/`finishing` (Wave 1 idempotency guard). The timer `onExpire`
  must still finish the exam directly (time-up auto-submit) — confirmation is for the manual
  "Завершити тест" button, not for the timer expiry.
- Keep Ukrainian copy and the road-sign styling (reuse `Button`, `cx`).
- Non-Goal: server-side changes, schema changes, the question navigator (task 05).

## Plan
- [x] Add a `confirming` state; the manual "Завершити тест" button opens it instead of finishing.
- [x] Render the confirm panel with the «Ви відповіли на X з N» warning + confirm/cancel controls.
- [x] Keep timer `onExpire` → `finish()` direct; keep `finishingRef`.
- [x] `npm run typecheck` + `npm test`.

## Done
- [x] Added `confirming` state; manual «Завершити тест» now opens a confirm modal instead of calling finish directly.
- [x] Confirm modal warns «Ви відповіли на {answeredCount} з {questions.length}» when unanswered remain; confirm calls `finish()`, «Скасувати» closes it.
- [x] Timer `onExpire` still wired to `finish()` directly; `finishingRef` latch untouched.
- [x] typecheck 0, npm test 96/96, verify.sh PASS.

## Next
- [ ] (none — Goal met; verify.sh PASS)

## Artifacts
- components/test-runner.tsx — confirm-before-finish + unanswered warning
- tasks/wave2-ux-04-confirm-before-finish/verify.sh — confirm gate + warning string

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T14:19Z ClPcs-Mac-mini: implemented confirm-before-finish in components/test-runner.tsx — added `confirming` state, gated the manual finish button behind a confirm modal with the «Ви відповіли на X з N» unanswered warning + «Скасувати»/confirm controls; kept timer onExpire→finish() and finishingRef. typecheck 0, npm test 96/96, verify.sh PASS. Status→done.

## Verify
**Last verify:** PASS (2026-06-17T11:20:05Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T11:20:34Z)
