-- Stable basename-without-ext image key on Question. ADDITIVE, data-preserving:
-- the column is NULLABLE with no default, so existing Question rows are untouched
-- (the importer/seed backfill keys later). NO reseed / force-reset.
-- SQLite requires one ADD COLUMN per ALTER statement.
ALTER TABLE "Question" ADD COLUMN "imageKey" TEXT;

-- Resolver lookups are by key; the index is cheap insurance and matches the schema.
CREATE INDEX "Question_imageKey_idx" ON "Question"("imageKey");
