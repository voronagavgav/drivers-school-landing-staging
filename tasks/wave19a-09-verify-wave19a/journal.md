# Task: wave19a-09-verify-wave19a

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-12
**Last compute:** laptop

WHOLE-WAVE ACCEPTANCE GATE. VERIFY-ONLY: write NO new feature code. Confirms both parts of the spec's boolean
acceptance are met end-to-end. On ANY failure: record it, set THIS task `blocked`, and REOPEN the responsible
upstream task (01–08) — do NOT patch feature code here (fixing a genuinely-broken OWN gate line per the CLAUDE.md
verify-hygiene traps is allowed and must be logged).

## Goal
PASS = ALL true:

1. `npm run -s typecheck` exits 0.
2. `npm run -s test` exits 0 with ZERO failures, AND `npx vitest list` (captured to a var, then grep) INCLUDES
   `lib/fsrs/reference-vectors.test.ts` (running, not skipped) AND `lib/calibration-metrics.test.ts`.
3. `npm run -s db:seed` exits 0, THEN `npm run -s test:integration` exits 0 with ZERO failures, AND
   `npx vitest list --config vitest.integration.config.ts` INCLUDES `lib/server/pass-outcome.integration.test.ts`.
4. `npm run -s build` exits 0.
5. FSRS-6 (Part 1): `FSRS_DEFAULT_WEIGHTS.length === 21` (tsx probe); the decay is read from `w20`, not a
   hardcoded `-0.5`; `scripts/gen-fsrs6-vectors.*` exists and names its FSRS-6 reference version; NO file under
   `lib/fsrs/*.ts` contains `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`/`Math.random`/`Date.now`/`new Date`.
6. Calibration (Part 2): `prisma migrate status` clean; `PassOutcome` table present in `prisma/dev.db`;
   `lib/calibration-metrics.ts` is pure (same token set as §5); `pass_outcome_captured` in `ANALYTICS_EVENTS`.
7. Browser smoke (served app, restarted against the CURRENT build per the stale-server trap): the admin
   `/admin/calibration` page (or the extended readiness-shadow) renders the 0-row empty state (Ukrainian
   «недостатньо даних» text present) for a content-manager, and an anonymous visitor to it is redirected to /login
   (RBAC). Driven via "$DRIVER_BROWSER_CMD". If the app cannot be served in the driver env, this criterion is
   satisfied by the wave19a-08 0-row render smoke + the RBAC pattern shared with the other admin pages — record
   which path was taken in the Log.

## Artifacts
- Verify-only task, no feature code produced. Gate-hardening edit: `tasks/wave19a-09-verify-wave19a/verify.sh`
  (`vitest_list(REQUIRED_TOKENS, …args)` retries the `npx vitest list` capture until every required token is
  present — fixes the discovery-order truncation the old `>50 lines` threshold missed — and all var-greps use
  SIGPIPE-proof herestrings since the 71KB listing exceeds the 64KB pipe buffer).
- Evidence logs: /tmp/tc.log, /tmp/unit.log, /tmp/seed.log,
  /tmp/integ.log, /tmp/build.log, /tmp/lan-server.log (this-run transient).
- Verified surfaces: lib/fsrs/constants.ts, lib/fsrs/retrievability.ts, scripts/gen-fsrs6-vectors.mjs,
  lib/calibration-metrics.ts, lib/constants.ts, prisma/dev.db (PassOutcome), app/admin/calibration/page.tsx.

## Constraints / decisions
- **Evaluate: yes** — final wave gate; an independent judge confirms the checks ran GREEN for real (oracle running,
  migration applied, integration green), not stubbed/skipped.
- STALE-SERVER TRAP (CLAUDE.md): if a long-lived `next start -H 0.0.0.0 -p 3100` is serving, a newly-added
  `/admin/calibration` route will 404 until the server is restarted against the fresh build. Restart it (kill the
  `npm run start`/`next-server` pair; relaunch) before the browser smoke; this is env setup, not feature code.
- The browser origin must be NON-localhost for cookie-class checks (per the REAL-TRANSPORT gate); the admin login
  uses the seeded `admin@drivers.school` / `Admin12345` creds.
- Do NOT weaken any check to make it pass. Do NOT edit `lib/fsrs/reference-vectors.test.ts` golden values (01's
  frozen oracle) or the calibration-metrics frozen oracles (05).

## Next
- [x] Run typecheck + unit (incl. oracle) + (db:seed then) integration + build; run the static FSRS-6/calibration
      greps; restart the LAN server and browser-smoke the admin calibration 0-row + RBAC.
- [x] Diagnose the verify FAIL ("calibration-metrics test not collected") and harden the flaky `npx vitest list`
      collection greps so the gate is deterministic.
