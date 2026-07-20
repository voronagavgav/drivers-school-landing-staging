# Task: wave15-12-quick-hint-diagnostic-runner

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T10:27Z
**Last compute:** mac-mini

## Goal
Runner presentation for QUICK (soft-time hint) and DIAGNOSTIC (withheld reveal) in
components/test-runner.tsx (spec §E "Runner adaptations"). PASS = ALL true:

1. QUICK soft hint: for mode === "QUICK", once elapsed time ≥ QUICK_SOFT_TIME_SEC (imported from
   @/lib/constants — grep), a CALM non-blocking hint renders (an aria-live="polite" text element,
   data-testid="quick-soft-hint", copy contains «5 хвилин» — grep both). It is TEXT ONLY:
   no numeric ticking countdown is ever rendered for QUICK (the mm:ss Timer stays gated to the exam
   deadline path — grep confirms the Timer render condition still requires the exam mode/deadline).
2. DIAGNOSTIC withheld presentation: a single derived flag (e.g. `revealWithheld`) covering
   EXAM_SIMULATION and DIAGNOSTIC (grep DIAGNOSTIC in test-runner.tsx) gates EVERY
   reveal-classified site from wave15-01 finding (e): no ✓/✗ per-option markers, no
   Правильно/Неправильно feedback block, no explanation, no lock-after-answer (answers changeable
   until finish), footer uses the answered-N-of-M variant. Timer/deadline remain EXAM-ONLY (a
   DIAGNOSTIC run has NO timer). The confidence chip (lives in the feedback block) is consequently
   absent for DIAGNOSTIC.
3. Existing exam + practice rendering byte-equivalent (changes are additive conditionals; the
   isExam-only sites that must NOT change per finding (e) are untouched).
4. Browser smoke (login seeded user): start QUICK from /practice → answer one option → feedback
   appears (immediate reveal preserved: body textContent matches Правильно or Неправильно) AND body
   textContent does NOT match the /[0-9]+:[0-9]{2}/ timer pattern (no countdown for QUICK).
5. `npx tsc --noEmit` exits 0; `npm test` exits 0.

## Constraints / decisions
- Calm > pressure (spec Non-goal): the 5-min guide is a gentle suggestion — soft copy («можна
  зупинитися…»-style, prompt to finish, progress saved), never urgency/red/blinking; appears without
  animation (or motion-safe only).
- DIAGNOSTIC on-finish reveal happens on the RESULT page (wave15-14) — the runner only withholds.
- The server already withholds the payload for DIAGNOSTIC (wave15-09); this task makes the UI honest
  about it — do not re-derive correctness client-side.
- Ukrainian copy; a11y: hint is aria-live="polite"; focus/contrast per house standards.

## Next
- [x] Read wave15-01 finding (e); add revealWithheld + the QUICK hint; then the browser smoke.
- (none — Goal met; full verify.sh green incl. browser smoke.)

## Artifacts
- components/test-runner.tsx

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T10:27Z ClPcs-Mac-mini: Added `revealWithheld = isExam || mode==="DIAGNOSTIC"` derived flag;
  routed reveal-withholding sites (locked, submit feedback gate, confidence chip, answered-N-of-M footer)
  through it so DIAGNOSTIC withholds correctness/lock/explanation like EXAM (Timer/deadline kept literal
  `isExam` — no timer for DIAGNOSTIC). Added QUICK soft-time hint: one-shot `setTimeout(QUICK_SOFT_TIME_SEC*1000)`
  → aria-live=polite `data-testid="quick-soft-hint"` calm text «…близько 5 хвилин…прогрес збережено», no
  countdown. Exam/practice rendering unchanged (additive conditionals). Rebuilt + restarted stale :3100
  server; ran full verify.sh incl. browser smoke → PASS.

## Verify
**Last verify:** PASS (2026-07-03T07:27:27Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T07:29:16Z)
