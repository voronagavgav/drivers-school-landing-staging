# Task: wave2-ux-12-aria-labels-and-landmarks

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add aria-labels to non-textual controls, make the exam timer announce to screen readers, and add a
skip-to-content link to a proper main landmark. Spec D.

1. In `components/test-runner.tsx`, the save toggle (the «☆ Зберегти питання / ★ Збережено» button) and
   the flag/review toggle (from task 05) each have an `aria-label`.
2. The exam `Timer` is announced: its rendered element has `aria-live="polite"` and an `aria-label`
   (so the remaining time / low-time state is conveyed to assistive tech, not by colour alone).
3. A skip-to-content link exists in `app/(app)/layout.tsx`: a focusable anchor `href="#main-content"`
   (visually hidden until focused, e.g. `sr-only focus:not-sr-only`) AND the `<main>` element has the
   matching `id="main-content"`.
4. `npm run typecheck` exits 0.
5. `npm test` exits 0 (zero failures).

## Constraints / decisions
- Touch `components/test-runner.tsx` (save/flag/timer labels) and `app/(app)/layout.tsx` (skip link +
  `<main id="main-content">`). Keep Ukrainian copy for the visible skip-link text (e.g. «Перейти до
  вмісту»).
- Tailwind v4 ships the `sr-only` / `not-sr-only` utilities — use them for the skip link; do not add
  custom CSS.
- The save toggle currently has no aria-label and conveys state only by the ★/☆ glyph — add an
  `aria-label` reflecting the action. The flag toggle's label may come from task 05 but MUST end up with
  an `aria-label` once this task is done.
- Non-Goal: the radiogroup options (task 11), the navigator itself (task 05), a full landmark audit /
  `<nav aria-label>` rework beyond adding the skip link + main id.

## Plan
- [x] Add `aria-label` to the save toggle and the flag toggle in `test-runner.tsx`.
- [x] Give the `Timer` element `aria-live="polite"` + an `aria-label`.
- [x] Add a skip link + `<main id="main-content">` in `app/(app)/layout.tsx`.
- [x] `npm run typecheck` + `npm test`.

## Done
- [x] Added `aria-label`s to the save + flag toggles in `components/test-runner.tsx`
  (state-aware Ukrainian labels: save ↔ remove-from-saved, flag ↔ unflag).
- [x] Gave the `Timer` span `role="timer"` + `aria-live="polite"` + a state-aware Ukrainian
  `aria-label` («Залишилось часу: … хв … с», with a low-time suffix). Typecheck green.
- [x] Added a skip-to-content link («Перейти до вмісту», `href="#main-content"`,
  `sr-only focus:not-sr-only`) and gave the `<main>` element `id="main-content"` in
  `app/(app)/layout.tsx`. Verify gate (typecheck + 96 unit tests) PASS.

## Next
- [ ] None — Goal fully met (all 5 acceptance criteria pass; verify.sh green). Task done.

## Artifacts
- components/test-runner.tsx — aria-labels on save/flag + aria-live timer
- app/(app)/layout.tsx — skip-to-content link + main landmark id
- tasks/wave2-ux-12-aria-labels-and-landmarks/verify.sh — aria/landmark gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: added state-aware `aria-label`s to the save and flag toggle
  buttons in components/test-runner.tsx (glyph-only state now conveyed to assistive tech).
- 2026-06-17T12:10Z ClPcs-Mac-mini: fixed the failing verify — gave the `Timer` span
  `role="timer"` + `aria-live="polite"` + a state-aware Ukrainian `aria-label` in
  components/test-runner.tsx. `npm run typecheck` exits 0.
- 2026-06-17T14:46Z ClPcs-Mac-mini: added skip-to-content link («Перейти до вмісту»,
  `href="#main-content"`, `sr-only focus:not-sr-only`) + `id="main-content"` on `<main>` in
  app/(app)/layout.tsx. Full verify.sh PASS (typecheck 0, 96/96 unit tests). Status → done.



## Verify
**Last verify:** PASS (2026-06-17T11:46:25Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T11:46:58Z)
