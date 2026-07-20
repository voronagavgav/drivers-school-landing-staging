-- One answer per (session, question): supports idempotent upsert in lib/server/test-engine.ts
CREATE UNIQUE INDEX "TestAnswer_testSessionId_questionId_key" ON "TestAnswer"("testSessionId", "questionId");
