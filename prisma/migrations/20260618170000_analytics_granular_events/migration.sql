-- Granular first-party analytics. ADDITIVE, data-preserving: every new column is NULLABLE
-- with no default, so existing AnalyticsEvent rows (and the typed recordEvent/ANALYTICS_EVENTS
-- path that writes eventName + payloadJson) are untouched. NO reseed / force-reset.
-- SQLite requires one ADD COLUMN per ALTER statement.

-- Freeform client-event fields (typed path leaves these NULL).
ALTER TABLE "AnalyticsEvent" ADD COLUMN "eventType" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "path" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "referrer" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "elementType" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "elementLabel" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "anonymousId" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "deviceType" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "viewport" TEXT;
-- ipHash: SHA-256(salt + ip) ONLY — a raw IP must never be stored here.
ALTER TABLE "AnalyticsEvent" ADD COLUMN "ipHash" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "metadata" TEXT;

-- Indexes for granular querying.
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");
CREATE INDEX "AnalyticsEvent_anonymousId_sessionId_idx" ON "AnalyticsEvent"("anonymousId", "sessionId");
