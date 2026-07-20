# Task: wave16-03-schema-entitlement-profile

**Status:** done
**Driver:** auto
**Updated:** 2026-07-04T16:47Z
**Last compute:** ClPcs-Mac-mini

## Goal
ONE additive migration for all Wave-16 schema: the `Entitlement` table + JTBD/outcome columns on
`UserStudyProfile`. NO changes to existing tables beyond the additive profile columns. PASS = ALL true:

1. `prisma/schema.prisma` gains model `Entitlement` with EXACTLY these fields (names binding):
   `id` (cuid pk), `userId String @unique` + `user` relation with `onDelete: Cascade`,
   `tier String @default("FREE")` (comment: FREE | EXAM_ACCESS — see ENTITLEMENT_TIERS),
   `purchasedAt DateTime?`, `examDate DateTime?`, `validUntil DateTime?`,
   `source String @default("MANUAL")` (comment: MANUAL | PROMO), `createdAt @default(now())`,
   `updatedAt @updatedAt`.
2. `UserStudyProfile` gains ONLY these nullable columns (all additive, no defaults that rewrite
   rows): `prepMode String?` (SCHOOL|SELF|BOTH), `examOutcome String?` (PASSED|FAILED),
   `examOutcomeDate DateTime?`, `examOutcomeReportedAt DateTime?`.
3. A new migration dir `prisma/migrations/<14-digit-ts>_wave16_entitlement_profile/migration.sql`
   exists, generated via `npx prisma migrate diff --from-config-datasource --to-schema
   prisma/schema.prisma --script` (then pruned of any out-of-scope drift lines), applied with
   `npx prisma migrate deploy` — exits 0.
4. `npx prisma generate` run; `lib/generated/prisma/models/Entitlement.ts` exists (client regen).
5. `sqlite3 prisma/dev.db "PRAGMA table_info('Entitlement');"` lists tier, validUntil, source;
   `sqlite3 prisma/dev.db "PRAGMA table_info('UserStudyProfile');"` lists prepMode, examOutcome,
   examOutcomeDate, examOutcomeReportedAt.
6. `sqlite3 prisma/dev.db "SELECT \"on_delete\" FROM pragma_foreign_key_list('Entitlement') WHERE
   \"table\"='User';"` prints `CASCADE`.
7. Seed reset block: per wave16-01 Findings 1k, Entitlement is a Cascade child of User — if the seed
   clears users explicitly it may be skipped; record the decision in this journal's Log either way.
   `npm run db:seed` exits 0 after the migration.
8. `npx tsc --noEmit` exits 0; `npm test` exits 0; `npm run test:integration` exits 0 (schema is
   additive, nothing should break).

## Constraints / decisions
- Migration must be headless: NEVER `prisma migrate dev` (interactive). Generate via `migrate diff
  --from-config-datasource`, strip out-of-scope drift (any CREATE INDEX etc. from prior waves),
  then `migrate deploy` (house rule, bit wave10-02).
- SQLite: one ADD COLUMN per ALTER TABLE statement.
- Tier/source/prepMode/outcome stay STRING columns validated by zod against the wave16-02 constant
  tuples — SQLite has no enums and the house pattern (e.g. NotificationLog.status) is string+comment.
- No data backfill: every new column nullable; existing rows untouched.
- Non-goal: no payment fields (provider ids, amounts) — deferred behind Gate 0.

## Next
- [x] Edit schema.prisma (Entitlement model + 4 profile columns), run migrate diff → prune →
      deploy → generate, then the checks in Goal 5-8. — DONE (all 8 Goal checks green).
- Goal fully met. If re-opened, only re-verify the sqlite PRAGMA checks + tsc/test suites.

## Artifacts
- prisma/schema.prisma  (Entitlement model @ ~§1.9; UserStudyProfile +4 nullable cols; User.entitlement back-rel)
- prisma/migrations/20260704134423_wave16_entitlement_profile/migration.sql

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T16:47Z ClPcs-Mac-mini: Added `Entitlement` model (§1.9) with exact binding fields
  (id cuid pk, userId @unique + user rel onDelete:Cascade, tier @default("FREE"), purchasedAt?,
  examDate?, validUntil?, source @default("MANUAL"), createdAt @default(now), updatedAt @updatedAt)
  + `User.entitlement Entitlement?` back-rel; added 4 nullable additive cols to UserStudyProfile
  (prepMode, examOutcome, examOutcomeDate, examOutcomeReportedAt). Generated migration via
  `migrate diff --from-config-datasource --to-schema … --script` (flag `--to-schema-datamodel`
  was REMOVED in Prisma 7 → use `--to-schema`); output was already scoped (4 ADD COLUMN + CREATE
  TABLE + unique index), NO out-of-scope drift to prune. dev.db was LOCKED by the long-lived LAN
  audit server (next-server pid 71464, WAL open FDs) → `migrate deploy` failed "database is locked";
  stopped the server (legit env setup per stale-server learnings), applied `migrate deploy` (exit 0),
  `prisma generate` (Entitlement.ts model emitted), then RELAUNCHED `npm run start -H 0.0.0.0 -p 3100`
  (login 200, pid 20235). SEED DECISION: seed reset block clears `user.deleteMany()` explicitly and
  Entitlement/UserStudyProfile are Cascade children of User → cascade-deleted automatically, so NO
  explicit `entitlement.deleteMany()` added (mirrors existing UserStudyProfile handling). Verified:
  PRAGMA table_info shows all Entitlement + 4 profile cols; FK on_delete = CASCADE; db:seed exit 0
  (2322 questions); tsc clean; npm test 576 pass; test:integration 171 pass / 2 skipped. Status→done.

## Verify
**Last verify:** PASS (2026-07-04T13:48:15Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T13:50:06Z)
