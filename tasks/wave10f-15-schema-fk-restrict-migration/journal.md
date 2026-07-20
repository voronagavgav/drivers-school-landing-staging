# Task: wave10f-15-schema-fk-restrict-migration

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Change the `ReviewLog.question` and `ReviewState.question` FKs from `onDelete: Cascade` to `Restrict`
(F1) so a Question hard-delete cannot silently destroy the FSRS optimizer corpus / review state — matching
`TestAnswer`'s protection of historical corpus. Drop the duplicate `StudyDay @@index([userId, day])` (F2)
in the SAME migration. SQLite can't ALTER a FK → table-rebuild migration.

Boolean acceptance criteria:
1. `prisma/schema.prisma`: `ReviewLog.question` and `ReviewState.question` relations use
   `onDelete: Restrict`. The `@@index([userId, day])` line is removed from `StudyDay` (its `@@unique([userId, day])`
   stays).
2. A NEW migration dir `prisma/migrations/<14-digit-ts>_<snake_name>/migration.sql` exists that:
   rebuilds `ReviewLog` and `ReviewState` with the Restrict FK (create-new / copy / drop / rename),
   PRESERVING their indexes and the `ReviewLog.clientEventId` UNIQUE; and `DROP INDEX "StudyDay_userId_day_idx";`.
   The migration header documents the choice (esp. ReviewState rows are cheap to lose but consistency
   beats surprise).
3. `npx prisma migrate deploy` exits 0 (non-interactive) against dev.db; `npx prisma generate` exits 0.
4. The DB reflects Restrict: `sqlite3` PRAGMA/foreign_key_list (or an equivalent check) shows the
   `ReviewLog`→`Question` and `ReviewState`→`Question` FKs with `on_delete = RESTRICT` (NOT CASCADE); the
   `StudyDay_userId_day_idx` index no longer exists.
5. `npm run typecheck` exits 0.

## Constraints / decisions
- Hand-author or `prisma migrate diff`-generate then hand-scope; NEVER `prisma migrate dev` (interactive,
  fails in the driver's non-TTY shell). One `ADD COLUMN` per ALTER rule N/A here (table rebuild).
- Table-rebuild must preserve ALL existing columns, defaults, indexes, and uniques of ReviewLog/ReviewState
  exactly — only the FK on_delete action changes. Copy data via `INSERT INTO new SELECT ... FROM old`.
- Do NOT touch the questionKey/optionKey drift indexes here — that is wave10f-16 (which owns the
  drift-zero gate). This task's migration should be scoped to FKs + the StudyDay index only.
- Non-Goal: any data change beyond the rebuild copy; no seed reset (rebuild preserves rows).

## Plan
- [x] Edit `schema.prisma`: Restrict on both FKs; delete the StudyDay duplicate `@@index`.
- [x] Author the table-rebuild migration (hand-authored, Prisma redefine-table style),
      scoped to the two rebuilds + the DROP INDEX; added the header rationale.
- [x] `prisma migrate deploy` + `prisma generate`; verify FK on_delete via PRAGMA.
- [x] `npm run typecheck` 0.

## Next
- [x] Goal fully met — Status: done. Migration applied, both FKs RESTRICT in DB, StudyDay dup index gone,
      typecheck clean.

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-02 ClPcs-Mac-mini: Edited prisma/schema.prisma — ReviewState.question and ReviewLog.question FKs
  flipped from `onDelete: Cascade` to `onDelete: Restrict`; removed the duplicate `@@index([userId, day])`
  from StudyDay (its `@@unique([userId, day])` stays). Next: author the table-rebuild migration.
- 2026-07-02 ClPcs-Mac-mini: Hand-authored prisma/migrations/20260702120000_review_fk_restrict/migration.sql
  (Prisma redefine-table style: PRAGMA defer_foreign_keys/foreign_keys OFF → create new_ReviewState/new_ReviewLog
  with RESTRICT questionId FK → INSERT SELECT all columns → drop old → rename → recreate all indexes incl.
  ReviewLog_clientEventId_key UNIQUE → PRAGMA back ON), plus `DROP INDEX "StudyDay_userId_day_idx";`. Header
  documents the Restrict rationale. `prisma migrate deploy` exit 0 (applied 1 migration), `prisma generate`
  exit 0. PRAGMA foreign_key_list confirms ReviewLog→Question and ReviewState→Question both on_delete=RESTRICT;
  StudyDay_userId_day_idx gone (StudyDay_userId_day_key UNIQUE stays). Row counts preserved (both tables empty
  in dev — copy is a structural no-op). `npm run typecheck` exit 0. Status: done.

## Artifacts
- prisma/schema.prisma (ReviewLog/ReviewState question FKs → Restrict; StudyDay dup @@index removed)
- prisma/migrations/20260702120000_review_fk_restrict/migration.sql (table-rebuild + DROP INDEX)


## Verify
**Last verify:** PASS (2026-07-01T21:11:57Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T21:12:53Z)
