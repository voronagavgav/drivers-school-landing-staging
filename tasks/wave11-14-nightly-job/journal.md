# Task: wave11-14-nightly-job

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop
**Evaluate:** yes

## Goal
On-box nightly recompute job. Depends wave11-08 (reuses its recompute fns — no duplicated logic). DONE
when (verify.sh exits 0):

1. `scripts/nightly-readiness.ts` (standalone) constructs its OWN Prisma client with the libsql adapter
   (`new PrismaClient({ adapter: new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }) })`,
   exactly like `prisma/seed.ts`) — it does NOT import `@/lib/db`. For each user with ≥1 `ReviewState`
   (paged/chunked ≤200), it calls the wave11-08 `recomputeTopicMastery` + `recomputeReadiness`
   (+ `medianLatencyMs`) PASSING its own client, so the nightly path == the finish path (no drift).
2. Idempotent: running it twice against the seeded dev DB leaves snapshot SEMANTICS unchanged (new
   `ReadinessSnapshot` rows are fine, but the computed `dialPercent`/`sufficientData` for a user are
   equal run-to-run given unchanged inputs). Logs exactly ONE summary line per run (users processed).
3. Exits 0 on an empty DB (no users with ReviewState) and on the seeded DB.
4. `ops/com.drivers.nightly-readiness.plist` (launchd template, 03:30 Europe/Kyiv) exists, and an
   `ops/README`(.md) line documents the exact `launchctl bootstrap` command to enable it. Do NOT run
   `launchctl bootstrap` in this wave (deploy-box step — documented only).
5. `npm run typecheck` exits 0.

## Constraints / decisions
- NEVER `@/lib/db` in the script file (H4 static guard) — own client, like seed.ts. Reuse wave11-08's
   recompute fns (parameterized client) rather than reimplementing — a duplicated recompute would be an
   UNTESTED divergent path. If those fns carry `import "server-only"`, the plist invokes the script via
   `npx tsx --conditions=react-server scripts/nightly-readiness.ts` (CLAUDE.md react-server trick).
- Chunk every id-list read ≤200 (P2029). Page users in batches.
- Standalone Prisma construction MUST pass the adapter (bare `new PrismaClient()` throws under
   Prisma 7 + libsql, CLAUDE.md).

## Plan
- [x] Write the script (own client, paged users, reuse recompute fns, summary log).
- [x] Add the launchd plist + ops README command line.
- [x] Run twice on seeded DB; both exit 0.

## Next
- [ ] (none — all Goal items met; driver re-runs verify.sh to confirm.)

## Artifacts
- scripts/nightly-readiness.ts — standalone libsql-adapter client; pages users w/ ≥1 ReviewState (cursor, ≤200), reuses recomputeTopicMastery/recomputeReadiness with its own client, one summary line.
- ops/com.drivers.nightly-readiness.plist — launchd template, StartCalendarInterval Hour 3/Minute 30, invokes `npx tsx --conditions=react-server scripts/nightly-readiness.ts` at WorkingDirectory=repo root.
- ops/README.md — documents the `launchctl bootstrap gui/$(id -u) …` enable command, Europe/Kyiv timezone note (launchd has no TZ key), kickstart/bootout/print.

## Log
- 2026-07-02 planner: task authored.
- 2026-07-01T23:46:59Z ClPcs-Mac-mini: authored scripts/nightly-readiness.ts (own PrismaClient+PrismaLibSql, cursor-paged users, chunked id-lists ≤200, passes own client into wave11-08 recompute fns). Ran `tsx --conditions=react-server` twice on seeded DB → both exit 0, one summary line ("processed 0 user(s)", seed has no ReviewState = empty-DB case §3). Removed a literal `@/lib/db` from a doc comment (verify greps whole file → would false-fail the no-@/lib/db guard).
- 2026-07-02T00:? ClPcs-Mac-mini: added ops/com.drivers.nightly-readiness.plist (StartCalendarInterval Hour 3/Minute 30, ProgramArguments = `/opt/homebrew/bin/npx tsx --conditions=react-server scripts/nightly-readiness.ts`, WorkingDirectory repo root, matches existing ops/com.driversschool.program.plist style) + ops/README.md documenting the `launchctl bootstrap gui/$(id -u) …` command and the Europe/Kyiv timezone requirement (launchd StartCalendarInterval fires in local time, no TZ key). Re-ran the twice-run (both exit 0) + typecheck (exit 0). Status → done.


## Verify
**Last verify:** PASS (2026-07-01T23:49:38Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T23:51:35Z)
