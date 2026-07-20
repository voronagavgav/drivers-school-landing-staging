# Task: wave2-ux-08-admin-error-boundary

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add a route error boundary for the admin segment so a thrown admin server action shows a friendly
Ukrainian message + retry, never a raw stack/overlay. Spec C (admin boundary).

1. `app/admin/error.tsx` exists, begins with the `"use client"` directive, and default-exports a React
   component whose props are `{ error: Error & { digest?: string }; reset: () => void }`.
2. The component renders Ukrainian fallback copy (e.g. «Сталася помилка») and a retry control whose
   handler calls `reset`.
3. The component does NOT render the raw error stack (`{error.stack}` absent).
4. `npm run typecheck` exits 0.
5. `npm test` exits 0 (zero failures).

## Constraints / decisions
- Next.js `error.tsx` MUST be a Client Component (`"use client"`) and receives `{ error, reset }`.
- Scope: the `app/admin` segment only (it sits under `requireContentManager()` in `app/admin/layout.tsx`;
  the boundary catches errors from admin pages/actions). Keep admin styling + Ukrainian copy.
- May be near-identical to `app/(app)/error.tsx` (task 07) — that is fine; the two segments need their
  own boundary files.
- Non-Goal: `global-error.tsx`, `loading.tsx`, the app boundary (task 07).

## Plan
- [x] Create `app/admin/error.tsx` (`"use client"`, `{ error, reset }`, friendly UA copy + retry).
- [x] `npm run typecheck` + `npm test`.

## Done
- [x] Created `app/admin/error.tsx` — admin-segment client error boundary with «Сталася помилка»
  copy + «Спробувати ще раз» retry calling `reset()`; no `error.stack`. typecheck 0, tests 96 pass,
  verify.sh PASS.

## Next
- [ ] (none — goal met; driver re-runs verify)

## Artifacts
- app/admin/error.tsx — admin-segment error boundary
- tasks/wave2-ux-08-admin-error-boundary/verify.sh — boundary presence + shape gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T14:31Z ClPcs-Mac-mini: created `app/admin/error.tsx` (mirrors `app/(app)/error.tsx`,
  admin copy «Сталася помилка» + «Спробувати ще раз» → `reset()`). typecheck 0; npm test 96 pass;
  verify.sh PASS. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T11:31:20Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T11:31:40Z)
