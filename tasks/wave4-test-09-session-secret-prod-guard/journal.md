# Task: wave4-test-09-session-secret-prod-guard

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
AUDIT Low (Security/session): `lib/auth.ts:secret()` silently falls back to
`"dev-only-insecure-secret"` when `SESSION_SECRET` is unset — in production that yields forgeable
cookies. Fix it the Wave-4 way: extract the secret-resolution into a PURE, unit-tested function that
THROWS in production when the secret is missing, and wire `lib/auth.ts` to it. Depends on task 08
confirming this item is still open. No schema change.

1. New PURE module `lib/session-secret.ts` exports `resolveSessionSecret(env)` taking an object with
   optional `SESSION_SECRET` and `NODE_ENV` (e.g. `Pick<NodeJS.ProcessEnv, "SESSION_SECRET" | "NODE_ENV">`
   or a `{ SESSION_SECRET?: string; NODE_ENV?: string }`), returning a `string`. It does NOT import
   `server-only`, `@/lib/db`, `@prisma/client`, or `lib/generated`, and does not read `process.env`
   itself (the env is the argument) — so it is unit-testable under the fast `npm test`.
2. Behavior: (a) if `env.SESSION_SECRET` is a non-empty string → return it; (b) else if
   `env.NODE_ENV === "production"` → THROW an `Error` whose message names `SESSION_SECRET`; (c) else →
   return the existing dev fallback string `"dev-only-insecure-secret"`.
3. `lib/auth.ts` `secret()` is rewired to `return resolveSessionSecret(process.env)` (importing from
   `@/lib/session-secret`) and no longer contains its own `?? "dev-only-insecure-secret"` fallback. The
   call stays INSIDE `secret()` (request-time), NOT at module top-level, so `next build` (NODE_ENV=
   production, secret possibly unset) does not throw at build time.
4. New unit test `lib/session-secret.test.ts` asserts all three branches: returns the provided secret;
   returns the dev fallback when unset and `NODE_ENV` is not production (e.g. `"development"`/`"test"`);
   THROWS when `SESSION_SECRET` is unset/empty and `NODE_ENV === "production"`.
5. `npm test` exits 0 and the run includes `lib/session-secret.test.ts` (verified via `npx vitest list`).
6. `npm run typecheck` exits 0 and `npm run build` exits 0 (build must not throw despite the new guard).

## Constraints / decisions
- Keep the dev fallback string EXACTLY `"dev-only-insecure-secret"` so existing dev cookies / the
  `scripts/mint-cookie.ts` default stay valid in dev. Wiring mint-cookie.ts to the new helper is a
  NON-GOAL (it's dev-only tooling); leave it.
- HIGH-STAKES (`Evaluate: yes`): a wrong implementation could (a) break `next build`/prod boot by
  throwing at the wrong time, or (b) fail to actually guard production. The evaluator checks both: the
  build still passes AND the throw-in-production branch is real and tested.
- Do NOT move the `resolveSessionSecret` call to module load / a top-level constant — it must be lazy
  (inside `secret()`), or build/static analysis paths could trip the throw.
- Purity-grep caution (per CLAUDE.md): do NOT write the literal tokens `server-only`/`@/lib/db`/
  `@prisma/client`/`lib/generated` in `lib/session-secret.ts` doc comments, or a purity gate false-fails.
- Non-Goal: changing the cookie scheme, HMAC, or the `secure` flag logic.

## Plan
- [x] Create `lib/session-secret.ts` with the pure `resolveSessionSecret(env)` (3 branches).
- [x] Rewire `lib/auth.ts:secret()` to call it; remove the inline `??` fallback.
- [x] Add `lib/session-secret.test.ts` (3 branch assertions).
- [x] `npm test` + `npm run typecheck` + `npm run build`; run verify.sh.

## Done
- [x] Created `lib/session-secret.ts`: pure `resolveSessionSecret(env)` with 3 branches
  (non-empty `SESSION_SECRET` → return it; else prod → throw naming `SESSION_SECRET`; else dev
  fallback `"dev-only-insecure-secret"`, exported as `DEV_FALLBACK_SECRET`). No non-pure imports,
  does not read `process.env` itself.
- [x] Rewired `lib/auth.ts:secret()` → `return resolveSessionSecret(process.env)` (imports from
  `@/lib/session-secret`); removed the inline `?? "dev-only-insecure-secret"` fallback. Call stays
  inside `secret()` (request-time), not at module top-level. `auth.ts` no longer contains the
  literal `dev-only-insecure-secret` (verify gate forbids it there).
- [x] Added `lib/session-secret.test.ts` (vitest, mirrors `lib/sanitize.test.ts` style) covering all
  three branches: returns provided `SESSION_SECRET` (dev + prod); returns `DEV_FALLBACK_SECRET` when
  unset for development/test/undefined `NODE_ENV` and for an empty-string secret outside prod;
  `toThrow(/SESSION_SECRET/)` when unset/empty in production. `npm test` 122 pass, file in `vitest list`,
  typecheck + build green, verify.sh exits 0.

## Next
- (none — goal met; verify.sh PASS)

## Artifacts
- lib/session-secret.ts — pure secret resolver (prod-guard).
- lib/session-secret.test.ts — unit test for the three branches.
- lib/auth.ts — `secret()` rewired to the helper.
- tasks/wave4-test-09-session-secret-prod-guard/verify.sh — pure/wiring/test/build gate.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: created pure `lib/session-secret.ts` —
  `resolveSessionSecret(env)` (3 branches) + `DEV_FALLBACK_SECRET` const; matched the
  `lib/sanitize.ts` pure-module doc-comment style; no non-pure imports, no `process.env` read.
- 2026-06-17T16:40Z ClPcs-Mac-mini: rewired `lib/auth.ts:secret()` to call
  `resolveSessionSecret(process.env)` (added `import { resolveSessionSecret } from "@/lib/session-secret"`);
  removed the inline `?? "dev-only-insecure-secret"` fallback so `auth.ts` no longer hardcodes the dev
  secret. Fixes prior verify FAIL ("lib/auth.ts does not call resolveSessionSecret").
- 2026-06-17T19:31Z ClPcs-Mac-mini: added `lib/session-secret.test.ts` (3 branches, mirrors
  `lib/sanitize.test.ts`). `npm test` → 122 pass; `npx vitest list` includes the file; `npm run
  typecheck` + `npm run build` clean; verify.sh exits 0 (PASS). Goal met → Status: done.



## Verify
**Last verify:** PASS (2026-06-17T16:31:52Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T16:32:37Z)