- [x] Root-cause the RE-FLAKE: `>50 lines` threshold was insufficient (discovery-order truncation drops the later
      suite while clearing 50); rewrote `vitest_list()` to retry-until-required-tokens-present + converted all
      var-greps to SIGPIPE-proof herestrings (71KB listing > 64KB pipe buffer). Full `verify.sh` re-run = PASS.
- Wave gate GREEN end-to-end; nothing outstanding.

## Log
- 2026-07-12 ClPcs-Mac-mini: RE-FLAKE root-caused + fixed. The prior `>50 lines` retry threshold was NOT
  enough: `npx vitest list` prints in DISCOVERY order (reference-vectors ~line 139, calibration-metrics ~line
  172), so a mid-truncation at ~150 lines keeps ref but drops calib while still clearing 50 → false FAIL on the
  calib grep (exact signature of the 14:09:04Z FAIL). Rewrote `vitest_list()` to retry (5×) until every REQUIRED
  TOKEN is present (first arg = comma-list of tokens), so a genuinely-uncollected suite still fails downstream.
  Also found a SIGPIPE hazard: the unit listing is 70950 bytes > the 64KB macOS pipe buffer, so
  `echo "$LIST" | grep -q` can SIGPIPE(141) the writer → pipefail → `|| fail` fires falsely (observed exit 141);
  converted all three var-greps + the helper's internal grep to herestrings (`grep -q tok <<<"$var"`). `bash -n`
  clean; dry-ran the helper under real bash (read -ra parsed 2 toks, 631 lines, no SIGPIPE); ran the FULL
  `verify.sh` end-to-end → `PASS: wave19a-09 whole-wave acceptance gate` (typecheck+test+seed+integration+build
  all green, collection greps green). CLAUDE.md FLAKY-TRUNCATION bullet corrected. Status → done.
- 2026-07-12 ClPcs-Mac-mini: verify FAIL was a flaky `npx vitest list` truncation (see Verify). Confirmed the
  suite collects deterministically (3× isolation runs, 631 lines each, calibration-metrics present). Hardened
  verify.sh: `vitest_list()` retry helper re-runs the listing until complete (>50 lines) before the collection
  greps; wired both the unit (`LIST`) and integration (`ILIST`) captures through it. Dry-ran the helper (ref+calib
  OK), `bash -n` clean. Everything else in the gate is deterministic and was already GREEN. Status → done.
- 2026-07-07 laptop: planned.
- 2026-07-12 ClPcs-Mac-mini: ran the whole-wave acceptance gate — ALL 7 criteria GREEN.
  §1 `npm run -s typecheck` exit 0. §2 `npm run -s test` exit 0 (58 files, 631 passed);
  `npx vitest list` INCLUDES `lib/fsrs/reference-vectors.test.ts` AND `lib/calibration-metrics.test.ts`.
  §3 `npm run -s db:seed` exit 0 (2322 official questions), then `npm run -s test:integration` exit 0
  (61 files, 262 passed / 2 known exam-blueprint skips); integration `vitest list` INCLUDES
  `lib/server/pass-outcome.integration.test.ts`. §4 `npm run -s build` exit 0.
  §5 FSRS-6: `FSRS_DEFAULT_WEIGHTS.length===21` (tsx probe, import from `./lib/fsrs/constants`);
  `lib/fsrs/retrievability.ts:14` reads `W20 = FSRS_DEFAULT_WEIGHTS[20]` (not hardcoded -0.5);
  `scripts/gen-fsrs6-vectors.mjs` exists and names the pinned FSRS-6 ref (ts-fsrs@5.4.1 / py-fsrs 6.3.1);
  purity grep over `lib/fsrs/*.ts` for server-only/@/lib/db/@prisma/client/lib/generated/Math.random/Date.now/new Date = PURITY_OK.
  §6 Calibration: `prisma migrate status` = "Database schema is up to date!" (13 migrations); `PassOutcome`
  table present in prisma/dev.db; `lib/calibration-metrics.ts` purity OK; `pass_outcome_captured` in
  ANALYTICS_EVENTS (lib/constants.ts:243). §7 Browser smoke — REAL served-app path taken (not the
  wave19a-08 fallback): restarted `next start -H 0.0.0.0 -p 3100` against the fresh build, drove
  agent-browser over non-localhost origin http://100.110.64.90:3100 — anon `/admin/calibration` → redirected
  to `/login` (RBAC); admin (admin@drivers.school) → `/admin/calibration` renders «недостатньо даних» empty
  state (main.textContent match). Status → done.



## Verify
**Last verify:** PASS (2026-07-12T14:18:38Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T14:21:55Z)
