# Task: wave7-02-schema-question-option-keys

**Status:** done   <!-- re-asserted: prior REJECT was a no-VERDICT-marker artifact; verify.sh PASS, all 6 criteria green -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
Spec A — add stable-key columns via an ADDITIVE, data-preserving migration. Pass = ALL true:
1. `prisma/schema.prisma` `model Question` has `questionKey String? @unique` AND `@@index([questionKey])`.
2. `prisma/schema.prisma` `model QuestionOption` has `optionKey String? @unique` AND `@@index([optionKey])`.
3. The `prisma/schema.prisma` diff vs the wave base is ONLY those two columns + their two indexes
   (`@unique` implies a unique index; an explicit `@@index` is also acceptable) — NO other model/field touched.
4. A new hand-authored migration dir `prisma/migrations/<14-digit-ts>_question_option_keys/migration.sql` exists,
   containing exactly: one `ALTER TABLE "Question" ADD COLUMN "questionKey" TEXT;`, one
   `ALTER TABLE "QuestionOption" ADD COLUMN "optionKey" TEXT;` (ONE ADD COLUMN per ALTER — SQLite), and a
   `CREATE UNIQUE INDEX` for each new column (`Question_questionKey_key`, `QuestionOption_optionKey_key`).
   No column is `NOT NULL` and none has a `DEFAULT` (nullable + additive = existing rows preserved).
5. `npx prisma migrate deploy` applies cleanly (exit 0) — NOT `migrate dev` (interactive, broken here).
6. `npx prisma generate` regenerates the client (exit 0) and `npm run typecheck` exits 0 with the new fields
   visible on the generated client types.

## Constraints / decisions
- Migration is HAND-AUTHORED then applied with `migrate deploy`; NEVER `prisma migrate dev` (non-interactive
  shell → fails; adding a UNIQUE column also triggers the data-loss prompt). Mirror the existing
  `20260623091643_question_image_key/migration.sql` precedent (one ADD COLUMN per ALTER + CREATE INDEX).
- Columns are NULLABLE — the loader (task 05) BACKFILLS keys onto rows; this migration only adds the columns.
  A nullable column with no default is additive and reseed-free (CLAUDE.md).
- `migration_lock.toml` already pins `provider = "sqlite"`; do not change it.
- Non-Goal: NO loader/seed/helper logic here — ONLY the schema columns + migration + client regen. Do not
  populate the keys (that is task 05). Do not touch `imageUrl`/`imageKey` or any other field.

## Plan
- [x] Edit `model Question` + `model QuestionOption` in `prisma/schema.prisma` (2 columns, 2 indexes).
- [x] Hand-author `prisma/migrations/<ts>_question_option_keys/migration.sql` (2 ALTERs + 2 unique indexes).
- [x] `npx prisma migrate deploy` then `npx prisma generate`.
- [x] `npm run typecheck`.

## Done
- [x] Added `questionKey String? @unique` + `@@index([questionKey])` to `model Question` and
      `optionKey String? @unique` + `@@index([optionKey])` to `model QuestionOption`. `npx prisma validate` → valid.
- [x] Hand-authored `prisma/migrations/20260623115746_question_option_keys/migration.sql` (2 single-column
      ADD COLUMN ALTERs + 2 `CREATE UNIQUE INDEX`, no NOT NULL/DEFAULT). `migrate deploy` applied cleanly,
      `prisma generate` regenerated the client, `npm run typecheck` exit 0, full `verify.sh` → PASS.

## Next
- [ ] None — Goal fully met (all 6 pass criteria green; verify.sh PASS). Downstream keys are populated by
      task wave7-05 (loader upsert-by-`questionKey`); this task is schema/migration only.

## Artifacts
- `prisma/schema.prisma` — two new keyed columns + indexes.
- `prisma/migrations/20260623115746_question_option_keys/migration.sql` — additive ALTERs + unique indexes.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 11:56 UTC ClPcs-Mac-mini: added `questionKey String? @unique` + `@@index([questionKey])` to
  `model Question` and `optionKey String? @unique` + `@@index([optionKey])` to `model QuestionOption` in
  `prisma/schema.prisma` (placed next to `imageKey`/`displayOrder`, matching column alignment). `npx prisma
  validate` → "schema is valid". Migration authoring + deploy/generate/typecheck deferred to next tick.
- 2026-06-23 11:58 UTC ClPcs-Mac-mini: hand-authored
  `prisma/migrations/20260623115746_question_option_keys/migration.sql` mirroring the
  `20260623091643_question_image_key` precedent — one `ALTER TABLE "Question" ADD COLUMN "questionKey" TEXT;`,
  one `ALTER TABLE "QuestionOption" ADD COLUMN "optionKey" TEXT;` (one ADD per ALTER, SQLite), plus
  `CREATE UNIQUE INDEX "Question_questionKey_key"` and `"QuestionOption_optionKey_key"` (nullable, no DEFAULT →
  additive/data-preserving). `npx prisma migrate deploy` applied cleanly, `npx prisma generate` regenerated the
  client (7.8.0), `npm run typecheck` exit 0. Full `verify.sh` → `PASS`. Status → done. The previous FAIL was the
  expected pre-migration state (dir didn't exist yet), now resolved.
- 2026-06-23 12:10 UTC ClPcs-Mac-mini: re-grounded after evaluator REJECT — reason was
  "(no VERDICT marker emitted — defaulting to REJECT)", a process artifact, NOT a substantive defect (the verify
  gate itself recorded PASS at 11:59:40Z). Re-inspected deliverables: schema has `questionKey String? @unique` +
  `@@index([questionKey])` (Question) and `optionKey String? @unique` + `@@index([optionKey])` (QuestionOption);
  migration dir `20260623115746_question_option_keys/migration.sql` present with 2 single-column additive ALTERs +
  2 unique indexes, no NOT NULL/DEFAULT. Re-ran `verify.sh` → `PASS` ("No pending migrations to apply", client
  regen + typecheck green). All 6 Goal criteria met. Re-asserted Status → done.


## Verify
**Last verify:** PASS (2026-06-23T12:04:10Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T12:05:47Z)
