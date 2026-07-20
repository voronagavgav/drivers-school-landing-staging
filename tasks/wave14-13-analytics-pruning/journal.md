# Task: wave14-13-analytics-pruning

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T01:31Z
**Last compute:** mac-mini

## Goal
Analytics retention pruning in the nightly job (spec §F). PASS = ALL true:

1. `lib/constants.ts` exports `ANALYTICS_RETENTION_DAYS = 180` and `ANALYTICS_PRUNE_CHUNK = 500`
   (why-comments: privacy/retention promise + libsql param-cap safety).
2. Runtime-agnostic `lib/analytics-prune.ts` (import type { PrismaClient } ONLY — the
   __testutils__/seed pattern; NO `@/lib/db`, NO `server-only`) exports
   `pruneAnalyticsEvents(prisma: PrismaClient, now: Date, retentionDays = ANALYTICS_RETENTION_DAYS): Promise<number>`:
   - cutoff = now − retentionDays days; loop: select ids of AnalyticsEvent rows with
     `createdAt < cutoff` (`take: ANALYTICS_PRUNE_CHUNK`), `deleteMany({ id: { in: chunk } })`,
     until none remain; returns total deleted. Chunks ≤500 both in take and in the `in` list.
3. `scripts/nightly-readiness.ts` calls it (same standalone client, after the per-user loop) and logs
   the count (`console.log` with the number — greppable).
4. Integration test `lib/analytics-prune.integration.test.ts` (passes lib/db's prisma into the fn):
   a. Seed 3 AnalyticsEvent rows at now−181d and 2 at now−1d (distinctive eventName per-run token) →
      run with injected now → returns ≥3 (other stale rows may exist DB-wide), the 3 old fixture rows
      are GONE, the 2 fresh fixture rows remain;
   b. immediate re-run with the same now → the fixture contributes 0 further deletions (idempotent —
      assert the fresh rows still remain and old ones stay gone);
   c. 1200 old fixture rows (seeded via createMany loops) → all removed in one call (multi-chunk loop
      proven), fresh rows intact.
5. `npx tsx --conditions=react-server scripts/nightly-readiness.ts` exits 0 and its output contains the
   prune log line.
6. `npm run test:integration`, `npm test`, `npm run typecheck` all exit 0. No schema change.
7. `bash tasks/wave14-13-analytics-pruning/verify.sh` exits 0.

## Constraints / decisions
- deleteMany by id-chunks (NOT one `deleteMany({ createdAt: { lt } })`) — pinned: bounded transactions
  on libsql and a greppable chunk loop; the spec says "in chunks ≤500".
- `now` injected for tests; the script passes `new Date()` at its own top level.
- TRIAGE note: analytics-dashboard.integration.test.ts asserts on accumulated dev.db AnalyticsEvent
  rows — pruning only touches >180d-old rows so it cannot affect that suite; if it goes red, reseed
  (`npm run db:seed`) per the CLAUDE.md triage bullet, don't patch here.
- No new launcher/flags (spec: same launcher).

## Next
- [x] Add constants; implement pruneAnalyticsEvents; wire + log in the nightly script; tests.
- Goal fully met — verify.sh PASS. Nothing outstanding.

## Artifacts
- lib/analytics-prune.ts, lib/analytics-prune.integration.test.ts, scripts/nightly-readiness.ts,
  lib/constants.ts (retention block)

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-03T01:31Z ClPcs-Mac-mini: implemented all deliverables in one increment. Added
  ANALYTICS_RETENTION_DAYS=180 + ANALYTICS_PRUNE_CHUNK=500 (with why-comments) to lib/constants.ts;
  created runtime-agnostic lib/analytics-prune.ts (`pruneAnalyticsEvents(prisma, now, retentionDays)`
  — chunked id-list deleteMany loop, returns total deleted); wired it into scripts/nightly-readiness.ts
  after the user loop with a greppable prune count in the summary log; wrote
  lib/analytics-prune.integration.test.ts (retention+idempotency 3-old/2-fresh, 1200-row multi-chunk).
  Hit the known purity-gate trap: the doc comment's literal `server-only` token tripped
  `grep -nE '@/lib/db|server-only'` — reworded to "server runtime guard". verify.sh PASS
  (typecheck, npm test 554, test:integration 153+2skip, nightly script exits 0 with prune log). Status→done.

## Verify
**Last verify:** PASS (2026-07-02T22:32:16Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T22:33:48Z)
