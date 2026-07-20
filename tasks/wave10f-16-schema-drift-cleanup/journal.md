# Task: wave10f-16-schema-drift-cleanup

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
Kill the pre-existing schema drift (F3) and prove drift-zero (F4). Delete the redundant
`@@index([questionKey])` / `@@index([optionKey])` from `prisma/schema.prisma` (redundant with their
`@unique`; they exist in NO migration), then confirm the migrations↔schema diff is EMPTY and the seed +
full integration suite stay green.

Boolean acceptance criteria:
1. `prisma/schema.prisma` no longer contains `@@index([questionKey])` or `@@index([optionKey])` (the
   `@unique` on `questionKey`/`optionKey` stays).
2. Drift-zero gate: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema
   prisma/schema.prisma --script` emits an EMPTY migration (no `CREATE`/`ALTER`/`DROP` statements — prisma
   prints its "empty migration" marker).
3. `npx prisma generate` exits 0.
4. `npm run db:seed` exits 0 (data preserved / re-seedable) then `npm run test:integration` exits 0.
5. `npm run typecheck` exits 0.

## Constraints / decisions
- These two indexes are pure SCHEMA drift — they exist in no migration, so deleting them from the schema
  needs NO migration SQL; the drift-diff simply goes empty afterwards. Do NOT author a migration to "drop"
  them (there is nothing in the DB to drop).
- Depends on wave10f-15 (its migration must already be deployed) so the drift-diff reflects only this
  cleanup. If the diff shows OTHER drift (e.g. an un-migrated index from a prior wave), STOP and report —
  do not silently fold unrelated drift into scope.
- Non-Goal: the FK/StudyDay migration (wave10f-15 owns it).

## Plan
- [x] Delete `@@index([questionKey])` and `@@index([optionKey])` from schema.prisma.
- [x] Run the migrate-diff gate; confirm empty.
- [x] `prisma generate`; `db:seed`; `test:integration`; `typecheck` — all 0.

## Next
- [x] Remove the two redundant `@@index` lines from schema.prisma. (Goal met.)

## Artifacts
- `prisma/schema.prisma` — removed `@@index([questionKey])` (Question) and `@@index([optionKey])` (QuestionOption).

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-02 ClPcs-Mac-mini: Deleted the two redundant `@@index` lines (schema.prisma:126 questionKey, :143 optionKey); `@unique` on both stays. Drift gate `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` → "This is an empty migration." (drift-zero). `prisma generate` 0, `typecheck` 0, `db:seed` 0 (2322 official questions upserted), `test:integration` 0 (20 files, 70 passed / 2 skipped). Status: done.

## Verify
**Last verify:** PASS (2026-07-01T21:15:52Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T21:17:23Z)
