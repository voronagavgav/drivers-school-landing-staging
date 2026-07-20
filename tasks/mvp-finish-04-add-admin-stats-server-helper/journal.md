# Task: mvp-finish-04-add-admin-stats-server-helper

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Add the DB aggregation helper that feeds the pure summarizer real `TestAnswer` data joined to
question text/topic, for the admin stats UI (task 05).

1. `lib/server/admin.ts` exports an async function (name `getQuestionPerformance`) that returns a
   Promise of an array where each entry includes at least:
   `{ questionId, text, topicTitle, isDemo, timesAnswered, correct, accuracy }`.
2. The helper reads real rows via Prisma (`prisma.testAnswer.findMany`) selecting `questionId` and
   `isCorrect`, then calls `summarizeQuestionPerformance` from `@/lib/question-stats` to compute the
   stats (DB→pure pattern, mirroring `lib/server/progress.ts`). It does NOT re-implement the
   accuracy/sort logic inline.
3. Each returned entry is enriched with the question's `text`, its topic `title` (or a fallback like
   `"Без теми"` when `topicId`/topic is null), and `isDemo`, by querying
   `prisma.question.findMany({ where: { id: { in: <ids> } }, ... })` (or an `include` on the answers)
   and joining in memory by id.
4. The returned array preserves the summarizer's HARDEST-FIRST order (lowest accuracy first, ties by
   most-answered). Questions with zero answers are NOT injected (only questions that appear in
   `TestAnswer` are reported) — the admin "hardest" view reflects answered questions.
5. The helper is a read-only query (no writes); the file keeps its `import "server-only";` at top and
   the existing exports are unchanged.
6. `npm run typecheck` exits 0. `npm test` still passes (unit suite unchanged; this is server code not
   covered by the default `npm test`).

## Constraints / decisions
- ONLY edit `lib/server/admin.ts` (add the new export + any needed import). Do NOT change the pure
  `lib/question-stats.ts`, the UI (task 05), or `prisma/schema.prisma`.
- Feed the pure function ONLY the answered rows (do NOT pass a `questionIds` universe) so never-answered
  questions don't pollute the hardest-first list — a deliberate scope decision; the per-question list =
  questions that have been answered at least once.
- Mirror the existing aggregation style in `lib/server/progress.ts` (findMany → in-memory join → pure
  function). Keep the topic-title fallback string consistent with that file (`"Без теми"`).
- Do NOT add pagination/filtering/category scoping in this task — return the full hardest-first list;
  the UI (task 05) decides how many to display. No analytics events.
- Non-Goal: rendering, route changes, admin nav changes.

## Plan
- [x] Add `getQuestionPerformance` to `lib/server/admin.ts`: findMany answers → summarize → fetch
      question metadata for the involved ids → join (text/topicTitle/isDemo), preserving order.
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] Implemented `getQuestionPerformance` in `lib/server/admin.ts` (DB→pure pattern: findMany
      TestAnswer{questionId,isCorrect} → `summarizeQuestionPerformance(rows)` → findMany Question
      metadata for the involved ids → in-memory join enriching text/topicTitle("Без теми" fallback)/
      isDemo, preserving the summarizer's hardest-first order). Exported `QuestionPerformanceRow`.
- [x] typecheck exits 0; `npm test` 38 passed (5 files). server-only retained; existing exports
      unchanged; only answered questions reported (no questionIds universe passed).

## Next
- [ ] Goal met — nothing pending. (Follow-up task 05 wires this into the admin questions UI.)

## Artifacts
- tasks/mvp-finish-04-add-admin-stats-server-helper/verify.sh — export present + uses pure fn + typecheck/test
- lib/server/admin.ts — `getQuestionPerformance` aggregation helper

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T09:20Z ClPcs-Mac-mini: implemented `getQuestionPerformance` + `QuestionPerformanceRow`
  in lib/server/admin.ts (imports `summarizeQuestionPerformance` from @/lib/question-stats; reads real
  prisma.testAnswer rows; joins question text/topic/isDemo; hardest-first order preserved; only answered
  questions). typecheck 0, npm test 38 passed. Status→done.

## Verify
**Last verify:** PASS (2026-06-17T06:20:28Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T06:21:30Z)
