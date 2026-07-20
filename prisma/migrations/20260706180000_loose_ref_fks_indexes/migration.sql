-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProgressSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "totalAnswered" INTEGER NOT NULL DEFAULT 0,
    "uniqueAnswered" INTEGER NOT NULL DEFAULT 0,
    "accuracy" REAL NOT NULL DEFAULT 0,
    "readinessLevel" TEXT NOT NULL DEFAULT 'NOT_ENOUGH_DATA',
    "readinessScore" REAL NOT NULL DEFAULT 0,
    "weakTopicsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgressSnapshot_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProgressSnapshot" ("accuracy", "categoryId", "createdAt", "id", "readinessLevel", "readinessScore", "totalAnswered", "uniqueAnswered", "userId", "weakTopicsJson") SELECT "accuracy", "categoryId", "createdAt", "id", "readinessLevel", "readinessScore", "totalAnswered", "uniqueAnswered", "userId", "weakTopicsJson" FROM "ProgressSnapshot";
DROP TABLE "ProgressSnapshot";
ALTER TABLE "new_ProgressSnapshot" RENAME TO "ProgressSnapshot";
CREATE INDEX "ProgressSnapshot_userId_createdAt_idx" ON "ProgressSnapshot"("userId", "createdAt");
CREATE INDEX "ProgressSnapshot_categoryId_idx" ON "ProgressSnapshot"("categoryId");
CREATE TABLE "new_ReadinessSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "passProbability" REAL NOT NULL DEFAULT 0,
    "dialPercent" INTEGER NOT NULL DEFAULT 0,
    "coverage" REAL NOT NULL DEFAULT 0,
    "calibrationSlope" REAL,
    "bottleneckTopicId" TEXT,
    "bottleneckTitle" TEXT,
    "inputsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadinessSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadinessSnapshot_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ReadinessSnapshot" ("bottleneckTitle", "bottleneckTopicId", "calibrationSlope", "categoryId", "coverage", "createdAt", "dialPercent", "id", "inputsJson", "passProbability", "userId") SELECT "bottleneckTitle", "bottleneckTopicId", "calibrationSlope", "categoryId", "coverage", "createdAt", "dialPercent", "id", "inputsJson", "passProbability", "userId" FROM "ReadinessSnapshot";
DROP TABLE "ReadinessSnapshot";
ALTER TABLE "new_ReadinessSnapshot" RENAME TO "ReadinessSnapshot";
CREATE INDEX "ReadinessSnapshot_userId_createdAt_idx" ON "ReadinessSnapshot"("userId", "createdAt");
CREATE INDEX "ReadinessSnapshot_categoryId_idx" ON "ReadinessSnapshot"("categoryId");
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
    CONSTRAINT "ReviewLog_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewLog_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReviewLog_testSessionId_fkey" FOREIGN KEY ("testSessionId") REFERENCES "TestSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ReviewLog" ("clientEventId", "confidence", "createdAt", "elapsedDays", "grade", "id", "latencyMs", "mode", "priorDifficulty", "priorStability", "questionId", "reviewedAt", "scheduledDays", "testSessionId", "topicId", "userId") SELECT "clientEventId", "confidence", "createdAt", "elapsedDays", "grade", "id", "latencyMs", "mode", "priorDifficulty", "priorStability", "questionId", "reviewedAt", "scheduledDays", "testSessionId", "topicId", "userId" FROM "ReviewLog";
DROP TABLE "ReviewLog";
ALTER TABLE "new_ReviewLog" RENAME TO "ReviewLog";
CREATE UNIQUE INDEX "ReviewLog_clientEventId_key" ON "ReviewLog"("clientEventId");
CREATE INDEX "ReviewLog_userId_reviewedAt_idx" ON "ReviewLog"("userId", "reviewedAt");
CREATE INDEX "ReviewLog_userId_questionId_idx" ON "ReviewLog"("userId", "questionId");
CREATE INDEX "ReviewLog_topicId_idx" ON "ReviewLog"("topicId");
CREATE INDEX "ReviewLog_testSessionId_idx" ON "ReviewLog"("testSessionId");
CREATE TABLE "new_TopicMastery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "categoryId" TEXT,
    "meanR" REAL NOT NULL DEFAULT 0,
    "coverage" REAL NOT NULL DEFAULT 0,
    "band" TEXT NOT NULL DEFAULT 'weak',
    "itemsSeen" INTEGER NOT NULL DEFAULT 0,
    "itemsTotal" INTEGER NOT NULL DEFAULT 0,
    "medianLatencyMs" INTEGER,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopicMastery_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TopicMastery" ("band", "categoryId", "computedAt", "coverage", "id", "itemsSeen", "itemsTotal", "meanR", "medianLatencyMs", "topicId", "userId") SELECT "band", "categoryId", "computedAt", "coverage", "id", "itemsSeen", "itemsTotal", "meanR", "medianLatencyMs", "topicId", "userId" FROM "TopicMastery";
DROP TABLE "TopicMastery";
ALTER TABLE "new_TopicMastery" RENAME TO "TopicMastery";
CREATE INDEX "TopicMastery_userId_band_idx" ON "TopicMastery"("userId", "band");
CREATE INDEX "TopicMastery_categoryId_idx" ON "TopicMastery"("categoryId");
CREATE UNIQUE INDEX "TopicMastery_userId_topicId_key" ON "TopicMastery"("userId", "topicId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

