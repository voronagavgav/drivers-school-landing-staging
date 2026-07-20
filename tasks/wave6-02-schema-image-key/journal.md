# Task: wave6-02-schema-image-key

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec A — add a stable, additive `imageKey` column. Pass = all true:
1. `prisma/schema.prisma`'s `Question` model declares `imageKey String?` and an `@@index([imageKey])`.
2. The ONLY diff in `prisma/schema.prisma` vs HEAD is that column + that index (no other model/field changes).
3. A new migration dir `prisma/migrations/<timestamp>_question_image_key/` exists with a hand-authored
   `migration.sql` that adds the nullable column and the index (ADDITIVE only — no DROP/ALTER of existing data).
4. The migration was applied with `prisma migrate deploy` (NOT `migrate dev`); `npx prisma migrate status`
   reports the schema up to date / no pending migrations.
5. `npx prisma generate` regenerated the client and `lib/generated/prisma` includes `imageKey` on the
   Question type (grep the generated client for `imageKey`).
6. `npm run typecheck` exits 0.

## Constraints / decisions
- ADDITIVE nullable column ONLY — no data loss, no backfill in this task (importer/seed set keys later).
- Prisma 7 + non-TTY: hand-author the SQL then `prisma migrate deploy`; NEVER `prisma migrate dev`
  (interactive → fails here). See CLAUDE.md "Headless migrations".
- Do NOT touch importer/seed/render in this task — only schema + migration + generate.
- Keep `@@index([imageKey])` (the spec asks for it; resolver lookups are by key but the index is cheap
  insurance + matches the spec).

## Plan
- [x] Add `imageKey String?` + `@@index([imageKey])` to the `Question` model.
- [x] Hand-author `prisma/migrations/<ts>_question_image_key/migration.sql` (ALTER TABLE ADD COLUMN + CREATE INDEX).
- [x] `npx prisma migrate deploy` then `npx prisma generate`.
- [x] `npm run typecheck`; confirm `prisma migrate status` clean.

## Done
- [x] Added `imageKey String?` (after `imageUrl`) and `@@index([imageKey])` to the `Question` model in `prisma/schema.prisma`. Diff is exactly those two lines (verified via `git diff`).
- [x] Hand-authored `prisma/migrations/20260623091643_question_image_key/migration.sql` (additive `ADD COLUMN "imageKey" TEXT` + `CREATE INDEX "Question_imageKey_idx"`), applied via `npx prisma migrate deploy`, regenerated client with `npx prisma generate`. `prisma migrate status` → "Database schema is up to date!"; generated client (`lib/generated/prisma/models/Question.ts`) includes `imageKey`; `npm run typecheck` exits 0.

## Next
- [ ] (none — Goal fully met; verify will re-confirm.)

## Artifacts
- prisma/migrations/20260623091643_question_image_key/migration.sql — the additive migration

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 ClPcs-Mac-mini: added `imageKey String?` (after `imageUrl`) + `@@index([imageKey])` to `Question` in prisma/schema.prisma; verified `git diff` shows only those two added lines. Next: hand-author the additive migration + `migrate deploy`.
- 2026-06-23T09:17Z ClPcs-Mac-mini: hand-authored `prisma/migrations/20260623091643_question_image_key/migration.sql` (additive ADD COLUMN + CREATE INDEX, one ADD COLUMN per ALTER per SQLite); `npx prisma migrate deploy` applied it; `npx prisma generate` regenerated; `prisma migrate status` clean; generated `Question.ts` has `imageKey`; `npm run typecheck` exits 0. Goal fully met → Status: done.


## Verify
**Last verify:** PASS (2026-06-23T09:17:43Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T09:18:52Z)
