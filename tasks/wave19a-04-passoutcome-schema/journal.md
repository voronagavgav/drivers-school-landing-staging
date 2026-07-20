# Task: wave19a-04-passoutcome-schema

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-12
**Last compute:** laptop

SCHEMA + MIGRATION (Part 2 §G). Add the `PassOutcome` model — the durable calibration ground-truth table pairing
a snapshotted predicted P(pass) with the actual self-reported exam result. New table (additive, no rebuild).
Hand-authored migration + `prisma migrate deploy` ONLY (NEVER `prisma migrate dev`). Follow the migration
discipline in the project CLAUDE.md exactly.

## Goal
PASS = ALL true:

1. `prisma/schema.prisma` defines `model PassOutcome` with EXACTLY these fields:
   - `id String @id @default(cuid())`
   - `userId String` + `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
   - `predictedPassProbability Float`  (0..1, snapshotted at report time)
   - `passed Boolean`
   - `categoryId String?` + `category Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)`
   - `source String`  (e.g. `"self_report"`)
   - `createdAt DateTime @default(now())`
   - `@@index([createdAt])` and `@@index([categoryId])`
2. Reverse relations added: `passOutcomes PassOutcome[]` on both `model User` and `model Category`.
3. A hand-authored migration dir `prisma/migrations/<14-digit ts>_wave19a_pass_outcome/migration.sql` exists,
   creating the `PassOutcome` table + both indexes + the two FKs (Cascade on user, SetNull on category). It was
   generated with `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` (scoped
   to ONLY PassOutcome; strip any out-of-scope drift), NOT `migrate dev`.
4. `npx prisma migrate deploy` applied clean, and `npx prisma migrate status` reports no pending migrations / a
   clean state. (Stop any LAN `next start` server holding `dev.db` BEFORE deploy; relaunch after if it was running.)
5. `npx prisma generate` regenerated the client; `npm run -s typecheck` exits 0 (the `prisma.passOutcome`
   delegate is available and typed).
6. `sqlite3 prisma/dev.db "SELECT name FROM sqlite_master WHERE type='table' AND name='PassOutcome';"` prints
   `PassOutcome`, and `PRAGMA table_info('PassOutcome')` shows the 7 columns above.
7. The category FK on-delete action is `SET NULL` (verify:
   `sqlite3 prisma/dev.db "SELECT \"on_delete\" FROM pragma_foreign_key_list('PassOutcome') WHERE \"table\"='Category';"`
   prints `SET NULL`; the User FK prints `CASCADE`).

## Constraints / decisions
- **Evaluate: yes** — schema/migration touching the live dev.db; an independent judge confirms the migration
  applied additively (no table rebuild, no data loss) and matches the spec field-for-field.
- Migration discipline (CLAUDE.md): hand-authored SQL, `migrate deploy` (non-interactive), never `migrate dev`.
  New table → a plain `CREATE TABLE` + `CREATE INDEX`; NO rebuild of any existing table. Prefer generating via
  `prisma migrate diff --from-config-datasource --to-schema ... --script` then trimming to just PassOutcome.
- LOCK TRAP: `migrate deploy` needs an exclusive lock; a running `next start -H 0.0.0.0 -p 3100` holds dev.db in
  WAL → `database is locked`. Find + stop it (`lsof -nP -iTCP:3100 -sTCP:LISTEN`), deploy, relaunch if needed.
- `categoryId` indexed + `onDelete: SetNull` matches the wave-audit loose-FK convention (mirrors
  `ReadinessSnapshot`). `@@index([createdAt])` supports the admin calibration read (wave19a-08).
- Non-goals: writing to the table (that is wave19a-06), the metrics module, any UI. No change to any existing model.

## Next
- [x] Add the model + reverse relations to schema.prisma; generate the scoped migration; stop LAN server; deploy;
      generate client; run the sqlite/pragma checks; typecheck.
- Goal fully met; ready for evaluation.

## Artifacts
- `prisma/schema.prisma` — `model PassOutcome` (§G) + reverse relations `passOutcomes` on User & Category.
- `prisma/migrations/20260712132950_wave19a_pass_outcome/migration.sql` — scoped CREATE TABLE + 2 indexes + 2 FKs.

## Log
- 2026-07-07 laptop: planned.
- 2026-07-12 ClPcs-Mac-mini: added `model PassOutcome` (7 fields, `@@index([createdAt])`+`@@index([categoryId])`,
  User FK Cascade, Category FK SetNull) + reverse relations. No LAN server on :3100. Generated the scoped migration
  via `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` (only PassOutcome, no
  drift to strip). `migrate deploy` applied clean; `migrate status` = up to date. `prisma generate` OK. sqlite checks:
  table present, 7 columns, FKs = User→CASCADE, Category→SET NULL. `npm run typecheck` exit 0. Status → done.

## Verify
**Last verify:** PASS (2026-07-12T13:30:46Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T13:31:20Z)
