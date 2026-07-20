# Task: wave16-16-verify-wave16

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-04T19:12Z
**Last compute:** ClPcs-Mac-mini

## Goal
Spec T6 — final wave gate. Run everything against the shipped default (no ENTITLEMENTS_ENABLED,
no APP_ORIGIN). PASS = ALL true:

1. `npx tsc --noEmit` (aka `npm run typecheck` if the script exists) exits 0.
2. `npm test` exits 0 (full unit suite).
3. `npm run db:seed` exits 0, then `npm run db:seed` AGAIN exits 0 (idempotence — upsert-by-key
   contract), then `npm run test:integration` exits 0 against the reseeded DB.
4. `npm run build` exits 0.
5. LAN server restarted on the fresh build, then `npm run audit:browser` exits 0 — with the flag
   unset this IS the "behaviorally identical on the audited flows" assertion (every pre-wave16
   audit assertion still green + the wave16-15 absence asserts).
6. Environment ships inert: no tracked file and no `.env`/`.env.local` on this machine sets
   `ENTITLEMENTS_ENABLED` or `APP_ORIGIN` (grep both git-tracked files and the local env files).
7. The never-gated contract file is present and collected:
   `lib/server/never-gated.integration.test.ts` exists, contains `NEVER-GATED-CONTRACT`, and
   appears in `npx vitest list --config vitest.integration.config.ts` output (captured to a var
   first — SIGPIPE house rule).
8. Oracle integrity: `shasum -a 256 -c tasks/wave16-04-entitlements-oracle/oracle.sha256` passes
   (the frozen entitlement oracle was never edited after freeze). Do NOT re-run earlier tasks'
   verify.sh wholesale — wave16-04's gate is point-in-time (red-against-stub) and re-running it
   would clobber the frozen hash. (Cross-task coupling rule applies to any red found here: a
   failure owned by another task's deliverable → mark THIS task blocked on it, don't fix in place.)
9. `## Findings` section added to this journal summarizing: suite counts, audit assertion tally,
   and an explicit statement of which env vars the wave introduced (ENTITLEMENTS_ENABLED,
   APP_ORIGIN) and their shipped-default state (both unset ⇒ inert / de-indexed).

## Constraints / decisions
- VERIFICATION ONLY: no feature code. Legitimate fixes here are limited to environment setup
  (server restart) and genuinely-impossible verify-gate repairs (documented in Log, per house
  rule) — anything else goes back to the owning task.
- Reseed clears AnalyticsEvent (house triage note) — run the seed BEFORE test:integration so the
  analytics-dashboard suite isn't crowded out by accumulated audit events.
- The stale-server trap WILL bite here (this wave added /pricing, /q, /sitemap.xml): kill the
  `next-server` tree and relaunch `npm run start -- -H 0.0.0.0 -p 3100` after the build, before
  the audit.
- Depends on: all of wave16-01..15 done.

## Next
- [x] Run the gate sequence in Goal order; on any red, triage ownership before touching anything.
- Wave gate is fully green — nothing left. (Driver re-runs verify.sh to confirm.)

## Findings
Wave-16 final gate — ALL green, run against the shipped default (no `ENTITLEMENTS_ENABLED`, no
`APP_ORIGIN`; no `.env`/`.env.local` on this machine sets either).

Suite counts:
- Typecheck (`npx tsc --noEmit`): exit 0.
- Unit (`npm test`): **55 files, 603 tests passed**, 0 failed.
- Seed idempotence: `npm run db:seed` ran twice, both exit 0 — upsert-by-key stable at **2322
  official questions / 65 topics** (skipped 2 within-section identical dups; deactivated 0
  absent-from-source; 0 questions with no correct option).
- Integration (`npm run test:integration`, reseeded DB): **49 files, 215 passed, 2 skipped**, 0
  failed. Includes `lib/server/never-gated.integration.test.ts` (NEVER-GATED-CONTRACT marker
  present; confirmed collected via `npx vitest list`).
- Build (`npm run build`): exit 0 — routes include the wave-16 additions `/pricing`, `/q/[key]`
  (dynamic), `/sitemap.xml` (static).

Audit assertion tally (`npm run audit:browser`, LAN server restarted on the fresh build first):
**81 passed, 0 failed, 1 skip** (serviceWorker unavailable on the insecure http LAN origin — the
by-design split; real SW asserts live in the localhost Playwright E2E). Wave-16 flag-OFF block all
green: `/pricing` renders the single 399 ₴ price / «Доступ до іспиту»; `/q/q_10_1` reachable
logged-out (HTTP 200) with correct-answer WITHHELD before a pick and revealed after `?v=1`; `/q`
emits meta-robots `noindex` (de-index gate closed); unknown `/q` key → 404; account exam-outcome
form offers «Склав»/«Не склав»; and flag-OFF inertness confirmed on /dashboard, /progress,
/mistakes (NO teaser copy, NO /pricing link). Every pre-wave16 assertion also still green.

Oracle integrity: `shasum -a 256 -c tasks/wave16-04-entitlements-oracle/oracle.sha256` → `OK`
(frozen entitlement oracle `lib/entitlements.test.ts` never edited after freeze; wave16-04's
point-in-time red-against-stub gate was NOT re-run).

Env vars introduced by the wave: **`ENTITLEMENTS_ENABLED`** (gates all entitlement/paywall
behavior) and **`APP_ORIGIN`** (used to build absolute URLs for sitemap/SEO). Shipped default =
**both unset ⇒ inert**: entitlement gating is off (every feature stays free/never-gated, /pricing is
interest-capture only, no upsell teasers), and `/q` ships `noindex` / de-indexed. Behaviorally
identical to pre-wave16 on all audited flows, which is exactly what the flag-OFF audit asserts.

## Artifacts
- tasks/wave16-16-verify-wave16/journal.md — Findings summary (this section)
- /tmp/ds-browser-audit/audit-20260704-191038.log — full 81-assertion audit log

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T19:12Z ClPcs-Mac-mini: ran the full wave-16 gate sequence in Goal order. Fast gates
  (env inertness, never-gated contract file+marker, frozen oracle sha256) green first. Typecheck 0;
  unit 55f/603t; stopped the LAN next-server (pid 3189, held dev.db WAL lock) before seeding; seed×2
  idempotent (2322q/65t); integration 49f/215p/2skip; build 0. Relaunched `npm run start -- -H
  0.0.0.0 -p 3100` on the fresh build (no EADDRINUSE, /pricing→307 confirms new build), then
  audit:browser 81 passed / 0 failed / 1 expected SW skip. All 8 gates + Findings section done →
  Status: done.

## Verify
**Last verify:** PASS (2026-07-04T16:20:59Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T16:28:43Z)
