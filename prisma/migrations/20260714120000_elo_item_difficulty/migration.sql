-- AlterTable: additive nullable Elo/Rasch item-difficulty column (wave22)
ALTER TABLE "Question" ADD COLUMN "eloBeta" REAL;

-- AlterTable: additive answer-count column with default (wave22)
ALTER TABLE "Question" ADD COLUMN "eloAnswerCount" INTEGER NOT NULL DEFAULT 0;
