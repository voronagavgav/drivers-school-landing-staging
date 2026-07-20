# Task: wave1-sec-04-wire-validation-auth-actions

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Wire the task-02 schemas into the auth server actions (spec section A) so invalid input returns a
friendly Ukrainian message via the existing `useActionState` (`AuthState`) pattern and never reaches
the DB. Behaviour for VALID input is unchanged.

1. `app/actions/auth.ts` imports `registerSchema`, `loginSchema`, and `firstIssueMessage` from
   `@/lib/validation`.
2. `registerAction` parses its inputs with `registerSchema.safeParse(...)` BEFORE any `prisma.*` call;
   on failure it returns `{ error: <Ukrainian message> }` (from `firstIssueMessage`) and performs NO
   database write. On success it behaves exactly as before (create user → session → redirect).
3. `loginAction` parses its inputs with `loginSchema.safeParse(...)`; on failure it returns an
   `{ error }` with a Ukrainian message and does NOT change the user-enumeration behaviour (a malformed
   login still yields a generic credential-style message, never revealing which field failed).
4. Both actions still return `Promise<AuthState>` and the file still exports `registerAction`,
   `loginAction`, and `logoutAction`. All user-facing strings remain Ukrainian.
5. `npm run typecheck` exits 0 and `npm test` exits 0 (zero failures).

## Constraints / decisions
- Edit ONLY `app/actions/auth.ts`. Do not touch `lib/validation.ts`, other actions, or components.
- Preserve the existing redirect targets in `registerAction`/`loginAction` (success → `/onboarding`
  for register; role-based `/admin` or `/dashboard` for login) and the `recordEvent` calls.
- The manual inline checks (`name.length < 2`, `EMAIL_RE`, `password.length < 8`) may be REPLACED by
  the schema parse, but the resulting Ukrainian messages must stay equivalent — do not regress copy.
- Security: validate BEFORE the `prisma.user.findUnique`/`create` so malformed input can never persist
  or trigger an unhandled 500. Do NOT weaken the generic login error (no user enumeration).
- Non-Goal: throttling (tasks 09/10), admin/test/user actions (tasks 05/07).

## Plan
- [x] Import the schemas + `firstIssueMessage`.  (registerSchema + firstIssueMessage wired; loginSchema next)
- [x] Rewrite `registerAction` to `safeParse` first → `{ error }` on failure, else existing flow.
- [x] Rewrite `loginAction` to `safeParse` first → `{ error }` on failure (generic), else existing flow.
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] Added `@/lib/validation` import (`registerSchema`, `firstIssueMessage`) and converted
      `registerAction` to parse-then-act: `registerSchema.safeParse({name,email,password})` runs
      BEFORE the first `prisma.*` call; on failure returns `{ error: firstIssueMessage(...) }` (no DB
      write). Removed the now-dead inline checks + `EMAIL_RE` const. `npm run typecheck` exits 0.
- [x] Added `loginSchema` to the `@/lib/validation` import and converted `loginAction` to
      `loginSchema.safeParse({email,password})` BEFORE the `prisma.user.findUnique` call; on failure
      returns the SAME generic `{ error: "Невірна пошта або пароль." }` (no user enumeration, no DB
      hit). Valid-input flow (session → lastActiveAt → recordEvent → role-based redirect) unchanged.
      `npm run typecheck` exits 0; `npm test` = 63 passed (0 failures).

## Next
- [ ] None — goal met (both auth actions parse-before-DB, exports intact, typecheck/test green).

## Artifacts
- app/actions/auth.ts — validated register/login
- tasks/wave1-sec-04-wire-validation-auth-actions/verify.sh — wiring + parse-before-DB + typecheck/test

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17 08:10 UTC ClPcs-Mac-mini: imported `registerSchema`+`firstIssueMessage` from
  `@/lib/validation`; converted `registerAction` to `safeParse`-before-prisma (returns
  `firstIssueMessage` on failure); dropped dead `EMAIL_RE` + inline checks. typecheck green. Next:
  wire `loginSchema` into `loginAction` (keep generic error).
- 2026-06-17 11:12 UTC ClPcs-Mac-mini: added `loginSchema` to the import and converted `loginAction`
  to `loginSchema.safeParse({email,password})` BEFORE `prisma.user.findUnique`; on failure returns the
  generic `{ error: "Невірна пошта або пароль." }` (no user enumeration). typecheck exits 0; npm test
  63 passed (0 failures). Goal met → Status: done.


## Verify
**Last verify:** PASS (2026-06-17T08:12:20Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:13:09Z)
