# Task: wave4-test-06-http-smoke-script

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Spec C: a documented `scripts/smoke.sh` HTTP e2e smoke that exercises core routes against the running
server, minting auth cookies via the existing `scripts/mint-cookie.ts`. It is NOT part of the verify
gate (so it never blocks the build); it prints `PASS`/`FAIL` and exits non-zero on failure.

1. New file `scripts/smoke.sh` exists and is executable (`chmod +x`), with a `#!/usr/bin/env bash` shebang
   and `set -euo pipefail`.
2. `bash -n scripts/smoke.sh` (syntax check) exits 0.
3. The script reads a base URL from `SMOKE_BASE_URL` (defaulting to `http://localhost:3000`) and mints
   session cookies by invoking `npx tsx scripts/mint-cookie.ts <email>` for the seeded users
   `user@drivers.school` (USER) and `admin@drivers.school` (ADMIN), setting them as the `ds_session`
   cookie on `curl` requests (matching the cookie name in `lib/auth.ts`).
4. It performs at least these three checks via `curl` (asserting HTTP status and/or body markers), and
   FAILS (non-zero exit, prints `FAIL`) if any does not hold:
   a. Authenticated as USER, `GET /dashboard` returns HTTP 200 AND the body contains a readiness marker
      (e.g. the Ukrainian readiness label text such as `Готовніст`/`готовніст`, or `readiness`).
   b. UNAUTHENTICATED `GET /admin` is guarded — it does NOT return a 200 admin page (a 3xx redirect to
      login, or any non-200, counts as guarded).
   c. Authenticated as a USER, `GET /admin` is blocked — same guarded assertion as (b) (a USER must not
      get the admin page).
5. On all checks passing the script prints `PASS` and exits 0; on any failure it prints `FAIL: <which>`
   and exits non-zero.
6. The script is self-documenting: a top comment explains it needs the dev/prod server running
   (`SMOKE_BASE_URL`), a seeded DB, and the SAME `SESSION_SECRET` the server uses (so minted cookies
   verify). It does NOT start a server itself unless trivially safe to (using an already-running one is
   the default).

## Constraints / decisions
- This script is explicitly OUTSIDE the verify gate (`specs/wave4-testing.md` C: "not part of the verify
  gate"). `verify.sh` for THIS task does STATIC checks only (existence, executable bit, `bash -n`,
  required tokens) — it must NOT require a running server, so the driver's gate stays deterministic.
- Reuse `scripts/mint-cookie.ts` verbatim (do not duplicate the HMAC logic). Use `curl -s -o` for body
  and `-w '%{http_code}'` (or `-I`) for status; allow redirects to be observed (do NOT pass `-L` for the
  guard checks, so a 3xx is visible).
- Do NOT add the smoke to `package.json` test scripts or to any other task's `verify.sh`.
- Non-Goal: testing every route, login via the real form, or asserting exact admin HTML — only the three
  guard/readiness markers above. README documentation is task 07.

## Plan
- [x] Write `scripts/smoke.sh`: base-url + cookie-mint helpers, the 3 checks, PASS/FAIL output.
- [x] `chmod +x scripts/smoke.sh`; `bash -n scripts/smoke.sh`; run verify.sh.

## Done
- [x] Authored executable `scripts/smoke.sh` (shebang + `set -euo pipefail`, top doc comment on
  prereqs). Reuses `scripts/mint-cookie.ts` for both seeded users; `SMOKE_BASE_URL` default
  `http://localhost:3000`; `http_get` helper (curl array args, no `-L`, `--max-time 15`, `000` on
  conn-refused). Three checks: (a) USER `/dashboard` 200 + `Готовніст` marker, (b) unauth `/admin`
  guarded (≠200), (c) USER `/admin` blocked (≠200). Prints `PASS`/`FAIL: <which>`, exits non-zero.
- [x] `chmod +x`, `bash -n` OK, task verify.sh PASS (exit 0). Sanity-checked mint-cookie mints a
  valid `ds_session` against the seeded DB.

## Next
- [ ] (none — goal met; task 07 documents this script in README.)

## Artifacts
- scripts/smoke.sh — HTTP e2e smoke (out of the verify gate).
- tasks/wave4-test-06-http-smoke-script/verify.sh — static checks on the smoke script.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17 16:20 UTC ClPcs-Mac-mini: wrote `scripts/smoke.sh` (executable), reusing
  `mint-cookie.ts` for the `ds_session` cookie; 3 HTTP checks (dashboard readiness + admin guards);
  PASS/FAIL output. Used a curl arg ARRAY for the optional `--cookie` (the inline
  `${cookie:+--cookie "ds_session=$cookie"}` collapses to one arg under word-splitting — broken).
  `bash -n` + task verify.sh both PASS; mint-cookie sanity-checked. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T16:21:49Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T16:23:00Z)
