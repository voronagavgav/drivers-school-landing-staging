-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PassOutcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "predictedPassProbability" REAL NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "categoryId" TEXT,
    "readinessSnapshotId" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PassOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PassOutcome_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PassOutcome_readinessSnapshotId_fkey" FOREIGN KEY ("readinessSnapshotId") REFERENCES "ReadinessSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PassOutcome" ("categoryId", "createdAt", "id", "passed", "predictedPassProbability", "source", "userId") SELECT "categoryId", "createdAt", "id", "passed", "predictedPassProbability", "source", "userId" FROM "PassOutcome";
DROP TABLE "PassOutcome";
ALTER TABLE "new_PassOutcome" RENAME TO "PassOutcome";
CREATE INDEX "PassOutcome_createdAt_idx" ON "PassOutcome"("createdAt");
CREATE INDEX "PassOutcome_categoryId_idx" ON "PassOutcome"("categoryId");
CREATE INDEX "PassOutcome_readinessSnapshotId_idx" ON "PassOutcome"("readinessSnapshotId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

