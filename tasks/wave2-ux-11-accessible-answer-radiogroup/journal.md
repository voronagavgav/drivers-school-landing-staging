# Task: wave2-ux-11-accessible-answer-radiogroup

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Make the test runner's answer options an accessible single-choice group: proper roles/labels, keyboard
operable (arrow + Enter/Space), with a non-colour correctness indicator. Visible focus already exists in
`globals.css`. Spec D.

1. In `components/test-runner.tsx`, the answer-options container has `role="radiogroup"` with an
   accessible name (`aria-label` or `aria-labelledby`).
2. Each option is exposed as a radio: it has `role="radio"` and an `aria-checked` value bound to whether
   it is the selected option.
3. The options group is keyboard operable: there is an `onKeyDown` handler that responds to arrow keys
   (matches `ArrowDown`/`ArrowUp` and/or `ArrowRight`/`ArrowLeft`) to move the choice, and Enter/Space
   selects. (Tab still reaches the group; `:focus-visible` styling already exists.)
4. Correctness is NOT conveyed by colour alone: when practice feedback is shown, each option renders a
   non-colour indicator — a `✓` for the correct option and a `✗` for a wrong selected option (text/icon,
   not just the existing green/red border).
5. `npm run typecheck` exits 0.
6. `npm test` exits 0 (zero failures).

## Constraints / decisions
- Edit `components/test-runner.tsx` only; keep it a client component and keep the existing
  practice/exam selection behaviour (`choose`, `locked`, `pending`).
- Radio semantics: exactly one option `aria-checked="true"` at a time; arrow navigation should move the
  active option within the group. Keep it working on mobile (pointer tap still selects).
- The `✓`/`✗` indicators apply when feedback exists (practice mode); they must not leak correctness for
  an in-progress exam (no feedback object → no indicator), preserving the Wave 1 answer-leak guarantee.
- Non-Goal: the question navigator (task 05), aria-labels on the save/flag/timer controls + skip link
  (task 12), redesign of the option visuals beyond adding the ✓/✗ glyph.

## Plan
- [x] Wrap options in `role="radiogroup"` + aria-label; give each option `role="radio"` + `aria-checked`.
- [x] Add an `onKeyDown` arrow/Enter handler that moves + selects.
- [x] Add `✓`/`✗` glyphs to options when feedback is present.
- [x] `npm run typecheck` + `npm test`.

## Done
- [x] Options container is `role="radiogroup"` with `aria-labelledby` pointing at the question text
  (`id={`q-${q.questionId}`}`); each option `<button>` now has `role="radio"` + `aria-checked={isSelected}`.
  `npm run typecheck` exits 0.
- [x] Radiogroup now keyboard-operable: `onKeyDown={onOptionsKeyDown}` on the container handles
  `ArrowDown`/`ArrowRight` (next) and `ArrowUp`/`ArrowLeft` (prev) via `moveChoice(dir)`, which wraps
  around, calls `choose()` (move + select), and moves DOM focus through `optionRefs`. Roving tabindex
  (`tabIndex={i === rovingIdx ? 0 : -1}`) keeps only the checked option (or the first) tab-reachable;
  Enter/Space select natively via the focused `<button>`. Guarded by the same `locked || pending` check
  as `choose`. `npm run typecheck` exits 0.
- [x] Non-colour correctness glyphs: each option computes `mark` (`correct`/`wrong`/null) only when `fb`
  exists — `correct` on `o.id === fb.correctOptionId`, `wrong` on the selected-but-wrong option. Renders an
  `ml-auto` span with an `aria-hidden` `✓`/`✗` glyph plus an `sr-only` Ukrainian label
  («правильна відповідь» / «неправильна відповідь»). No `fb` (in-progress exam) ⇒ `mark` stays null ⇒ no
  glyph, preserving the Wave 1 answer-leak guarantee. Full verify.sh PASS (typecheck 0, 96 tests pass).

## Next
- [ ] None — Goal fully met; verify.sh PASS. If a regression surfaces, re-run
  `bash tasks/wave2-ux-11-accessible-answer-radiogroup/verify.sh`.

## Artifacts
- components/test-runner.tsx — accessible radiogroup + keyboard + non-colour correctness
- tasks/wave2-ux-11-accessible-answer-radiogroup/verify.sh — a11y semantics gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: added `role="radiogroup"` + `aria-labelledby` (question `<p>` given
  `id="q-<questionId>"`) on the options container and `role="radio"` + `aria-checked={isSelected}` on each
  option button in components/test-runner.tsx; typecheck green.
- 2026-06-17T12:10Z ClPcs-Mac-mini: added keyboard operation to the radiogroup in components/test-runner.tsx
  — `onKeyDown={onOptionsKeyDown}` (Arrow Down/Right → next, Up/Left → prev) calling `moveChoice(dir)` which
  wraps, selects via `choose()`, and focuses the target button through new `optionRefs`; added roving
  `tabIndex` (only the checked/first option is 0). Imported `type KeyboardEvent` from react. `npm run
  typecheck` exits 0. Remaining: ✓/✗ correctness glyphs (verify will still FAIL on `✗` until then).
- 2026-06-17T14:42Z ClPcs-Mac-mini: added non-colour correctness glyphs in components/test-runner.tsx — per
  option computes `mark` (`correct`/`wrong`/null) gated on `fb`; renders an `ml-auto` span with an
  `aria-hidden` `✓`/`✗` and an `sr-only` Ukrainian label. No `fb` ⇒ no glyph (exam answer-leak guarantee
  preserved). Ran full verify.sh → PASS (typecheck exits 0; 96/96 unit tests pass; both ✓/✗ greps satisfied).
  Goal fully met; Status → done.



## Verify
**Last verify:** PASS (2026-06-17T11:43:04Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T11:43:43Z)
