# Task: wave18-08-verify-wave18

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-06T10:52Z
**Last compute:** mac-mini

## Goal
Spec wave18 T8 — final wave verification. Runs AFTER wave18-01…07 are done. Confirms the whole wave is
green over real gates and that the value-first invariants hold. PASS = ALL true:

1. `npx tsc --noEmit` exits 0.
2. `npm test` (full unit suite, incl. the new `lib/segment.test.ts`) exits 0.
3. `npm run test:integration` (full integration suite, incl. the new result-anon / test-page-no-mint /
   activation-aha / pricing-guard / segment-actions tests + the hardened checkout suite) exits 0.
4. `npm run guard:funnel` exits 0 (HARD-DO-NOT funnel-surface gate still clean).
5. `npm run db:seed` exits 0 (seed = official import; re-runnable). [If a schema migration were added
   it would need the LAN server stopped first — this wave is additive/logic-only with NO migration, so
   the seed runs clean; confirm no new `prisma/migrations/*` dir was introduced.]
6. `npm run build` (`next build --webpack`) exits 0.
7. `npm run audit:browser` (real-transport, non-localhost origin) exits 0 with its summary line — the
   /result, /test/[id], and /pricing route changes need real-transport verification. BEFORE running:
   the long-lived `next start -H 0.0.0.0 -p 3100` server must be RESTARTED against the fresh build from
   criterion 6 (stale-server trap: `next start` loads `.next` once at boot; a route/render change in
   this wave is invisible until relaunch). Diagnose staleness by comparing server pid start time vs the
   build; kill the `npm run start`/`next-server` tree and relaunch, then run the audit.
   - The audit's existing /pricing assertions (logged-IN user sees the card) must still pass with the
     new explicit `requireUser()` guard (wave18-04) — a real authed session is unaffected.
   - If the audit has an assertion/comment asserting anon `/result` bounces to /login (it referenced
     "/result uses requireUser()", ~L773), reconcile it with wave18-01: flag-ON an anon now sees their
     OWN result. Update the audit assertion to match the new correct behaviour (anon → own result
     renders; dial/offer still absent for anon), NOT weaken a real check. Record the edit in the Log.
8. FLAG-OFF INERTNESS (byte-identical property): with `VALUE_FIRST_FUNNEL` unset, `/result`, `/test/[id]`
   and `/pricing` behave exactly as before this wave — anon → /login on all three; no anon row minted by
   any page render. Assert via the flag-OFF audit branch (bin/browser-audit.sh runs the disjoint
   bounce-regression when the server flag is OFF) OR a documented curl check (`≠200`/redirect for an
   anon GET). Record which was used.

## Constraints / decisions
- This is a VERIFY task — it does not implement features. If a gate fails on an upstream task's
  deliverable (different FILE than any wave18 change could affect), mark THIS task `blocked` on that
  task rather than patching in place (cross-task verify-coupling learning).
- Legitimate environment setup allowed: restarting the LAN `next start` server against the fresh build,
  reseeding to clear accumulated AnalyticsEvent rows before triaging a top-paths/funnel-count test —
  these are env setup, NOT feature-code patching.
- Reconciling a stale browser-audit assertion to the NEW correct behaviour (wave18-01 anon /result) is
  legitimate; weakening an assertion to hide a real regression is NOT — document every audit edit.
- No new migration expected this wave (additive/logic + tests only). If one somehow exists, stop the
  LAN server before `db:seed`/deploy per the lock-trap learning.

## Next
- [x] Run tsc → unit → integration → guard:funnel → db:seed → build; restart the LAN server; run
      audit:browser; reconcile any stale /result anon assertion; record flag-OFF inertness evidence.
- [x] FIX verify FAIL: the prior tick's criterion-7 browser audits left TestAnswer rows in dev.db that
      crowded the analytics-dashboard fixture out of top-N mostMistaken → test:integration flaked red
      (zero code cause). Reseeded; reordered verify.sh so `db:seed` runs BEFORE `test:integration`
      (accumulation flakiness is now self-healing). Full verify.sh re-run green.
- Wave18 verification COMPLETE — all 8 criteria green; verify.sh gate deterministic against accumulation.

## Artifacts
- tasks/wave18-08-verify-wave18/verify.sh — `db:seed` reordered ahead of `test:integration` so
  accumulated browser-audit rows can't flake the analytics-dashboard integration test.
- bin/browser-audit.sh (~L773) — stale doc-comment reconciled to wave18-01 anon-/result behaviour.
- Audit logs: /tmp/ds-browser-audit/audit-20260706-103717.log (flag-ON 98/0),
  audit-20260706-104301.log (flag-OFF 82/0).

## Log
- 2026-07-06 mac-mini: planned from specs/wave18-funnel-fixes.md T8.
- 2026-07-06T10:45Z ClPcs-Mac-mini: ran all 8 gates green (tsc/unit/integration/guard:funnel/db:seed/
  build). Confirmed no wave18 migration. Diagnosed the LAN :3100 server as STALE (pid 50645 started
  Jul 5 21:44, build finished Jul 6 10:35) — killed the npm-start/next-server tree and relaunched
  against the fresh build twice: VALUE_FIRST_FUNNEL=true → audit 98/0; flag-OFF → audit 82/0.
  Reconciled the stale audit doc-comment at bin/browser-audit.sh ~L773 ("/result uses requireUser()
  (anon → /login)") to the wave18-01 behaviour (anon views own /result payoff; dial/offer stay gated,
  anon dial=null → no offer) — comment only, no live assertion changed. Left the LAN server running
  flag-OFF (shipped default). Status: done.
- 2026-07-06T10:52Z ClPcs-Mac-mini: verify FAIL triage. analytics-dashboard.integration.test.ts
  `hotMistaken` was undefined — my own criterion-7 browser audits (98/0, 82/0) had driven real exam
  answers into dev.db, and those many-wrong TestAnswer rows pushed the fixture's single-wrong hot
  question out of the top-N mostMistaken list (same accumulation class as the topPaths TRIAGE
  learning). `npm run db:seed` clears them → the test passes standalone (7/7). Root ordering flaw:
  verify.sh ran `test:integration` BEFORE `db:seed`, so accumulated audit rows always poison the
  integration suite. Reordered `db:seed` ahead of `test:integration` in verify.sh (legit env-setup
  edit, no check weakened — documented). Re-ran full verify.sh: tsc/unit/db:seed/integration/
  guard:funnel/build all green. Status: done.


## Verify
**Last verify:** PASS (2026-07-06T07:53:39Z)

## Evaluation
**Last evaluation:** PASS (2026-07-06T07:55:59Z)
