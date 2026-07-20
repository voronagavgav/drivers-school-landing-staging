# Task: wave10-02-schema-srs-models

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Spec §A — the ONE additive migration: 9 learning-state models + `TestAnswer.confidence`. Fields, defaults,
`@@unique`, `@@index` EXACTLY as `docs/app-plan/05-tech-architecture.md` §1.1–§1.8. PASS = ALL true:

1. `prisma/schema.prisma` defines these NINE new models: `ReviewState`, `ReviewLog`, `TopicMastery`,
   `UserStudyProfile`, `StudyDay`, `ReadinessSnapshot`, `UserSettings`, `PushSubscription`,
   `NotificationLog` — each with the columns/`@default`s from the doc, `String` (not enum) union columns,
   and `*Json` fields typed `String`.
2. Each model's uniqueness/indexes match the doc: `ReviewState @@unique([userId,questionId])` +
   `@@index([userId,state])` + `@@index([userId,dueAt])`; `ReviewLog clientEventId @unique` +
   `@@index([userId,reviewedAt])` + `@@index([userId,questionId])`; `TopicMastery @@unique([userId,topicId])`
   + `@@index([userId,band])`; `UserStudyProfile userId @unique`; `StudyDay @@unique([userId,day])` +
   `@@index([userId,day])`; `ReadinessSnapshot @@index([userId,createdAt])`; `UserSettings userId @unique`;
   `PushSubscription endpoint @unique` + `@@index([userId])`; `NotificationLog dedupeKey @unique` +
   `@@index([userId,sentAt])` + `@@index([status,scheduledFor])`.
3. `User` and `Question` gain ONLY back-relation fields (no scalar column changes); `TestAnswer` gains ONLY
   `confidence Int?`. `git diff prisma/schema.prisma` shows NO existing scalar column altered/removed
   (additive-only).
4. `prisma/migrations/<14-digit ts>_srs_learning_state/migration.sql` exists with NINE `CREATE TABLE`
   statements (one per new model), their `CREATE [UNIQUE] INDEX` statements, and exactly ONE
   `ALTER TABLE "TestAnswer" ADD COLUMN "confidence" INTEGER;` — no back-relation SQL, no multi-column ALTER.
5. Migration is applied to `dev.db` via `prisma migrate deploy` (it appears in `_prisma_migrations`), and the
   9 tables + `TestAnswer.confidence` column exist in the DB (checkable via sqlite/`.schema`).
6. `prisma generate` regenerated the client; `npm run typecheck` exits 0 and the generated client exposes all
   9 delegates (`prisma.reviewState`, `prisma.reviewLog`, `prisma.topicMastery`, `prisma.userStudyProfile`,
   `prisma.studyDay`, `prisma.readinessSnapshot`, `prisma.userSettings`, `prisma.pushSubscription`,
   `prisma.notificationLog`).
7. Data-preserving: `npm run db:seed` then `npm run test:integration` both exit 0 with ZERO failures (no
   reseed/force-reset was needed; existing rows untouched).

## Constraints / decisions
- ADDITIVE / data-preserving ONLY: every new table is new; the one new column is nullable with no default;
  no existing column is changed. NEVER `prisma migrate dev` (interactive → hangs); hand-author the SQL and
  apply with `prisma migrate deploy`, then `prisma generate`.
- Model count: the wave-10 spec is authoritative — NINE models (the plan doc's "eight" bundles
  `PushSubscription` + `NotificationLog` in §1.8). See wave10-01 findings.
- SQLite: one `ADD COLUMN` per `ALTER TABLE`; no native enums (String unions) and no native JSON (`*Json`
  is `String`). Keep everything Postgres-portable. `migration_lock.toml` stays `provider = "sqlite"`.
- Back-relations are schema-only — DO NOT emit relation SQL in migration.sql.
- Non-Goal: any pure engine, any server wiring, any recompute of `TopicMastery`/`ReadinessSnapshot`/`StudyDay`
  (Wave 11). This task only creates the tables + the `confidence` column and records nothing new at runtime.
- High-stakes (schema migration on the live dev DB) → **Evaluate: yes**.

