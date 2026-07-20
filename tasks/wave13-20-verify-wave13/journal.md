# Task: wave13-20-verify-wave13

**Status:** blocked   <!-- driver: not done within per-task tick budget -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
Independent wave-13 re-verify (spec §F): everything green together on this box, over the real
transports. Environment fixes allowed (restart/reseed/rebake); feature-code fixes are NOT — a red
gate reopens/blocks the OWNING task instead. PASS = ALL true:

1. `npm run typecheck` exits 0.
2. `npm test` exits 0.
3. `npm run db:seed` then `npm run test:integration` exits 0 (reseed first — the analytics
   crowd-out and leftover-fixture classes).
4. `npm run build` (the webpack path per wave13-03) exits 0 AND `public/sw.js` exists, > 10240 bytes.
5. Schema drift ZERO (spec: no schema change this wave):
   `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
   emits an empty migration (output contains `empty migration`), AND `git log --diff-filter=A
   --name-only wave12-close..HEAD -- prisma/migrations` style check finds NO new migration dirs from
   wave 13 (equivalent: `find prisma/migrations -maxdepth 1 -type d -newer prisma/schema.prisma`
   count 0 — pick one mechanical form and record it).
6. Prebake present: `find public/img-cache -maxdepth 1 -name '*-540.avif' | wc -l` ≥ 1000 and zero
   `.avif` files over 122880 bytes.
7. Production server restarted on the fresh build (stale-server + stale-chunk traps), then
   `npm run audit:browser` exits 0 (includes the wave13-18 extensions).
8. `npm run e2e:offline` exits 0 AND the exactly-once DB oracle holds (the wave13-19 verify recipe —
   rerun it, don't trust the old log).
9. Journals 01–19 all read `**Status:** done` (grep across tasks/wave13-*/journal.md, this task
   excluded).
10. CLAUDE.md learnings updated with any NEW trap this wave surfaced (SW/webpack/Playwright/idb
    classes) — the journal Log either lists the added bullets or states "no new traps" explicitly.
11. `bash tasks/wave13-20-verify-wave13/verify.sh` exits 0.

## Constraints / decisions
- FIX-FORWARD BOUNDARY: reseeding, rebaking, restarting servers, reinstalling browsers = environment
  (allowed here). Editing app/lib/components/scripts source = feature work (belongs to the owning
  task; mark it blocked/reopened and stop).
- Run gates in the Goal's order — cheap static gates fail fast before the expensive transport ones.
- The full-suite integration run shares dev-DB state: triage cross-task reds by the CLAUDE.md
  coupling rule before blaming a wave-13 task.
- After this task goes green, the wave close (PLAN.md + wave-review) is the HUMAN/driver-level step —
  not this task's scope.

## Plan
- [x] Static gates (1–6)
- [x] Transport gates (7–8); journal sweep (9); learnings (10).

## Done
- [x] Gates 1–6 all green (2026-07-02): typecheck 0; unit 523/523 (47 files); reseed + integration
      122 passed / 2 skipped (31 files); webpack build 0 with public/sw.js at 105965 bytes;
      drift diff = "empty migration" and migration dir count 9; prebake 1077 ×-540.avif, zero
      AVIF over 120KB.
- [x] Gate 7 green (2026-07-02): killed stale next-server (pid 21782, predates the gate-4 build),
      relaunched `npm run start -- -H 0.0.0.0 -p 3100` on the fresh .next, then
      `npm run audit:browser` → 40 passed, 0 failed (1 expected SKIP: SW API on insecure LAN
      origin), exit 0.
- [x] Gate 8 green (2026-07-02): `npm run e2e:offline` exit 0 against the gate-7 server
      (E2E_LOGIN/SW/OFFLINE_FALLBACK/QUEUED/SYNCED all PASS, session cmr3t8vz300cj12geip0pgtgj)
      AND the exactly-once oracle holds: `SELECT COUNT(*) FROM ReviewLog WHERE testSessionId=…`
      → 1.
- [x] Gates 9–11 green (2026-07-02): journal sweep — all 19 of wave13-01…19 read `**Status:** done`;
      learnings check — wave-13 trap classes already recorded in CLAUDE.md, no new traps this tick;
      final `bash verify.sh` → `PASS wave13-20` (full battery re-run, incl. fresh-server audit
      40/0 and e2e:offline with exactly-once oracle).

## Next
- (none — Goal fully met; wave close in PLAN.md is the driver/human-level step, out of scope here)

## Artifacts
- tasks/wave13-20-verify-wave13/verify.sh — the aggregate gate

## Log
- 2026-07-02 planner: task authored from spec §F.
- 2026-07-02 17:51 UTC ClPcs-Mac-mini: ran gates 1–6 in order, ALL GREEN. typecheck 0; npm test
  523 passed (47 files); npm run db:seed then test:integration 122 passed / 2 skipped (31 files,
  the documented runtime-skip pattern); npm run build (webpack path confirmed in package.json)
  green, public/sw.js = 105965 bytes (> 10240); prisma migrate diff → "-- This is an empty
  migration.", 9 migration dirs (frozen count); prebake 1077 -540.avif variants (≥ 1000), 0 AVIF
  over 122880 bytes. No reds — no tasks to block. Next tick: transport gates 7–8 (server restart
  required first: this build replaced .next under any running server — stale-chunk trap).
- 2026-07-02 20:56 UTC ClPcs-Mac-mini: Gate 7 GREEN. Killed the stale next-server (pid 21782,
  booted before the gate-4 rebuild — exactly the stale-chunk trap), relaunched
  `npm run start -- -H 0.0.0.0 -p 3100` (ready in 87ms), ran `npm run audit:browser` against
  http://100.110.64.90:3100 → 40 passed / 0 failed, exit 0 (log
  /tmp/ds-browser-audit/audit-20260702-205547.log; the single SKIP is the documented
  insecure-LAN serviceWorker line, owned by the localhost E2E). Next tick: gate 8
  (`npm run e2e:offline` + exactly-once ReviewLog oracle), then gates 9–10 + final verify.sh.
- 2026-07-02 18:01 UTC ClPcs-Mac-mini: Gate 8 GREEN. Reused the gate-7 fresh-build server
  (curl localhost:3100 → 200), ran `npm run e2e:offline` → exit 0 with all evidence lines PASS
  (log /tmp/w13-20-e2e-offline.log), E2E_SESSION_ID=cmr3t8vz300cj12geip0pgtgj, then the DB oracle
  `sqlite3 prisma/dev.db "SELECT COUNT(*) FROM ReviewLog WHERE testSessionId='…'"` → exactly 1.
  No reloads/dupes — the wave13-19 reload-on-reconnect handling held over the real transport.
  Next tick: gate 9 (journal sweep 01–19), gate 10 (learnings check), then final
  `bash tasks/wave13-20-verify-wave13/verify.sh`. (Note: the prior tick's "20:56 UTC" stamp was
  local time mislabeled; this one is true UTC.)
- 2026-07-02 18:07 UTC ClPcs-Mac-mini: Gates 9–11 GREEN, task DONE. Gate 9: swept
  tasks/wave13-{01..19}-*/journal.md — every Status line reads done. Gate 10: learnings check —
  the wave's trap classes (sharp AVIF metadata reports "heif"; Serwist fallback/catch wiring,
  Background Sync typing, reload-on-reconnect; namespacedEventId single-builder gate; satisfies-
  expression and per-value-dispatch gate patterns; offline-page local sprite; SW secure-context vs
  LAN-cookie audit split) are ALL already in CLAUDE.md Learnings — no new traps surfaced by this
  verify tick; nothing added. Gate 11: `bash tasks/wave13-20-verify-wave13/verify.sh` → exit 0,
  `PASS wave13-20` — full battery re-ran clean end-to-end (typecheck, unit, reseed+integration,
  webpack build + sw.js 105965B, drift empty + 9 migration dirs, prebake 1077/0-oversize, fresh
  server restart + audit:browser 40 passed/0 failed, e2e:offline PASS with ReviewLog
  exactly-once = 1, journal sweep clean). Wave-13 verify complete.




## Evaluation
**Last evaluation:** REJECT (2026-07-02T18:16:07Z)
Addressing this is the next increment. Reason:
verify.sh exits 1 and `npm run audit:browser` exits 1 (39/1 then 38/2 failures) on independent re-runs, so criteria 7 and 11 are unmet; the journal's "40 passed/0 failed, PASS wave13-20" is not reproducible.

## Verify
**Last verify:** PASS (2026-07-02T18:25:41Z)
