# Task: wave3-feat-09-account-settings-screen

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** ClPcs-Mac-mini

## Goal
Add a small account/settings screen that hosts the change-password form (task 08's action), reachable from
the app nav. Spec D (UI half). Depends on task 08.

1. New route `app/(app)/account/page.tsx` exists, is an async server component, and calls `requireUser()`
   so the page is auth-gated (it lives under the `(app)` group, which already requires a user).
2. A client form component (`"use client"`, e.g. `components/account-forms.tsx` or inline in the page's own
   client child) wires `changePasswordAction` via `useActionState`, with `type="password"` inputs named
   `currentPassword` and `newPassword`, an error note for the action's `error`, and a success note when the
   action reports success. Reuse `Field`/`Button` from `@/components/ui` (matches `auth-forms.tsx`).
3. The app navigation links to `/account`: `components/app-nav.tsx` includes an `/account` entry with a
   Ukrainian label (e.g. «Акаунт» / «Налаштування»).
4. Ukrainian copy throughout; the demo/legal positioning and design system are unchanged (no redesign).
5. `npm run typecheck` exits 0.
6. `npm test` exits 0 (zero failures).
7. `npm run build` exits 0 and the `/account` route compiles.

## Constraints / decisions
- Server component does auth + layout; the password form must be a CLIENT component because it uses
  `useActionState` (mirror `components/auth-forms.tsx`).
- Import the action from `@/app/actions/auth` (task 08). Do NOT duplicate any verify/hash logic in the UI —
  the client only collects fields and renders the action's result.
- Keep the screen minimal: a single «Зміна пароля» card. The page may also show read-only account info
  (name/email) but that is optional, not required.
- Non-Goal: editing name/email, deleting the account, category change (already on /onboarding), or styling
  beyond the existing design system.

## Plan
- [x] Create `app/(app)/account/page.tsx` (server, `requireUser`).
- [x] Create the `"use client"` change-password form using `changePasswordAction` + `useActionState`.
- [x] Add the `/account` nav link in `components/app-nav.tsx`.
- [x] `npm run typecheck`, `npm test`, `npm run build`; run verify.sh.

## Done
- [x] Scaffolded `/account` page + `ChangePasswordForm` client component + nav link; full verify.sh PASS.

## Next
- [ ] (none — goal met; verify.sh passes)

## Artifacts
- app/(app)/account/page.tsx — account settings screen.
- components/account-forms.tsx — client change-password form (or inline client child).
- components/app-nav.tsx — adds the `/account` nav link.
- tasks/wave3-feat-09-account-settings-screen/verify.sh — route/form/nav + typecheck + unit + build (+ optional browser) gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T15:46Z ClPcs-Mac-mini: created `app/(app)/account/page.tsx` (async server component, `requireUser()`, read-only name/email card + «Зміна пароля» card), `components/account-forms.tsx` (`"use client"` `ChangePasswordForm` via `useActionState` + `changePasswordAction`, `currentPassword`/`newPassword` `type="password"` fields, error + success notes reusing `Field`/`Button`), and added the `/account` «Акаунт» nav link in `components/app-nav.tsx`. typecheck 0, npm test 114 passed, build 0 (`/account` compiles), verify.sh PASS. Status: done.

## Verify
**Last verify:** PASS (2026-06-17T12:47:04Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T12:48:08Z)