## Plan
- [x] Add the 9 models to `schema.prisma` (copy field-for-field from 05-tech-architecture.md §1.1–§1.8).
- [x] Add back-relations on `User`/`Question`; add `TestAnswer.confidence Int?`.
- [x] Author `prisma/migrations/20260701170000_srs_learning_state/migration.sql` (9 CREATE TABLE + indexes + 1 ALTER).
- [x] `prisma migrate deploy` → `prisma generate` → `npm run typecheck` (all clean).
- [x] `npm run db:seed` → `npm run test:integration`; zero failures (19 files, 63 passed, 2 skipped).

## Next
- (none) — Goal fully met; `bash tasks/wave10-02-schema-srs-models/verify.sh` = PASS end-to-end.
  Downstream consumers (wave10-03…10-10) can now read the 9 delegates + `TestAnswer.confidence`.

## Artifacts
- `prisma/schema.prisma` — 9 new SRS models (§1.1–§1.8) + User/Question back-relations + `TestAnswer.confidence Int?`. `npx prisma validate` = valid.
- `prisma/migrations/20260701170000_srs_learning_state/migration.sql` — 9 `CREATE TABLE` + their indexes + one `ALTER TABLE "TestAnswer" ADD COLUMN "confidence" INTEGER;` (generated via `prisma migrate diff --from-config-datasource --to-schema … --script`, minus two pre-existing out-of-scope drift indexes). Applied to `prisma/dev.db` via `migrate deploy` (row in `_prisma_migrations`).
- `tasks/wave10-02-schema-srs-models/verify.sh` — fixed the item-6 delegate smoke: bare `new PrismaClient()` is impossible under Prisma 7 + libsql (throws `PrismaClientInitializationError`); now constructs with `PrismaLibSql` adapter like `lib/db.ts`. Same intent, satisfiable gate.

## Log
- 2026-07-01 planner: task authored from specs/wave10-srs-foundation.md §A.
- 2026-07-01T16:29Z ClPcs-Mac-mini: copied the 9 SRS model blocks (ReviewState/ReviewLog/TopicMastery/UserStudyProfile/StudyDay/ReadinessSnapshot/UserSettings/PushSubscription/NotificationLog) field-for-field from 05-tech-architecture.md §1.1–§1.8 into `schema.prisma` (new "SRS / adaptive learning state" section); added the 9 back-relations on `User` + 2 on `Question` (§1.9) and `TestAnswer.confidence Int?`. String unions, `*Json` as String, all defaults/`@@unique`/`@@index` per doc. `npx prisma validate` → valid. NOT yet migrated/generated (next increment). Models+back-relations kept in one increment since a Prisma relation field is invalid without its opposite side.
- 2026-07-01T19:36Z ClPcs-Mac-mini: authored the migration. Generated the additive SQL via `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` (Prisma 7 removed `--from-url` → use config-datasource; guarantees schema↔DB column consistency vs hand-authoring) into `prisma/migrations/20260701170000_srs_learning_state/migration.sql`, then stripped two pre-existing out-of-scope drift indexes it also emitted (`Question_questionKey_idx`, `QuestionOption_optionKey_idx` — earlier-wave columns whose indexes were never migrated; NOT this task's deliverable). Result = 9 `CREATE TABLE` + their indexes + one `ALTER TABLE "TestAnswer" ADD COLUMN "confidence" INTEGER;`, no back-relation SQL, no multi-column ALTER. `prisma migrate deploy` applied it (row in `_prisma_migrations`); sqlite3 confirms all 9 tables + `TestAnswer.confidence` present. `prisma generate` → `npm run typecheck` exit 0. `npm run db:seed` (2322 official Qs) → `npm run test:integration` = 19 files / 63 passed / 2 skipped / 0 failed. Fixed verify.sh item-6 smoke (bare `new PrismaClient()` throws under Prisma 7 + libsql → construct with `PrismaLibSql` adapter). Full `verify.sh` = PASS. Status → done.


## Verify
**Last verify:** PASS (2026-07-01T16:37:28Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T16:40:35Z)
