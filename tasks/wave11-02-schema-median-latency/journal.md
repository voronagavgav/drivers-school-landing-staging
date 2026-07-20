# Task: wave11-02-schema-median-latency

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
Add ONE additive nullable column and migrate it, preserving all data. DONE when every criterion holds
(verify.sh exits 0):
1. `prisma/schema.prisma` `model TopicMastery` declares `medianLatencyMs Int?` (nullable, additive).
2. A migration dir `prisma/migrations/<14-digit>_topic_mastery_median_latency/migration.sql` exists,
   was GENERATED via `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma
   --script`, and contains exactly one `ALTER TABLE "TopicMastery" ADD COLUMN "medianLatencyMs"`
   (an additive `ADD COLUMN`; NO `DROP`, NO table rebuild). Any out-of-scope drift lines were stripped.
3. `npx prisma migrate deploy` applied it (non-interactive); the live `prisma/dev.db` `TopicMastery`
   table has a `medianLatencyMs` column (`sqlite3 prisma/dev.db "PRAGMA table_info('TopicMastery')"`
   lists it).
4. `npx prisma generate` run; `npm run typecheck` exits 0.
5. `npm run db:seed` exits 0 AND `npm run test:integration` exits 0 (data preserved — no reseed drift).
6. `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
   reports NO further drift for `TopicMastery.medianLatencyMs` (schema↔DB consistent).

## Constraints / decisions
- Additive-only: one nullable `Int?` column, no default → data-preserving (CLAUDE.md migration rules).
- GENERATE the migration (migrate diff) — do NOT hand-author; strip any unrelated drift lines so the
  migration stays scoped to this column (CLAUDE.md bit wave10-02).
- Prisma 7 + libsql: `migrate deploy` non-interactive (`migrate dev` is TTY-only → forbidden here).
- Do NOT populate the column here — the nightly job (wave11-14) + recompute (wave11-08) fill it.

## Plan
- [x] Add the field to schema.prisma.
- [x] Generate the scoped migration via migrate diff; strip out-of-scope lines.
- [x] migrate deploy; generate; typecheck; seed; integration.

## Next
- [x] All criteria met — verify.sh exits 0. Task done.

## Log
- 2026-07-02 planner: task authored.
- 2026-07-02T01:42Z ClPcs-Mac-mini: Added `medianLatencyMs Int?` to `model TopicMastery`
  (schema.prisma). Generated scoped migration via `migrate diff --from-config-datasource
  --to-schema` → single `ALTER TABLE "TopicMastery" ADD COLUMN "medianLatencyMs" INTEGER` (no
  drift, nothing to strip) at `prisma/migrations/20260702130000_topic_mastery_median_latency/`.
  `migrate deploy` applied it (live dev.db column confirmed via PRAGMA table_info). `prisma
  generate` + `npm run typecheck` green; post-deploy `migrate diff` empty (schema↔DB consistent).
  BLOCKER FIXED: `npm run db:seed` was failing (P2003 FK violation) on `question.deleteMany()` —
  upstream wave11-01 `review_fk_restrict` migration flipped ReviewState/ReviewLog→Question to
  onDelete:Restrict, but the seed's FK-safe delete block never cleared those two tables. Added
  `reviewLog.deleteMany()` + `reviewState.deleteMany()` before `question.deleteMany()`
  (prisma/seed.ts). Seed now exits 0 (2322 official questions); `npm run test:integration` 20
  files / 71 passed, 2 skipped. verify.sh exits 0.
- Artifacts: prisma/schema.prisma (TopicMastery.medianLatencyMs),
  prisma/migrations/20260702130000_topic_mastery_median_latency/migration.sql, prisma/seed.ts.

## Verify
**Last verify:** PASS (2026-07-01T22:44:23Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T22:46:01Z)
