-- CreateTable
CREATE TABLE "PassOutcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "predictedPassProbability" REAL NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "categoryId" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PassOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PassOutcome_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PassOutcome_createdAt_idx" ON "PassOutcome"("createdAt");

-- CreateIndex
CREATE INDEX "PassOutcome_categoryId_idx" ON "PassOutcome"("categoryId");

