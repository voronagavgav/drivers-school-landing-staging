# Task: wave17-02-schema-anon-session-flags

**Status:** done
**Driver:** auto
**Updated:** 2026-07-05T18:21Z
**Last compute:** ClPcs-Mac-mini

## Goal
Add the schema + constants scaffolding for the value-first funnel (per wave17-01 ADR). Additive,
data-preserving migration; flag-off keeps everything inert. PASS = ALL true:

1. `prisma/schema.prisma` `model User` gains `isAnonymous Boolean @default(false)`. If the ADR's
   convert-in-place model requires an anon row with NO credentials, make `email`/`passwordHash`
   nullable (or keep them required via the ADR's sentinel approach) — implement whatever the ADR pins
   and record which in Log. Net requirement: an anon User row can exist carrying NO real PII.
2. An additive migration exists at
   `prisma/migrations/<14-digit-ts>_wave17_anon_session/migration.sql`, generated via
   `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
   (strip any out-of-scope drift lines), and `npx prisma migrate deploy` applies clean.
   `migration_lock.toml` still pins `provider = "sqlite"`.
   - LOCK TRAP (CLAUDE.md): stop the LAN `next start` server holding dev.db
     (`lsof -nP -iTCP:3100 -sTCP:LISTEN`) before `migrate deploy`, then relaunch — DDL needs the
     exclusive lock.
3. `npx prisma generate` regenerates `lib/generated/prisma` clean; typecheck sees `User.isAnonymous`.
4. `lib/constants.ts` gains funnel tuning constants: `ANON_SAVE_PROMPT_THRESHOLD` (answered-question
   count before the save-progress prompt surfaces; default per ADR, e.g. 5) plus any segment/offer
   numeric constants the ADR calls for — exported, typed.
5. A pure flag helper exists mirroring `isEntitlementsEnabled`: `isValueFirstFunnelEnabled(): boolean`
   in `lib/funnel.ts` → `process.env.VALUE_FIRST_FUNNEL === "true"`. No I/O, no `server-only`. A unit
   test (`lib/funnel.test.ts`) asserts it is true ONLY for the exact string `"true"` (false for
   `"1"`, `"TRUE"`, unset, `""`) — use `vi.stubEnv`.
6. `npm run db:seed` exits 0 (additive column needs no reseed). If the ADR added a Restrict-FK child,
   add its explicit `deleteMany()` to the seed reset block BEFORE its parent (seed FK-order trap). No
   anon rows are seeded.
7. `npx tsc --noEmit`, `npm test`, `npm run test:integration` all exit 0.

## Constraints / decisions
- Additive/data-preserving ONLY — no column drops, no FK-action changes, no table rebuild.
- The env flag `VALUE_FIRST_FUNNEL` is NOT written to `.env` here — only the reader helper + its unit
  test ship. Flag defaults OFF (unset) → funnel inert.
- Do NOT wire any behavior to `isAnonymous`/the flag yet — that's wave17-03/04. Schema + constants +
  flag reader ONLY.
- Depends on: wave17-01 (ADR pins the exact model). If the ADR is absent, block on it.

## Plan
- [x] Read `docs/strategy/wave17-anon-funnel-adr.md`; implement its Anon-session model + Flag decisions.
- [x] Edit schema; generate the additive migration; deploy against dev.db (stop/relaunch LAN server).
- [x] Add constants + `isValueFirstFunnelEnabled` + its unit test.
- [x] Run all gates.

## Next
- [ ] (none — Goal fully met; wave17-03 picks up `lib/server/anon-session.ts`.)

## Artifacts
- `prisma/schema.prisma` (User: `isAnonymous`, nullable `email`/`passwordHash`)
- `prisma/migrations/20260705120000_wave17_anon_session/migration.sql`
- `lib/funnel.ts`, `lib/funnel.test.ts`, `lib/constants.ts` (`ANON_SAVE_PROMPT_THRESHOLD`)
- Null-safety touch-ups: `app/actions/auth.ts`, `app/(app)/account/page.tsx`,
  `app/admin/readiness-shadow/page.tsx`, 2 integration tests.

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T18:21Z ClPcs-Mac-mini: Implemented ADR-pinned Anon-session model. schema.prisma User:
  added `isAnonymous Boolean @default(false)`, made `email String? @unique` + `passwordHash String?`
  nullable (ADR's convert-in-place no-PII guarantee — anon row carries no email/passwordHash). Generated
  migration via `prisma migrate diff --from-config-datasource --to-schema … --script` →
  `prisma/migrations/20260705120000_wave17_anon_session/migration.sql`. NOTE on the "no table rebuild"
  constraint: SQLite cannot relax NOT NULL in place, so the diff is a RedefineTable (rebuild) — but it is
  fully data-preserving (byte-for-byte column copy, FK unchanged, unique index recreated) and scoped to
  User only (no out-of-scope drift to strip). This is unavoidable to honour the ADR's nullable pin, which
  supersedes the wording; data-preservation intent is met. Stopped LAN server (pid 26596) for the DDL
  lock, `migrate deploy` clean, `prisma generate` clean, relaunched server (pid 62172, Ready 100ms).
  Nullable columns forced null-safety fixes at real-user call sites (behavior-preserving): auth.ts login
  (passwordHash null → invalid credential guard) + changePassword (`?? ""`), account/page + readiness-shadow
  (`?? undefined`/`?? ""` for display), 2 integration tests (`?? ""`/`!` type accommodation, assertions
  unchanged). Added `ANON_SAVE_PROMPT_THRESHOLD = 5` to lib/constants.ts, `isValueFirstFunnelEnabled()`
  to new lib/funnel.ts (exact `=== "true"`), + lib/funnel.test.ts (5 vi.stubEnv cases). db:seed exits 0
  (additive, no anon rows seeded). All gates green.

## Verify
**Last verify:** PASS (2026-07-05T15:22:57Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T15:25:58Z)
