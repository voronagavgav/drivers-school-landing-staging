# Task: wave12a-15-verify-wave12a

**Status:** done   <!-- LAN audit server relaunched; audit 19/0 green -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop
**Evaluate:** yes

## Goal
Spec §E (full-suite gate). The wave-closing verification: prove the whole app is green after the design-system
port, over the REAL http transport, with NO schema drift. This is the final gate for Wave 12a.

PASS = ALL true:

1. `npm run typecheck` exits 0.
2. `npm test` exits 0 with ZERO failures (includes the new `glass-tier` + `contrast` oracle tests).
3. `npm run db:seed` succeeds, then `npm run test:integration` exits 0 with ZERO failures.
4. `npm run build` exits 0.
5. NO schema diff this wave: `git diff --stat` shows no change to `prisma/schema.prisma` and NO new
   `prisma/migrations/` directory relative to the wave's base commit.
6. The LAN server is (re)started against the CURRENT build (STALE-SERVER trap: `next start` loads `.next`
   once at boot — kill any running `next-server` and relaunch `npm run start -- -H 0.0.0.0 -p 3100` after
   the fresh `next build`) BEFORE running the audit.
7. `npm run audit:browser` (against the NON-localhost origin, default `http://100.110.64.90:3100`) reports
   ALL assertions passed (`=== browser audit: N passed, 0 failed ===`), including the NEW tab-capsule +
   aria-current assertion and the preserved 2b runner-answers assertion.
8. The static no-`text-white`-on-green regression grep over `components/`+`app/` is clean.
9. `.lens` is shipped as a class but applied to ZERO elements (regression guard: `grep -rn 'className=.*lens'
   app components` returns nothing) — confirms the ≤2-lens budget held (0 lenses this wave).

## Constraints / decisions
- This task runs the REAL browser over the REAL origin (per CLAUDE.md, "verified" = a real browser over real
  http, never typecheck/build/curl alone). If the audit origin server is stale or down, RESTART it against
  the fresh build first — that is legitimate environment setup, not feature patching.
- If any assertion fails, this task stays `active` and the failure is recorded; do NOT mark the wave done on
  a red audit.
- Real refraction / corner-shape / GPU-glass verification is the INDEPENDENT post-wave step (e2b Chromium +
  hosted PSI) — out of scope for this gate (headless can't see it), but note it must be run before Danil
  sign-off.
- Non-Goal: fixing feature bugs found here belongs to the owning task (re-open it); this gate only verifies.

## Plan
- [x] typecheck + unit + build.
- [x] db:seed + integration.
- [x] Confirm no schema/migration diff.
- [x] Rebuild + restart LAN server; run `npm run audit:browser`; confirm 0 failed.
- [x] Static no-white-on-green + zero-lenses guards.

## Next
- [x] All gate items GREEN — Status: done. (Driver re-runs verify.sh to confirm.)

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02 ClPcs-Mac-mini: ran `npm run typecheck` (exit 0), `npm test` (38 files, 405 tests passed, 0 failed), `npm run build` (exit 0). Gate items 1,2,4 GREEN. Next: db:seed + integration.
- 2026-07-02 ClPcs-Mac-mini: verify FAILED again — but ONLY on the reachability precheck ("audit origin not reachable"); the audit itself had not run because no `next-server` was alive (the prior tick's relaunched server had exited between ticks). Root cause is NOT a feature regression: `.next` BUILD_ID was 09:56 (post-wave12a), HEAD 09:57 was journal-tick-only, working tree clean, and NO app/component/lib file was newer than the build. Fix (env setup): relaunched `npm run start -- -H 0.0.0.0 -p 3100` against the current build (pid 12479, Ready in 105ms), polled `/login` → HTTP 200. Re-ran `npm run audit:browser http://100.110.64.90:3100` → **19 passed, 0 failed** (incl. tab-capsule 5-target + aria-current + 2b answer-click). Server left running for the driver's verify.sh re-run. Status: done.
- 2026-07-02 ClPcs-Mac-mini: prior verify FAILED on browser audit (9 pass/10 fail). ROOT CAUSE = STALE-SERVER trap: running `next-server` (pid 29082) booted 03:38:47 but the fresh build was 09:49 and HEAD 09:52 — audit hit a ~6h-old build missing the wave12a tab-capsule/aria-current + admin routes. FIX (env setup, not feature patch): `npm run db:seed` (2322 official questions), `npm run test:integration` (24 files, 88 passed / 2 skipped / 0 failed → gate 3 GREEN), `npm run build`, killed stale server, relaunched `npm run start -- -H 0.0.0.0 -p 3100` against fresh build, then `npm run audit:browser` → **19 passed, 0 failed** (gates 6,7 GREEN incl. new tab-capsule + aria-current + preserved 2b answer-click). Static gates: no schema/migration drift, no white-on-green, 0 lenses applied (gates 5,8,9 GREEN). ALL 9 PASS conditions met → Status: done.



## Verify
**Last verify:** PASS (2026-07-02T07:01:00Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T07:04:36Z)
