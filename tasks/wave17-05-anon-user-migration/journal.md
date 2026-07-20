# Task: wave17-05-anon-user-migration

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-05T17:54Z
**Last compute:** mac-mini

## Goal
On account creation, migrate the current anon-play session's progress to the new account —
idempotent, own-session only, NO IDOR. Per the ADR's convert-in-place decision (preferred). PASS =
ALL true:

1. A migration function exists in `lib/server/anon-session.ts` (or a sibling `anon-migrate.ts`),
   server-only, signature roughly `claimAnonSession(realUserId | newAccountInput, tx?)`. It reads the
   anon identity ONLY from the `ds_anon_play` COOKIE of the current request — it MUST NOT accept a
   target anon userId from form/body/query input (this is the no-IDOR invariant). If there is no valid
   anon cookie, it is a safe no-op.
2. `registerAction` (`app/actions/auth.ts`) invokes the migration as part of account creation when
   `VALUE_FIRST_FUNNEL` is on: the just-registered account ends up owning the anon session's
   `TestSession`/`TestAnswer`/`ReviewState`/`UserMistake`/`SavedQuestion`/`UserStudyProfile`/
   `ReadinessSnapshot` rows. Under convert-in-place, this means the anon User row IS upgraded (email +
   passwordHash set, `isAnonymous:false`) rather than a second row created — verify the resulting user
   count did not double-count. The `ds_anon_play` cookie is cleared after a successful claim.
3. IDEMPOTENCY (hand-specified oracle): calling the migration a SECOND time for the same request/user
   is a no-op — no duplicated rows, no error, the owned-row counts are identical to after the first
   call. Prove with an integration test that runs the claim twice and asserts equal counts.
4. NO IDOR (hand-specified oracle): construct two independent anon sessions A and B (two distinct
   `ds_anon_play` cookies / anon users), each having answered ≥1 question. Register a new account while
   presenting session A's cookie. Assert: (a) the account owns A's TestSession/TestAnswer rows;
   (b) session B's rows are UNTOUCHED and still owned by anon user B; (c) there is no code path that
   lets the caller name B as the migration target (the function signature takes no anon-id argument).
