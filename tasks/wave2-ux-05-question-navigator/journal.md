# Task: wave2-ux-05-question-navigator

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add a question navigator to the test runner: jump to any question, flag a question "for review", and
see answered / unanswered / flagged at a glance. Flag state is CLIENT-SIDE ONLY (no schema change).
Spec B.

1. `components/test-runner.tsx` renders a navigator: one control (button) per question `1..N` that, on
   click, sets the current question index (`setIdx`).
2. A per-question flag toggle exists, backed by a new CLIENT state (e.g. `flagged: Record<string,
   boolean>` via `useState`). Toggling a flag does NOT call any server action (no new import from
   `@/app/actions/*` for flagging) — flag state is local only.
3. The navigator visually distinguishes the three states for each question — answered, unanswered, and
   flagged — using classes/markers (not relying on a single colour); each navigator control also has an
   `aria-label` that includes the question number.
4. The flag control has Ukrainian text/label (e.g. «Позначити», «До перегляду», or «Познач.»).
5. `npm run typecheck` exits 0.
6. `npm test` exits 0 (zero failures).

## Constraints / decisions
- Edit `components/test-runner.tsx` only. Keep it a client component.
- Flag state MUST be client-side (`useState`) — no Prisma, no server action, no schema field. This is an
  explicit spec constraint ("Flag state is client-side only (no schema change)").
- "Answered" derives from existing state (`selected[questionId]`); "flagged" from the new state.
- Mobile-first: a compact wrap/grid of numbered controls (reuse `cx`, Tailwind classes already in file).
- Non-Goal: persisting flags across reloads, server changes, the confirm dialog (task 04), a11y
  radiogroup of the OPTIONS (task 11 — separate region).

## Plan
- [x] Add `flagged` client state + a flag toggle on the current question.
- [x] Render a numbered navigator grid that jumps via `setIdx` and shows answered/unanswered/flagged.
- [x] Add `aria-label`s with the question number to each navigator control.
- [x] `npm run typecheck` + `npm test`.

## Done
- [x] Added `flagged: Record<string, boolean>` client state (`useState`) + `toggleFlag()` (no server action) and a Ukrainian flag toggle («⚐ Позначити» / «⚑ До перегляду») next to the save control on the current question. typecheck exits 0.
- [x] Rendered a numbered navigator grid (`<nav>`, `1..N`) that jumps via `setIdx(i)`; distinguishes answered (✓ marker + go border) / unanswered (line border, muted) / flagged (⚑ marker) / current (sign ring) using markers + classes, not colour alone; each control has an `aria-label` with the question number + state, plus `aria-current` on the active one. verify.sh PASS (typecheck 0, 96 tests pass).

## Next
- [ ] None — goal met; verify.sh PASS. (Optional follow-ups live in sibling wave2-ux tasks: a11y radiogroup of OPTIONS is task 11, ARIA labels on save/flag toggles is task 12.)

## Artifacts
- components/test-runner.tsx — question navigator + client-side flagging
- tasks/wave2-ux-05-question-navigator/verify.sh — navigator + flag presence gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: added `flagged` client state + `toggleFlag()` (client-only, no server action) and a Ukrainian flag toggle button («Позначити»/«До перегляду») beside the save control in components/test-runner.tsx; `npm run typecheck` exits 0.
- 2026-06-17T14:22Z ClPcs-Mac-mini: rendered the numbered navigator grid (`<nav aria-label>` + `1..N` buttons jumping via `setIdx(i)`) in components/test-runner.tsx; answered/unanswered/flagged distinguished by markers (✓/⚑) + classes (go/line/sign borders) not colour alone; per-button `aria-label` includes question number + state, `aria-current` on active. Fixes the prior aria-label FAIL. verify.sh → PASS (typecheck 0, 96/96 tests).


## Verify
**Last verify:** PASS (2026-06-17T11:23:17Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T11:23:51Z)
