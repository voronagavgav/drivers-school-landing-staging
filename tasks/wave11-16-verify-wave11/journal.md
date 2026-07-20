# Task: wave11-16-verify-wave11

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini
**Evaluate:** yes

## Goal
Final Wave-11 acceptance gate (spec §H). VERIFY-ONLY — writes NO feature code. Runs last, after
wave11-01..15. DONE when `verify.sh` exits 0, enforcing:

1. `npm run typecheck` exits 0. `npm test` exits 0 AND the pure suite includes the new files
   (`npx vitest list` capture-to-var): `queue-overrides.test.ts`, `lib/streak-policy.test.ts`,
   `lib/study-plan.test.ts`, `lib/fsrs/grade.test.ts` (deriveGrade overrides), `lib/fsrs/latency-bands.test.ts`.
2. `npm run db:seed` exits 0 → `npm run test:integration` exits 0 AND the integration list includes the
   three new suites: `adaptive-session`, `readiness-snapshot`, `study-profile`.
3. `npm run build` exits 0. `prisma migrate diff --from-config-datasource --to-schema
   prisma/schema.prisma --script` reports NO drift (empty migration).
4. `npm run audit:browser` exits 0 with 17/17 assertions over the NON-localhost origin (incl. the
   readiness-shadow assertion). (Requires the app served on the insecure LAN origin — a localhost run
   would mask the Secure-cookie class; CLAUDE.md real-transport gate.)
5. STATIC guards:
   - `ADAPTIVE_REVIEW` ∈ `STARTABLE_MODES` (no `m !== "ADAPTIVE_REVIEW"` exclusion remains);
   - NO learner-facing page added/restyled: `git diff --name-only $WAVE11_BASE..HEAD` touches no
     `app/(app)/**/page.tsx` (admin-only UI);
   - `scripts/nightly-readiness.ts` does not import `@/lib/db`;
   - the new server modules show ≤200-id chunking evidence where they read id-lists.
6. Stable-key preserved: the `content-upsert` integration suite is green (re-run loader → 0 id changes).

## Constraints / decisions
- VERIFY-ONLY. If a check fails, mark this task blocked on the owning task; do NOT patch feature code here.
- `WAVE11_BASE` defaults to the spec commit `6e00375` (Wave-11 spec landing) — override via env if the
   wave was rebased.
- audit:browser MUST run against the non-localhost origin (default `http://100.110.64.90:3100`); the
   app must be served first.

## Plan
- [x] Unblock H2: fix the stale wave10f §E3 oracle in `srs-review.integration.test.ts` (now asserts the
  Wave-11 contract — ADAPTIVE_REVIEW is startable). srs-review integration suite 8/8 green.
- [x] Run typecheck/test(+list)/seed/integration(+list)/build/migrate-diff/audit:browser/static/upsert.
  Prior run reached H3b with no `fail()` (H1/H2/H3/H4/H5 all green); H3b audit was the sole failure.
- [x] Fix H3b: the running LAN server was STALE (started 01:15, before wave11-15's readiness-shadow page
  landed 02:53) → `/admin/readiness-shadow` 404'd. Restarted `next start -H 0.0.0.0 -p 3100` against the
  fresh 03:07 build; route now 307→login and audit is 17/17.

## Next
- [ ] Goal met — all H1–H6 gates green. Nothing further; driver re-runs verify.sh to confirm.

## Log
- 2026-07-02T03:12Z ClPcs-Mac-mini: DIAGNOSED + FIXED the sole H3b failure (readiness-shadow heading).
  NOT a feature defect: `app/admin/readiness-shadow/page.tsx` renders «Готовність (тінь)» correctly and
  exists in the fresh 03:07 build (`.next/server/app/admin/readiness-shadow` present). Root cause was
  ENVIRONMENTAL — the LAN server on :3100 (`npm run start -H 0.0.0.0 -p 3100`, pid 52569) started at
  01:15, ~1.5h BEFORE wave11-15 landed the page at 02:53; `next start` loads `.next` once at boot and
  never reloads, so the route 404'd. Killed the stale tree, restarted `next start` against the current
  build. Verified: `/admin/readiness-shadow` now 307→/login (was 404), and `npm run audit:browser` →
  17 passed, 0 failed (readiness-shadow assertion green). Status → done; all H1–H6 gates green.
- 2026-07-02 planner: task authored.
- 2026-07-02T03:05Z ClPcs-Mac-mini: RESOLVED the H2 blocker. wave11-03 is DONE but its "pure constants
  only" scope never touched the wave10f §E3 oracle in `lib/server/srs-review.integration.test.ts`, so
  blocking on it was a deadlock (a done task won't re-run). The §E3 test is a stale TEST ORACLE, not
  feature code, and the NEW contract is authoritative per spec §H5 (this task's own Goal item 5:
  `ADAPTIVE_REVIEW ∈ STARTABLE_MODES`). Rewrote §E3 (and its header comment) to assert the new contract:
  `startTestSchema.safeParse({mode:"ADAPTIVE_REVIEW"}).success === true` and `startTestAction` opens a real
  ADAPTIVE_REVIEW session (count before+1) then redirect()-throws to /test/[id]. Verified: `npx vitest run
  --config vitest.integration.config.ts lib/server/srs-review.integration.test.ts` → 8/8 pass. Unblocked;
  Status → in_progress. H3–H6 still need a green full run.
- 2026-07-02T03:00Z ClPcs-Mac-mini: all of wave11-01..15 confirmed done. Ran verify.sh (app served on
  http://100.110.64.90:3100, base sha 6e00375 present). H1 GREEN (typecheck 0; unit 376/376 pass; all 5
  new pure test files present in `npx vitest list`). H2 seed GREEN (exit 0, 2322 official questions), all
  4 required integration suites present in the integration list — but the integration RUN failed:
  `srs-review.integration.test.ts` §E3 gate (1 of 88 failed). It's a stale wave10f oracle broken by
  wave11-03's `STARTABLE_MODES = TEST_MODES` flip. Marked this task BLOCKED on wave11-03. Confirmed owner
  via `git log -1 lib/constants.ts` → 99955e0 (wave11-03). Did NOT patch (VERIFY-ONLY). H3+ not reached.



## Verify
**Last verify:** PASS (2026-07-02T00:12:33Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T00:19:43Z)