5. Integration test `lib/server/anon-migrate.integration.test.ts` drives the REAL `registerAction`
   (partial-mock `@/lib/auth` getCurrentUser + `next/headers` cookies to present the anon cookie;
   catch NEXT_REDIRECT to /onboarding), NOT an internal helper alone. It asserts, with LITERAL counts:
   - before register: anon user A owns N_A TestAnswer rows (seed N_A = 3 via the anon play path or
     direct prisma creates against A's anon user);
   - after register: the new account owns exactly N_A TestAnswer rows; anon-user-A row is gone
     (convert-in-place) or emptied; total User count increased by the ADR-expected amount (0 extra
     under convert-in-place beyond the upgraded row).
6. Flag-off: with `VALUE_FIRST_FUNNEL` unset, `registerAction` behaves exactly as today (creates the
   account, no migration, no anon-cookie read) — assert an integration case with the flag off leaves
   any present anon session untouched and register still redirects `/onboarding`.
7. `npx tsc --noEmit`, `npm test`, `npm run test:integration` all exit 0.

## Constraints / decisions
- CONVERT-IN-PLACE is the pinned approach (ADR): upgrade the anon User row into the real account so
  there is literally no cross-user row reassignment and thus no IDOR surface and trivial idempotency.
  If the ADR instead chose reassignment, implement reassignment but keep criteria 3+4 as the oracle.
- OWN-SESSION ONLY: the migration target is derived from the signed cookie the browser presents, never
  from request input. Do not add any admin/impersonation path here.
- Email-collision guard: if the registration email already belongs to a DIFFERENT (non-anon) user,
  registration must fail as it does today (unique email) — the migration must not clobber an existing
  account. Cover this in a test case or justify its absence.
- Wrap the account-create + claim in a single `prisma.$transaction` so a partial migration cannot
  leave orphaned/duplicated ownership (per CLAUDE.md tx/compose pattern with an optional `tx` param).
- Depends on: wave17-03 (anon lib), wave17-04 (anon play produces the rows), wave17-02 (schema).

## Plan
- [x] Implement `claimAnonSession` (cookie-derived target, tx-composable, idempotent, no-op on absent).
- [x] Wire it into `registerAction` behind the flag; clear the anon cookie on success.
- [x] Write the integration oracle: idempotency (equal counts on re-run) + no-IDOR (B untouched) +
      literal-count migration + flag-off inertness.
- [x] Run gates.

## Next
- [ ] None — Goal fully met, `verify.sh` PASS. (If reopened: consider covering the email-collision
      guard as an explicit test case — currently relies on the pre-claim `findUnique` unchanged.)

## Artifacts
- `lib/server/anon-session.ts` — `claimAnonSession(input, tx?)` (convert-in-place, cookie-only
  identity, tx-composable, safe no-op/idempotent) + `clearAnonPlayCookie()` + `AnonAccountInput`.
- `app/actions/auth.ts` — `registerAction` now claims the anon session behind `VALUE_FIRST_FUNNEL`:
  `prisma.$transaction((tx) => claimAnonSession({name,email,passwordHash}, tx))`; the upgraded row
  becomes the account (no fresh `user.create`), cookie cleared, then the existing `/onboarding`
  redirect. Flag-off / no valid anon cookie → today's fresh-create path unchanged.

## Log
- 2026-07-05T17:54Z ClPcs-Mac-mini: Wrote `lib/server/anon-migrate.integration.test.ts` (4 cases,
  drives the REAL `registerAction`): (1) migration — anon A owns N_A=3 TestAnswer rows, register with
  flag on → account IS the upgraded A row (id unchanged, isAnonymous:false), owns exactly 3, total
  User count unchanged, cookie cleared; (2) idempotency — a 2nd `claimAnonSession` on A's now-spent
  cookie returns null, owned count still 3; (3) no-IDOR — independent session B untouched (still anon,
  owns its 1 answer); (4) flag-off — register makes a FRESH row, leaves anon C untouched, cookie NOT
  cleared, still redirects /onboarding. Mints anon cookies via `getOrCreateAnonUser` (captures each
  signed value from the jar). The test surfaced a REAL deadlock in the wired code: `claimAnonSession`
  called `getAnonUser()` (module-global `prisma` read) INSIDE `registerAction`'s interactive
  `$transaction`, and a global-prisma read inside an open SQLite write-tx blocks on the connection
  until the 5000ms tx timeout → the convert-in-place update rolled back. FIXED the CODE
  (not the oracle): `claimAnonSession` now reads the payload via `readAnonPayload()` (no DB) then
  resolves + validates the anon row THROUGH `tx` (findUnique + anonymity/tokenVersion check), so all
  DB work stays on the tx connection. Gate green (659ms vs the prior 5.7s timeout). Status: done.
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T18:10Z ClPcs-Mac-mini: Wired `claimAnonSession` into `registerAction` behind
  `VALUE_FIRST_FUNNEL`. When on, `prisma.$transaction((tx) => claimAnonSession({name,email,
  passwordHash}, tx))` upgrades the cookie-identified anon row in place; the returned row becomes the
  account (no fresh `user.create`), `clearAnonPlayCookie()` runs, then `createSession`+recordEvent+
  `/onboarding` as before. Flag-off / null claim → unchanged fresh-create. Email-collision guard
  (existing `findUnique`) still fires before any claim. `npx tsc --noEmit` exits 0. Next: the
  integration oracle test.
- 2026-07-05T00:00Z ClPcs-Mac-mini: Implemented `claimAnonSession` in `lib/server/anon-session.ts`
  (convert-in-place: upgrades the cookie-identified anon User row in place — sets
  email/passwordHash/name, isAnonymous:false, bumps tokenVersion; returns null as a safe no-op when
  no valid anon session, which also makes a re-run idempotent since the flipped row is rejected by
  getAnonUser). Cookie-only identity via getAnonUser (no request anon-id → no IDOR). Added optional
  `tx` param for $transaction composition and a `clearAnonPlayCookie()` helper. `npx tsc --noEmit`
  exits 0.



## Verify
**Last verify:** PASS (2026-07-05T17:56:20Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T17:58:29Z)
