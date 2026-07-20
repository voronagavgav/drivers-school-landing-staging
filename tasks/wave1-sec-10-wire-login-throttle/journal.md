# Task: wave1-sec-10-wire-login-throttle

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Wire the task-09 pure throttle core into `loginAction` via a per-instance in-memory store (spec section
B). Repeated failed logins for the same email are throttled; a successful login resets the counter.

1. A NEW server module `lib/server/login-throttle.ts` imports `server-only`, the pure core from
   `@/lib/login-throttle`, and `LOGIN_MAX_ATTEMPTS`/`LOGIN_WINDOW_SECONDS` from `@/lib/constants`, and
   holds a module-scope `Map<string, LoginThrottleState>` (documented as per-instance for the MVP). It
   exports:
   - `isLoginThrottled(key: string): boolean`
   - `noteLoginFailure(key: string): void`
   - `clearLoginThrottle(key: string): void`
   built on the pure `isThrottled`/`recordFailedAttempt` and `Date.now()`.
2. `app/actions/auth.ts` `loginAction`: BEFORE the password check, if `isLoginThrottled(<key>)` returns
   true, it returns `{ error: <Ukrainian "завелика кількість спроб" message> }` and does NOT run the
   bcrypt compare. `<key>` is derived from the normalized email (IP may additionally be incorporated).
3. On a FAILED credential check, `loginAction` calls `noteLoginFailure(<key>)` before returning the
   generic error. On a SUCCESSFUL login it calls `clearLoginThrottle(<key>)` so the counter resets.
4. The throttled message contains the phrase «завелика кількість спроб» (case-insensitive) and is
   Ukrainian. The generic invalid-credentials message is unchanged (no user enumeration).
5. `npm run typecheck` exits 0 and `npm test` exits 0 (zero failures).

## Constraints / decisions
- Edit `app/actions/auth.ts` and add `lib/server/login-throttle.ts`. Do NOT change the pure core
  (`lib/login-throttle.ts`) or the constants (task 09).
- The store is an in-memory Map (per-instance, acceptable for the MVP) — document that in a comment.
  Do not add a DB table or external cache (Out of scope: no schema change).
- Keep the existing `loginSchema` parse (task 04) as the first step; throttle check comes after a valid
  shape but before the DB/bcrypt work, so malformed input is still rejected cheaply.
- The bcrypt compare must be SKIPPED when throttled (that is the point — stop unbounded compares).
- Non-Goal: throttling `registerAction`, captcha, distributed/shared storage, IP geolocation.

## Plan
- [x] Write `lib/server/login-throttle.ts` (Map + the 3 exports over the pure core + constants).
- [x] In `loginAction`: throttle-check → early Ukrainian error; note failure on bad creds; clear on success.
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] Created `lib/server/login-throttle.ts`: `server-only`, per-instance `new Map<string, LoginThrottleState>`,
      config from `LOGIN_MAX_ATTEMPTS`/`LOGIN_WINDOW_SECONDS`, exports `isLoginThrottled`/`noteLoginFailure`/
      `clearLoginThrottle` over the pure `isThrottled`/`recordFailedAttempt`. `npm run typecheck` exits 0.
- [x] Wired `loginAction` (`app/actions/auth.ts`): key = normalized email; throttle-check after `loginSchema`
      parse but BEFORE the `prisma.user.findUnique`/`verifyPassword` work → early «Завелика кількість спроб
      входу» error (skips bcrypt); `noteLoginFailure(key)` on bad creds; `clearLoginThrottle(key)` on success.
      `npm run typecheck` exits 0; `npm test` 91 passed (8 files).

## Next
- [ ] Goal met — nothing pending. (Optional follow-up belongs to later wave tasks: no `loginAction`
      change remaining here.)

## Artifacts
- lib/server/login-throttle.ts — per-instance in-memory throttle store
- app/actions/auth.ts — loginAction throttled + reset-on-success
- tasks/wave1-sec-10-wire-login-throttle/verify.sh — store + wiring + Ukrainian message + typecheck/test

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T08:36Z ClPcs-Mac-mini: wrote lib/server/login-throttle.ts (server-only + per-instance Map over
  the pure core, config from constants, 3 exports). typecheck green. Next: wire loginAction.
- 2026-06-17T11:37Z ClPcs-Mac-mini: wired loginAction in app/actions/auth.ts — imported the 3 server-store
  exports; throttle-check (key=normalized email) after loginSchema parse and before findUnique/bcrypt →
  early Ukrainian «Завелика кількість спроб входу» error; noteLoginFailure on bad creds; clearLoginThrottle
  on success. typecheck 0; npm test 91 passed. Status: done.


## Verify
**Last verify:** PASS (2026-06-17T08:37:44Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:38:20Z)
