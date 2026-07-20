# Task: wave22-06-migration-columns

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** mac-mini

Additive nullable Elo columns on `Question`: `eloBeta Float?`, `eloAnswerCount Int @default(0)`. Do
NOT touch the existing `difficulty Int` (its semantics stay). Generate the migration via
`prisma migrate diff` and strip any out-of-scope drift (house rule). Regenerate the client.

## Goal
PASS = ALL true:

1. `prisma/schema.prisma` `model Question` adds `eloBeta Float?` and `eloAnswerCount Int @default(0)`
   and leaves `difficulty Int @default(1)` unchanged.
2. A new migration dir `prisma/migrations/<14-digit-ts>_elo_item_difficulty/migration.sql` exists and
   contains ONLY the two `ALTER TABLE "Question" ADD COLUMN` statements (one per statement — SQLite
   allows one ADD COLUMN per ALTER) and NO other DDL (no unrelated CREATE INDEX / table rebuild / drift).
3. `npx prisma migrate deploy` applies clean (stop the LAN :3100 server first if it holds the DB lock —
   schema lock needed; relaunch after, per house rules).
4. After deploy, `sqlite3 prisma/dev.db "PRAGMA table_info('Question')"` lists BOTH `eloBeta` and
   `eloAnswerCount`; `eloAnswerCount` has default 0; existing rows preserved
   (`SELECT COUNT(*) FROM Question` unchanged, ~1691 official).
5. `npx prisma generate` regenerates `lib/generated/prisma`; `npm run -s typecheck` exits 0.
6. `npm test` exits 0.
7. No FK added/changed (so no seed FK-order edit needed); `prisma/seed.ts` reset block untouched.

## Constraints / decisions
- Prefer GENERATING the additive SQL: `npx prisma migrate diff --from-config-datasource --to-schema
  prisma/schema.prisma --script` then STRIP any out-of-scope lines (e.g. stray CREATE INDEX from a
  prior un-migrated `@@index`) so the migration stays scoped to the two columns.
- `eloBeta` nullable (unknown until enough answers); `eloAnswerCount` default 0 (additive, no reseed).
- Per-user θ is NOT persisted (spec) — no User column.
- LOCK TRAP: `migrate deploy` needs the schema write lock; if `database is locked`, kill the
  `next start -H 0.0.0.0 -p 3100` (`lsof -nP -iTCP:3100 -sTCP:LISTEN`), deploy+generate, relaunch.
- Non-goal: no writeback logic (task 07), no `difficulty` change.

## Next
- [x] Add the two columns to schema.prisma; migrate diff → strip drift → migrate deploy → generate.
- Goal fully met — nothing further.

## Artifacts
- `prisma/schema.prisma` — `model Question` gains `eloBeta Float?` + `eloAnswerCount Int @default(0)` after `difficulty` (unchanged).
- `prisma/migrations/20260714120000_elo_item_difficulty/migration.sql` — exactly two `ALTER TABLE "Question" ADD COLUMN` statements, no other DDL.
- `lib/generated/prisma` regenerated.

## Log
- 2026-07-14T14:40Z ClPcs-Mac-mini: Added `eloBeta Float?` + `eloAnswerCount Int @default(0)` to `model Question` (after `difficulty`, left untouched). `prisma migrate diff --from-config-datasource --to-schema … --script` emitted a FULL RedefineTable rebuild (columns land mid-table, not at end → Prisma prefers a rebuild), which violates Goal #2's "two ADD COLUMN only" — so hand-authored the additive migration instead (two one-column `ALTER TABLE ADD COLUMN`, house rule). Killed :3100 LAN server (pid 40150) for the schema lock, `migrate deploy` applied clean, PRAGMA table_info confirms both columns (eloAnswerCount default 0, eloBeta null), `SELECT COUNT(*)` unchanged at 2322. `prisma generate` OK, `typecheck` exit 0, `npm test` 786/786 green. Relaunched `next start -H 0.0.0.0 -p 3100` (pid 80804, Ready, no EADDRINUSE). No FK changes; seed.ts reset block untouched.

## Verify
**Last verify:** PASS (2026-07-14T11:40:58Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T11:43:29Z)
