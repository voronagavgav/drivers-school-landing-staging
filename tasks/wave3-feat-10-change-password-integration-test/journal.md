# Task: wave3-feat-10-change-password-integration-test

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Prove the change-password flow (tasks 08–09) end-to-end against the real seeded SQLite DB. Spec D:
"wrong current → rejected; correct → hash changes, can log in with new." Depends on task 08.

1. New file `lib/server/change-password.integration.test.ts` exists and imports `changePasswordAction`
   from `@/app/actions/auth`, plus `prisma` (`@/lib/db`) and `verifyPassword` (`@/lib/auth`).
2. It partial-mocks `@/lib/auth` so `getCurrentUser` is a `vi.fn()` (the `requireUser` boundary), the rest
   of `@/lib/auth` real — mirroring `lib/server/access-control.integration.test.ts`. A throwaway USER with a
   known current password (hashed) is created in `beforeAll` and DELETED in `afterAll`.
3. Wrong-current-password case: with `getCurrentUser` mocked to the throwaway user, calling
   `changePasswordAction` with an INCORRECT `currentPassword` returns the action's error result (does not
   succeed), AND the user's `passwordHash` in the DB is UNCHANGED afterward.
4. Correct-password case: calling with the correct `currentPassword` and a valid new password (≥8 chars)
   succeeds; re-reading the user from the DB shows `passwordHash` CHANGED, and
   `verifyPassword(newPassword, storedHash)` returns `true` (i.e. the user can authenticate with the new
   password) while `verifyPassword(oldPassword, storedHash)` returns `false`.
5. `npm run test:integration` exits 0 and the run includes `change-password.integration.test.ts`.
6. `npm run typecheck` exits 0.

## Constraints / decisions
- Test only — do not modify the action or schema. If a criterion fails because the ACTION is wrong, set
  task 08 back to `active` with a note rather than weakening the test.
- Use a throwaway user keyed by `Date.now()` and delete it in `afterAll` (deleting the user cascades its
  children), keeping the seeded DB clean — per the integration-test convention.
- Set the `getCurrentUser` mock to resolve to the ACTUAL created user row (so `passwordHash` is real)
  before each action call; reset/realign the mock between the wrong- and correct-password cases.
- Run under the integration config (`vitest.integration.config.ts`, which stubs `server-only`); the file
  MUST be named `*.integration.test.ts` so it is excluded from the fast `npm test` suite.
- Non-Goal: testing the React form, throttling, or session invalidation.

## Plan
- [x] Write the integration test (mock boundary, throwaway user, wrong + correct cases, cleanup).
- [x] `npm run test:integration` + `npm run typecheck`; run verify.sh.

## Done
- [x] Authored `lib/server/change-password.integration.test.ts`: partial-mocks `@/lib/auth`
  (`getCurrentUser` → `vi.fn()`, rest real), creates a throwaway USER (hashed `OLD_PASSWORD`,
  `Date.now()` email) in `beforeAll`, deletes it in `afterAll`. Wrong-current case asserts an
  error result + unchanged `passwordHash`; correct case asserts success + rotated hash with
  `verifyPassword(new)===true` / `verifyPassword(old)===false`.
- [x] verify.sh PASS: typecheck 0, integration suite 13/13 (4 files), file included under the
  integration config.

## Next
- [ ] (none — Goal met; verify.sh green)

## Artifacts
- lib/server/change-password.integration.test.ts — wrong/correct change-password proofs.
- tasks/wave3-feat-10-change-password-integration-test/verify.sh — integration run + inclusion + typecheck gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17 12:49Z ClPcs-Mac-mini: authored lib/server/change-password.integration.test.ts
  (mirrors access-control.integration.test.ts mock setup). verify.sh PASS — typecheck 0,
  integration 13/13 (4 files), file included under vitest.integration.config.ts. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T12:50:24Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T12:51:13Z)
