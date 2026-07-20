# Task: wave3-feat-08-change-password-action

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** ClPcs-Mac-mini

## Goal
Add the server-side change-password capability: a validation schema (reusing the Wave 1 password rule) and
a `"use server"` action that verifies the current password, validates the new one, re-hashes, and updates
ONLY the logged-in user. Spec D (server half). Security-sensitive — no client trust, no account leakage.

1. `lib/validation.ts` exports `changePasswordSchema` (zod) with at least `currentPassword` (non-empty
   string) and `newPassword` (`z.string().min(8, …)` — the SAME 8-char minimum as `registerSchema`), with
   Ukrainian `{ error: … }` messages. It is pure (no new server/DB tokens in `lib/validation.ts`).
2. `app/actions/auth.ts` exports an async server action `changePasswordAction` (the file keeps its
   top-level `"use server"`). The action:
   a. calls `requireUser()` (from `@/lib/rbac`) to get the current user — it NEVER reads a user id from the
      form/client;
   b. parses input with `changePasswordSchema` (returns the friendly first-issue error on failure);
   c. loads the current user's `passwordHash` and calls `verifyPassword(currentPassword, hash)`; on
      mismatch returns a friendly Ukrainian error and performs NO write;
   d. on success, computes `await hashPassword(newPassword)` and updates `prisma.user.update` for
      `{ id: currentUser.id }` only, setting `passwordHash`.
3. The action returns a typed result object (e.g. `{ error?: string }` plus a success signal such as
   `{ ok: true }` or a `success` message) — usable from a `useActionState` form.
4. No user enumeration / cross-account access: the action scopes every read and the write to the session
   user's id; it does not accept or trust an email/userId argument.
5. `npm run typecheck` exits 0 and `npm test` exits 0 (zero failures). (Behavioural proof is task 10's
   integration test; this task is the implementation + static gate.)

## Constraints / decisions
- Reuse existing primitives: `verifyPassword`/`hashPassword` (`@/lib/auth`), `firstIssueMessage` +
  `changePasswordSchema` (`@/lib/validation`), `requireUser` (`@/lib/rbac`), `prisma` (`@/lib/db`). Do NOT
  re-implement hashing or hand-roll password comparison.
- Put the action in `app/actions/auth.ts` (reuses its existing imports). Keep the file's `"use server"`.
- Friendly, non-revealing errors only (Ukrainian). A wrong current password must NOT disclose anything
  about other accounts; same generic tone as the login action.
- No schema change (updates the existing `User.passwordHash`); confirm `prisma/schema.prisma` is unchanged.
- Non-Goal: email/2FA, password-reset-by-email, session invalidation on change, or the UI form (task 09).

## Plan
- [x] Add `changePasswordSchema` to `lib/validation.ts`.
- [x] Add `changePasswordAction` to `app/actions/auth.ts` (requireUser → parse → verify → re-hash → update).
- [x] `npm run typecheck`, `npm test`; run verify.sh.

## Done
- [x] `changePasswordSchema` (currentPassword non-empty, newPassword `min(8)`, Ukrainian messages) — pure.
- [x] `changePasswordAction` + `ChangePasswordState` type: requireUser → parse → verifyPassword(current) →
      hashPassword(new) → `prisma.user.update` scoped to `user.id`; generic Ukrainian error on mismatch, no
      write; returns `{ success }` for `useActionState`. No userId/email read from the form.
- [x] verify.sh PASS (typecheck 0, 114 unit tests pass, static security-shape gate green).

## Next
- [ ] (none — task done) Behavioural proof is task 10's integration test.

## Artifacts
- lib/validation.ts — adds `changePasswordSchema`.
- app/actions/auth.ts — adds `changePasswordAction`.
- tasks/wave3-feat-08-change-password-action/verify.sh — static security-shape + typecheck + unit gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T15:43Z ClPcs-Mac-mini: added `changePasswordSchema` to lib/validation.ts and
  `changePasswordAction` (+ `ChangePasswordState`) to app/actions/auth.ts. `requireUser()` already returns
  the full user record (incl. passwordHash) so no extra DB read; verify-before-update, update scoped to
  `user.id`. Dropped a recordEvent call (`password_changed` not in ANALYTICS_EVENTS, not in spec). verify.sh
  PASS. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T12:44:22Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T12:45:04Z)
