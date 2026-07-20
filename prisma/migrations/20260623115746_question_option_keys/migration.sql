-- Stable content keys for upsert-by-key (see lib/content-key.ts). ADDITIVE, data-preserving:
-- each column is NULLABLE with no default, so existing Question/QuestionOption rows are
-- untouched (the loader backfills keys later — task 05). NO reseed / force-reset.
-- SQLite requires one ADD COLUMN per ALTER statement.
ALTER TABLE "Question" ADD COLUMN "questionKey" TEXT;

ALTER TABLE "QuestionOption" ADD COLUMN "optionKey" TEXT;

-- Upserts look rows up by key; a unique index enforces the @unique in schema.prisma.
CREATE UNIQUE INDEX "Question_questionKey_key" ON "Question"("questionKey");

CREATE UNIQUE INDEX "QuestionOption_optionKey_key" ON "QuestionOption"("optionKey");
