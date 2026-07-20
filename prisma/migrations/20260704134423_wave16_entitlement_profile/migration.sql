-- AlterTable
ALTER TABLE "UserStudyProfile" ADD COLUMN "examOutcome" TEXT;
ALTER TABLE "UserStudyProfile" ADD COLUMN "examOutcomeDate" DATETIME;
ALTER TABLE "UserStudyProfile" ADD COLUMN "examOutcomeReportedAt" DATETIME;
ALTER TABLE "UserStudyProfile" ADD COLUMN "prepMode" TEXT;

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'FREE',
    "purchasedAt" DATETIME,
    "examDate" DATETIME,
    "validUntil" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_userId_key" ON "Entitlement"("userId");

