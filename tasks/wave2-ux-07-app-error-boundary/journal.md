# Task: wave2-ux-07-app-error-boundary

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add a route error boundary for the authenticated app segment so a thrown server action shows a friendly
Ukrainian message + retry, never a raw stack/overlay in production. Spec C.

1. `app/(app)/error.tsx` exists, begins with the `"use client"` directive, and default-exports a React
   component whose props are `{ error: Error & { digest?: string }; reset: () => void }`.
2. The component renders Ukrainian fallback copy (e.g. «Щось пішло не так») and a retry control whose
   handler calls `reset` (i.e. `onClick={() => reset()}` or `onClick={reset}`).
3. The component does NOT print the raw error stack/message as the primary UI (no `{error.stack}` and no
   bare `{error.message}` as the only content — a generic friendly message is shown instead).
4. `npm run typecheck` exits 0.
5. `npm test` exits 0 (zero failures).

## Constraints / decisions
- A Next.js `error.tsx` MUST be a Client Component (`"use client"`) and receives `{ error, reset }`.
- Keep it consistent with the road-sign design + Ukrainian copy (reuse `Button` from `@/components/ui`
  if convenient; a plain styled button calling `reset` is also fine).
- Scope: the `app/(app)` segment only. The admin boundary is task 08; the test not-found is task 09.
- Non-Goal: `global-error.tsx`, `loading.tsx` (out of Wave 2 scope per spec C), logging integrations.

## Plan
- [x] Create `app/(app)/error.tsx` (`"use client"`, `{ error, reset }`, friendly UA copy + retry).
- [x] `npm run typecheck` + `npm test`.

## Done
- [x] Create `app/(app)/error.tsx`.

## Next
- [ ] (none — goal met; verify.sh passes)

## Artifacts
- app/(app)/error.tsx — app-segment error boundary
- tasks/wave2-ux-07-app-error-boundary/verify.sh — boundary presence + shape gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T14:29Z ClPcs-Mac-mini: created app/(app)/error.tsx — client component, `{ error, reset }`, road-sign Card with «Щось пішло не так» + retry button calling reset(); shows error.digest (not stack/message). verify.sh PASS (typecheck 0, 96 tests green).

## Verify
**Last verify:** PASS (2026-06-17T11:29:57Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T11:30:24Z)
