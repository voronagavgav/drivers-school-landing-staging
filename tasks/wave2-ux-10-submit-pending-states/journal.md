# Task: wave2-ux-10-submit-pending-states

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Every submit button shows a pending/disabled state. Auth (`components/auth-forms.tsx`) and the admin
question editor (`app/admin/questions/question-editor.tsx`) already do this via `useActionState`'s
`pending`; the remaining server-action forms (onboarding, dashboard start-test, practice) submit with a
plain `Button` and no pending state. Add a reusable pending-aware submit button and apply it. Spec C.

1. A reusable client component `components/submit-button.tsx` exists, begins with `"use client"`, uses
   the React `useFormStatus` hook, exports `SubmitButton`, and renders a `type="submit"` button that is
   `disabled` while `pending` (and shows pending text/affordance while pending).
2. `SubmitButton` is imported and used in each of: `app/(app)/onboarding/page.tsx`,
   `app/(app)/dashboard/page.tsx`, `app/(app)/practice/page.tsx` (replacing the plain submit `Button`
   inside the `<form action={...}>` blocks there).
3. The already-pending forms are PRESERVED: `components/auth-forms.tsx` still references `pending`, and
   `app/admin/questions/question-editor.tsx` still references `pending`.
4. `npm run typecheck` exits 0.
5. `npm test` exits 0 (zero failures).

## Constraints / decisions
- `useFormStatus` only reports status for the nearest ancestor `<form>`, so `SubmitButton` MUST be a
  client child rendered INSIDE each `<form action={...}>` — do not call the hook in the page itself.
- Reuse the existing `Button` visual (or its classes) so styling stays consistent; keep Ukrainian labels
  (pass the label as children/prop). The disabled-while-pending styles already exist on `Button`.
- The dashboard has multiple start forms (`StartButton`, the "Рекомендована дія" form); the practice
  page has the mixed + per-topic forms — all should use the pending-aware submit. Preserve the existing
  `disabled={n === 0}` on the empty-topic button.
- Non-Goal: `loading.tsx`/route loading skeletons (out of Wave 2 scope per spec C); changing the server
  actions; touching auth/admin pending (already done — only verify they remain).

## Plan
- [x] Create `components/submit-button.tsx` (`"use client"`, `useFormStatus`, `SubmitButton`).
- [x] Use it in onboarding, dashboard (all start forms), practice (mixed + per-topic).
- [x] Confirm auth-forms + question-editor still show `pending`.
- [x] `npm run typecheck` + `npm test`.

## Done
- [x] Created `components/submit-button.tsx` — `"use client"`, `useFormStatus` from `react-dom`,
  exports `SubmitButton`; wraps the shared `Button` with `type="submit"`,
  `disabled={pending || disabled}`, swaps in an optional `pendingLabel` while busy. typecheck 0.
- [x] Wired `SubmitButton` into all previously-unguarded server-action forms: onboarding (Продовжити),
  dashboard (`StartButton` ×3 + the "Рекомендована дія" form), practice (mixed + per-topic). Each gets a
  Ukrainian `pendingLabel`; preserved the empty-topic `disabled={n === 0}`. Removed the now-unused `Button`
  imports from all three pages. typecheck 0; `npm test` 96 passed; verify.sh → PASS.

## Next
- (none — goal met; verify.sh passes end-to-end)

## Artifacts
- components/submit-button.tsx — pending-aware submit button
- app/(app)/onboarding/page.tsx, app/(app)/dashboard/page.tsx, app/(app)/practice/page.tsx — use it
- tasks/wave2-ux-10-submit-pending-states/verify.sh — pending-state coverage gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17 11:33 UTC ClPcs-Mac-mini: created `components/submit-button.tsx` (`"use client"`,
  `useFormStatus`, exports `SubmitButton` wrapping shared `Button`, `disabled={pending || disabled}`,
  optional `pendingLabel`). `npm run typecheck` exits 0.
- 2026-06-17 14:35 UTC ClPcs-Mac-mini: wired `SubmitButton` into onboarding, dashboard (all start forms),
  and practice (mixed + per-topic) `<form action={…}>` blocks; gave each a Ukrainian `pendingLabel`;
  preserved empty-topic `disabled={n === 0}`; dropped the now-unused `Button` imports. typecheck 0,
  `npm test` 96 passed, verify.sh → PASS. Status: done.


## Verify
**Last verify:** PASS (2026-06-17T11:36:19Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T11:36:54Z)
