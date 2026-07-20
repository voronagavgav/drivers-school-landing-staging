# Task: wave1-sec-09-login-throttle-core

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add the configurable login-throttle CONSTANTS and the PURE throttle core with unit tests (spec section
B core). No wiring into the action here (that is task 10).

1. `lib/constants.ts` exports two numeric constants: `LOGIN_MAX_ATTEMPTS` (e.g. 5) and
   `LOGIN_WINDOW_SECONDS` (e.g. 900), with a comment noting the in-memory limiter is per-instance for
   the MVP.
2. A NEW file `lib/login-throttle.ts` exports a PURE core (no I/O; no `@/lib/db`, `server-only`,
   `@prisma/client`, or `lib/generated` import):
   - a type `LoginThrottleState` (e.g. `{ failures: number; windowStartMs: number }`);
   - `recordFailedAttempt(state: LoginThrottleState | undefined, nowMs: number,
     config: { maxAttempts: number; windowMs: number }): LoginThrottleState` — increments within an
     active window, or STARTS A FRESH window (failures = 1) when there is no state or the window has
     elapsed;
   - `isThrottled(state: LoginThrottleState | undefined, nowMs: number,
     config: { maxAttempts: number; windowMs: number }): boolean` — true iff the state is within an
     active window AND `failures >= maxAttempts`.
3. The functions are pure (do NOT mutate the passed-in `state`).
4. A NEW file `lib/login-throttle.test.ts` (vitest) asserts: (a) UNDER limit → `isThrottled` false;
   (b) at/OVER limit within the window → `isThrottled` true; (c) WINDOW RESET — once the window has
   elapsed, a new failed attempt starts a fresh window and `isThrottled` is false again.
5. `npm run typecheck` exits 0. `npm test` exits 0 (zero failures) and the test-file count increases by
   exactly 1.

## Constraints / decisions
- The pure core takes `config` as an argument (does NOT import the constants) so it stays fully
  unit-testable; task 10's wiring builds `config` from `LOGIN_MAX_ATTEMPTS`/`LOGIN_WINDOW_SECONDS`.
- Keep state as plain data (state in → decision out). Do not introduce a Map/timer/storage here — the
  per-instance in-memory store lives in the server wiring (task 10).
- Choose threshold/window defaults that won't break normal use (5 attempts / 15 min is reasonable);
  values are easy to tune since they are constants.
- Non-Goal: wiring into `loginAction`, IP extraction, or the Ukrainian message (task 10).

## Plan
- [x] Add `LOGIN_MAX_ATTEMPTS` + `LOGIN_WINDOW_SECONDS` to `lib/constants.ts`.
- [x] Write `lib/login-throttle.ts` (`LoginThrottleState`, `recordFailedAttempt`, `isThrottled`).
- [x] Write `lib/login-throttle.test.ts` (under / over / window-reset).
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] Added `LOGIN_MAX_ATTEMPTS` (5) + `LOGIN_WINDOW_SECONDS` (900) to `lib/constants.ts` with the
  per-instance MVP note.
- [x] Created pure `lib/login-throttle.ts` (`LoginThrottleState`, `LoginThrottleConfig`,
  `recordFailedAttempt`, `isThrottled`) — no I/O, non-mutating; `npm run typecheck` exits 0.
- [x] Wrote `lib/login-throttle.test.ts` (10 vitest cases: no-state, under-limit, at/over-limit,
  window-reset, non-mutation). `npm run typecheck` exits 0; `npm test` green (8 files / 91 tests,
  file count +1).

## Next
- [ ] None — Goal met. (Wiring into `loginAction` is task wave1-sec-10-wire-login-throttle.)

## Artifacts
- lib/constants.ts — LOGIN_MAX_ATTEMPTS / LOGIN_WINDOW_SECONDS
- lib/login-throttle.ts — pure throttle core
- lib/login-throttle.test.ts — unit tests
- tasks/wave1-sec-09-login-throttle-core/verify.sh — constants + pure core + behavior + typecheck/test

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: added LOGIN_MAX_ATTEMPTS=5 / LOGIN_WINDOW_SECONDS=900 to
  lib/constants.ts; created pure lib/login-throttle.ts (LoginThrottleState/LoginThrottleConfig,
  recordFailedAttempt, isThrottled — non-mutating, no I/O); `npm run typecheck` exits 0. Test file next.
- 2026-06-17T11:34Z ClPcs-Mac-mini: wrote lib/login-throttle.test.ts (vitest, `@/lib/login-throttle`
  alias import) — 10 cases covering no-state/under/at/over-limit, window-reset, and non-mutation of
  recordFailedAttempt. `npm run typecheck` exits 0; `npm test` green (8 files / 91 tests, file count
  +1 from 7). Goal met → Status: done.


## Verify
**Last verify:** PASS (2026-06-17T08:34:37Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:35:05Z)
