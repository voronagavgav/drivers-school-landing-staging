-- wave10f-15: Protect the FSRS corpus + review state from a Question hard-delete.
--
-- ReviewLog.question and ReviewState.question FKs move from ON DELETE CASCADE to
-- ON DELETE RESTRICT, matching TestAnswer's protection of historical corpus. A
-- Question hard-delete must no longer silently destroy the optimizer's training
-- rows (ReviewLog is the append-only FSRS spine) nor per-user scheduling state.
-- ReviewState rows are individually cheap to regenerate, but a Restrict FK trades
-- that cheapness for CONSISTENCY: a delete that would orphan review state is
-- refused loudly rather than cascading a surprise data loss. Questions should be
-- soft-retired (isActive/archivedAt), not hard-deleted, so Restrict is the safe
-- default; a deliberate purge can clear these child rows explicitly first.
--
-- SQLite cannot ALTER a foreign key's action, so each table is rebuilt
-- (create-new / copy-all / drop-old / rename) preserving every column, default,
-- index and the ReviewLog.clientEventId UNIQUE exactly — only the questionId FK's
-- on_delete action changes.
--
-- Also drops the redundant StudyDay_userId_day_idx: it is fully covered by the
-- StudyDay_userId_day_key UNIQUE (removed the duplicate @@index in schema.prisma).

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReviewState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "stability" REAL NOT NULL DEFAULT 0,
    "difficulty" REAL NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'new',
    "dueAt" DATETIME,
    "lastReviewedAt" DATETIME,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "lastGrade" INTEGER,
    "lastConfidence" INTEGER,
    "lastLatencyMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewState_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ReviewState" ("createdAt", "difficulty", "dueAt", "id", "lapses", "lastConfidence", "lastGrade", "lastLatencyMs", "lastReviewedAt", "questionId", "reps", "stability", "state", "updatedAt", "userId") SELECT "createdAt", "difficulty", "dueAt", "id", "lapses", "lastConfidence", "lastGrade", "lastLatencyMs", "lastReviewedAt", "questionId", "reps", "stability", "state", "updatedAt", "userId" FROM "ReviewState";
DROP TABLE "ReviewState";
ALTER TABLE "new_ReviewState" RENAME TO "ReviewState";
CREATE INDEX "ReviewState_userId_state_idx" ON "ReviewState"("userId", "state");
CREATE INDEX "ReviewState_userId_dueAt_idx" ON "ReviewState"("userId", "dueAt");
CREATE UNIQUE INDEX "ReviewState_userId_questionId_key" ON "ReviewState"("userId", "questionId");
CREATE TABLE "new_ReviewLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "topicId" TEXT,
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grade" INTEGER NOT NULL,
    "elapsedDays" REAL NOT NULL,
    "priorStability" REAL,
    "priorDifficulty" REAL,
    "scheduledDays" REAL,
    "confidence" INTEGER,
    "latencyMs" INTEGER,
    "mode" TEXT NOT NULL,
    "testSessionId" TEXT,
    "clientEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewLog_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ReviewLog" ("clientEventId", "confidence", "createdAt", "elapsedDays", "grade", "id", "latencyMs", "mode", "priorDifficulty", "priorStability", "questionId", "reviewedAt", "scheduledDays", "testSessionId", "topicId", "userId") SELECT "clientEventId", "confidence", "createdAt", "elapsedDays", "grade", "id", "latencyMs", "mode", "priorDifficulty", "priorStability", "questionId", "reviewedAt", "scheduledDays", "testSessionId", "topicId", "userId" FROM "ReviewLog";
DROP TABLE "ReviewLog";
ALTER TABLE "new_ReviewLog" RENAME TO "ReviewLog";
CREATE UNIQUE INDEX "ReviewLog_clientEventId_key" ON "ReviewLog"("clientEventId");
CREATE INDEX "ReviewLog_userId_reviewedAt_idx" ON "ReviewLog"("userId", "reviewedAt");
CREATE INDEX "ReviewLog_userId_questionId_idx" ON "ReviewLog"("userId", "questionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- DropIndex
DROP INDEX "StudyDay_userId_day_idx";
