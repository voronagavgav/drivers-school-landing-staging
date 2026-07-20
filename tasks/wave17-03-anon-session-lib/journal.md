# Task: wave17-03-anon-session-lib

**Status:** done
**Driver:** auto
**Updated:** 2026-07-05T18:31Z
**Last compute:** mac-mini

## Goal
Implement the anon-session server library that mints/reads a cookie-scoped anonymous User and resolves
an "effective" (real-OR-anon) user. NO wiring into layout/actions yet (that's wave17-04). PASS = ALL
true:

1. `lib/server/anon-session.ts` (`import "server-only"`) exports:
   a. `getOrCreateAnonUser(): Promise<SessionUser>` — reads the `ds_anon_play` cookie; if present +
      valid + resolves to an existing `isAnonymous:true` user, returns it; else mints a NEW anon User
      row (`isAnonymous:true`, NO email/passwordHash real PII per ADR) and sets the cookie. Cookie
      uses the ADR's scheme (HMAC-signed via `lib/auth` helpers OR opaque DB token), httpOnly,
      `secure` iff `COOKIE_SECURE==="true"`, ADR maxAge.
   b. `getAnonUser(): Promise<SessionUser | null>` — read-only; returns the anon user for the current
      cookie or null (never mints, never sets a cookie).
   c. `requirePlayableUser(): Promise<SessionUser>` — returns the real user if `getCurrentUser()` is
      non-null; else, IF `isValueFirstFunnelEnabled()`, returns `getOrCreateAnonUser()`; else falls
      back to `requireUser()` (redirect `/login`). This is the single resolver wave17-04 will adopt.
   d. `getAnonPlayCookieName(): string` returning `"ds_anon_play"` (or the ADR name) — so tests/audit
      bind to one source of truth.
2. The anon cookie name is DISTINCT from `ds_session` and from the analytics `ds_anon` (assert with a
   grep that all three strings differ).
3. Integration test `lib/server/anon-session.integration.test.ts` (drives the REAL exports; stub
   `next/headers` cookies() per house pattern; `vi.stubEnv("VALUE_FIRST_FUNNEL","true")`):
   a. First `getOrCreateAnonUser()` with no cookie → creates exactly ONE `isAnonymous:true` User AND
      the returned user has `email == null` (or the ADR sentinel) and no usable passwordHash.
   b. Calling `getOrCreateAnonUser()` AGAIN with the cookie it set → returns the SAME userId, creates
      NO second row (idempotent mint).
   c. With the flag OFF (`vi.stubEnv("VALUE_FIRST_FUNNEL","")`) and no `ds_session`,
      `requirePlayableUser()` REDIRECTS (throws NEXT_REDIRECT) — anon play is flag-gated.
   d. With a real logged-in user mocked (`getCurrentUser` returns a USER), `requirePlayableUser()`
      returns that real user and mints NO anon row (flag ON or OFF).
   e. Cleanup deletes the created anon User(s) (cascade its sessions) so the suite is repeatable.
4. `lib/server/anon-session.ts` does NOT import `@/lib/rbac` in a way that would taint a client bundle
   (it is server-only; fine) and does NOT expose any function letting a caller pass a target anon-id
   from request input (no IDOR handle here).
5. `npx tsc --noEmit`, `npm test`, `npm run test:integration` all exit 0.

## Constraints / decisions
- Anon user carries NO PII: no real email, no password. Per ADR, a placeholder email may be null or a
  non-routable sentinel — follow the ADR exactly.
- `requirePlayableUser()` MUST preserve flag-off behavior: identical to `requireUser()` when the flag
  is off and no session — this is the safety net keeping today's gate intact.
- Do NOT modify `app/(app)/layout.tsx` or `app/actions/test.ts` here — this task only ADDS the library
  + its test. Wiring is wave17-04.
- Depends on: wave17-01 (ADR), wave17-02 (schema `isAnonymous`, flag reader).

## Plan
- [x] Read ADR cookie/identity + unblock sections.
- [x] Implement `lib/server/anon-session.ts` (mint/read/resolve + cookie helpers).
- [x] Write the integration test (idempotent mint, flag-gate, real-user passthrough, no-PII).
- [x] Run gates.

## Next
- Goal fully met; no further increments. Downstream wave17-04 adopts `requirePlayableUser()`.

## Artifacts
- `lib/server/anon-session.ts` — server-only anon-session lib: `getAnonPlayCookieName`,
  `getAnonUser`, `getOrCreateAnonUser`, `requirePlayableUser`. HMAC-signed `ds_anon_play` cookie
  (reuses the ds_session sign/verify family via `resolveSessionSecret`), no-PII anon `User` mint.
- `lib/server/anon-session.integration.test.ts` — 4 cases: no-PII one-row mint + cookie set,
  idempotent re-mint, flag-off redirect, real-user passthrough (flag on & off) minting no anon row.

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T18:31Z ClPcs-Mac-mini: implemented `lib/server/anon-session.ts` per ADR (Cookie &
  identity / Unblock strategy) — local sign/unsign mirroring lib/auth's HMAC scheme, `ds_anon_play`
  cookie distinct from `ds_session`/`ds_anon`, anon `User` mint with placeholder name «Гість» + null
  email/passwordHash, `requirePlayableUser()` real→anon(flag on)→requireUser() fallback. No caller
  can pass a target anon-id (cookie-only identity, no IDOR). Wrote the integration test (jar mock +
  partial-mock getCurrentUser, house pattern). tsc/npm test (608)/test:integration (220) all 0;
  verify.sh → PASS. Status: done.

## Verify
**Last verify:** PASS (2026-07-05T15:32:10Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T15:34:12Z)
