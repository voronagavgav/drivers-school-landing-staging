# Task: wave5-01-investigate-learning-surfaces

**Status:** done
**Driver:** auto
**Updated:** 2026-06-22
**Last compute:** cloud-agent

## Goal
INVESTIGATION ONLY — produce a findings doc the later Wave-5 tasks build on. Do NOT change any
source file (only write the findings file below). Wave 5 surfaces three existing learning primitives;
this task records exactly WHERE the data and wiring points live so the implementation tasks don't
re-derive them in fresh context.

1. File `tasks/wave5-01-investigate-learning-surfaces/FINDINGS.md` exists and is non-empty.
2. FINDINGS.md documents, with exact file paths + line refs + signatures:
   a. The mistake-bank model (`UserMistake` in `prisma/schema.prisma`): all fields, the
      `@@unique([userId, questionId])`, and how a row maps to `EngineMistake`
      (`lib/test-engine/types.ts`) — including that `lastMistakeAt` is a `DateTime` converted via
      `.getTime()` to epoch ms, and `correctRepeatCount` / `mistakeCount` / `status` ("ACTIVE"|"RESOLVED").
   b. How `lib/server/test-engine.ts` queries active mistakes (`prisma.userMistake.findMany({ where:
      { userId, status: "ACTIVE" } })`) and maps them; and how `lib/server/mistakes.ts` `listMistakes`
      / `recordMistakeOutcome` behave.
   c. The pure progress layer (`lib/progress.ts`): `topicStats`, `accuracyOf`, `detectWeakTopics`,
      `estimateReadiness`, `readinessTrend`, the `TopicStat` shape, and the constants reused
      (`WEAK_TOPIC_ACCURACY_THRESHOLD`, `WEAK_TOPIC_MIN_ANSWERS`, `READINESS_MIN_ANSWERS`).
   d. The server progress layer (`lib/server/progress.ts`): `computeProgress` (and its `ProgressView`
      shape incl. `topicStats`/`weakTopics`/`recentExam`), `getRecentReadinessScores`,
      `getStudyActivity`, `computeWeakTopicIds` — exact signatures and what each returns.
   e. The dashboard (`app/(app)/dashboard/page.tsx`): that it is a server component, how it starts
      MISTAKE_PRACTICE (the `startTestAction` form with `<input name="mode">`) and how `/practice`
      starts TOPIC_PRACTICE (form with `name="topicId"`), and the EXISTING readiness disclaimer copy
      at the bottom of the readiness card (it already says "…не гарантує складання офіційного іспиту").
   f. How per-topic question TOTALS could be counted for a coverage ratio (answered ÷ topic total):
      the `Question`↔`Topic`↔`Category` relations and the live-pool `baseWhere`
      (`isActive`, `isPublished`, `archivedAt: null`, `categories: { some: { id } }`, plus the
      `SERVE_DEMO_QUESTIONS` demo gate) in `lib/server/test-engine.ts`.
   g. The integration-test fixture pattern (self-provisioning an `isDemo:false`/`OFFICIAL`
      `Category`+`Topic`+`Question` with `isPublished:true`, creating a `User`, and the FK-safe
      `afterAll` cleanup order user→questions→topic→category) — cite a concrete example file
      (e.g. `lib/server/demo-retired.integration.test.ts`) and `vitest.integration.config.ts`'s
      `server-only` stub.
   h. Unit-test conventions (`lib/test-engine/selection.test.ts`, `lib/streak.test.ts`): `vitest`
      `describe/it`, injected `rng`/`now`, `@/`-alias imports.
   i. Exact npm scripts: `typecheck`, `test`, `test:integration`, `db:seed`, `build`.
3. FINDINGS.md ends with a short "Open decisions for Wave 5" list noting: the source of
   `recentExamScores` for the exam-readiness heuristic (C) — `computeProgress().recentExam`
   ({passed,total}) vs `getRecentReadinessScores()` (readiness snapshot scores) — and the chosen
   place for the per-topic mastery view (new `/progress` route vs extend dashboard).

## Constraints / decisions
- READ-ONLY: this task writes ONLY `FINDINGS.md`. It must not edit `lib/`, `app/`, `prisma/`, or any
  other source. No new feature code, no schema change.
- Findings must cite REAL paths verified against the current tree (not assumed) — the later tasks
  trust them.
- Keep it concise and factual; this is a map, not a design doc. Do not pre-commit to implementation
  choices beyond the two "Open decisions" notes.

## Plan
- [x] Read `prisma/schema.prisma` (UserMistake, Question, Topic, Category) + `lib/test-engine/types.ts`.
- [x] Read `lib/server/test-engine.ts` (active-mistakes) + `lib/server/mistakes.ts` + `lib/progress.ts` + `lib/server/progress.ts`.
- [x] Read `app/(app)/dashboard/page.tsx`, `app/actions/test.ts`, `app/(app)/practice/*`.
- [x] Document §(f) coverage-ratio relations + live-pool `baseWhere`.
- [x] Read one `*.integration.test.ts` + `vitest.integration.config.ts` + `package.json` scripts → §(g)/(h)/(i).
- [x] Write the "Open decisions for Wave 5" closing list.

## Done
- [x] Read `prisma/schema.prisma` (UserMistake) + `lib/test-engine/types.ts`; captured the
      UserMistake↔EngineMistake mapping into FINDINGS.md §(a) (incl. `.getTime()` DateTime→epoch ms,
      `status` ACTIVE|RESOLVED filter, `@@unique([userId,questionId])`, and the existing
      `spacedMistakeOrder(mapped, Date.now())` clock-injection precedent).
- [x] Read `lib/server/test-engine.ts` (MISTAKE_PRACTICE active-mistakes query/map §113–132) and
      `lib/server/mistakes.ts` (`recordMistakeOutcome` §12–58 / `listMistakes` §60–68); appended
      FINDINGS.md §(b) — two-step fetch + demoWhere drop, the upsert-by-hand pure-state↔Prisma
      marshalling, listMistakes' worst-first ordering with no `take`/due filter, and the note that
      neither computes a clock-based "due" count (wave5-03's `countDueMistakes` is NEW).
- [x] Read `lib/progress.ts` (full module, §14–185) + the reused constants (`lib/constants.ts:88`–`96`);
      appended FINDINGS.md §(c) documenting `accuracyOf`, `TopicStat`, `topicStats`, `detectWeakTopics`
      (4-answer/0.6 gate, worst-first sort), `estimateReadiness` (NOT_ENOUGH_DATA gate at 20, the
      70/20 score parts + weak/mistake penalties, level bands), `readinessTrend` (±5 band), the
      `READINESS_LABEL`/`READINESS_TREND_LABEL` UI maps, and the values of the four reused constants.
- [x] Read `lib/server/progress.ts` (full module, §1–191) + verified `TestSession` fields
      (`prisma/schema.prisma:153`–`178`); appended FINDINGS.md §(d) — the `ProgressView` shape,
      `computeProgress` (4 parallel queries, per-topic Map aggregation, `recentExam` as a pass/fail
      session TALLY not a score array, `mistakes` scoped userId-only), `getStudyActivity` (the only
      clock-reader here), `computeWeakTopicIds` (thin wrapper re-running computeProgress),
      `getRecentReadinessScores` (≤8 snapshots, oldest→newest for `readinessTrend`), and `snapshotProgress`
      (the WRITER). Noted for wave5-09/10 that a per-exam numeric score is derivable from
      `correctAnswers/totalQuestions` though this layer reads only `result`.
- [x] Read `app/(app)/dashboard/page.tsx` (server component; `StartButton` helper §29–36, the
      MISTAKE_PRACTICE start card §220–224, recommended-action branch §72–81, readiness disclaimer
      §156–158), `app/actions/test.ts` (`startTestAction` §22–45), `app/(app)/practice/page.tsx`
      (TOPIC_PRACTICE form with `name="topicId"` §63–65, per-topic count map §19–29); appended
      FINDINGS.md §(e) — the `<form action={startTestAction}>` + hidden `name="mode"`/`name="topicId"`
      idiom, the `NoQuestionsError → /dashboard?empty=<mode>` breadcrumb feeding `EMPTY_NOTICE`, and the
      exact existing readiness disclaimer copy.
- [x] Read `lib/server/demo-retired.integration.test.ts` (self-provisioning fixture + FK-safe
      `afterAll` user→questions→topic→category + the `itDemoOff` compile-time skip guard) +
      `vitest.integration.config.ts` (the `server-only`→`test/empty-module.ts` stub, `@` alias,
      `include: ["**/*.integration.test.ts"]`, `fileParallelism:false`) + the two pure unit tests
      (`lib/test-engine/selection.test.ts` rng0/`now` injection + relative imports; `lib/streak.test.ts`
      `@/`-alias + `day(n)` helper) + `package.json` scripts; appended FINDINGS.md §(g)/(h)/(i).

## Next
- (none) Goal fully met. Evaluator REJECT (off-by-one file-length citation in §(g): "127 lines"
  vs actual 126) is now FIXED — corrected §(g) to 126 and also caught/fixed a second instance of
  the same class (`vitest.integration.config.ts` "19"→18); re-verified the other two file-length
  citations (dashboard 249, practice 77) are exact. All citations now match `awk END{NR}`.
  Nothing further for this investigation task; the implementation tasks (wave5-02…11) build on FINDINGS.md.

## Artifacts
- tasks/wave5-01-investigate-learning-surfaces/FINDINGS.md — the Wave-5 wiring map.

## Log
- 2026-06-22 cloud-agent: scaffolded by planner.
- 2026-06-22T00:00Z ClPcs-Mac-mini: read prisma/schema.prisma (UserMistake §209–227) + lib/test-engine/types.ts (EngineMistake §18–25) + the MISTAKE_PRACTICE map in lib/server/test-engine.ts §113–123; created FINDINGS.md §(a) documenting the row→EngineMistake mapping, `.getTime()` epoch-ms conversion, status filter, and `@@unique([userId,questionId])`.
- 2026-06-22T19:05Z ClPcs-Mac-mini: read lib/server/test-engine.ts (MISTAKE_PRACTICE active-mistakes query/map §113–132) + lib/server/mistakes.ts (full module, `recordMistakeOutcome` §12–58, `listMistakes` §60–68); appended FINDINGS.md §(b) — two-step fetch with `demoWhere`/published filter dropping retired questions, the by-hand upsert keyed on `userId_questionId` delegating ACTIVE↔RESOLVED logic to pure `applyAnswer`/`newMistake`, `listMistakes` worst-first ordering (no `take`/due filter), and the note that no existing helper computes a clock-based "due" count (wave5-03 `countDueMistakes` is NEW).
- 2026-06-22T19:25Z ClPcs-Mac-mini: read lib/progress.ts (full, §14–185) + the reused constants (lib/constants.ts:88–96, READINESS_LEVELS §62–69); appended FINDINGS.md §(c) — `accuracyOf` (div-by-zero-safe), `TopicStat`, `topicStats` (computes accuracy from raw counts), `detectWeakTopics` (≥4 answers & <0.6 acc, worst-first), `estimateReadiness` (NOT_ENOUGH_DATA gate at 20, accPart×70/examPart×20, weak×5 + min(mistakes,10)×1.5 penalties, clamp 0..100, level bands 40/65/85), `readinessTrend` (±5 band, non-mutating), the two UI label maps, and a constants table (20/0.6/4/5). Noted `recentExam:{passed,total}` matches `computeProgress().recentExam` for wave5-09/10.
- 2026-06-22T20:05Z ClPcs-Mac-mini: read app/(app)/dashboard/page.tsx (async RSC; StartButton §29–36, MISTAKE_PRACTICE card §220–224, recommended-action branch §72–81, readiness disclaimer §156–158) + app/actions/test.ts (startTestAction §22–45) + app/(app)/practice/page.tsx (TOPIC_PRACTICE form w/ name="topicId" §63–65, per-topic published-count map §19–29); appended FINDINGS.md §(e) — the `<form action={startTestAction}>` + hidden name="mode"/name="topicId" idiom (no client JS), the NoQuestionsError → /dashboard?empty=<mode> breadcrumb feeding EMPTY_NOTICE, categoryId always server-side, and the exact existing readiness disclaimer copy («…не гарантує складання офіційного іспиту»). Flagged that practice's per-topic count omits the SERVE_DEMO_QUESTIONS gate for §(f).
- 2026-06-22T19:45Z ClPcs-Mac-mini: read lib/server/progress.ts (full module, §1–191) + verified TestSession fields via prisma/schema.prisma:153–178; appended FINDINGS.md §(d) — `ProgressView` shape, `computeProgress` (4 parallel queries: answers incl. IN_PROGRESS / completed-session count / ACTIVE mistakes userId-only / ≤5 recent EXAM_SIMULATION; per-topic Map→topicStats→detectWeakTopics; `recentExam` is a pass/fail SESSION tally via `result==="PASSED"`, NOT a per-exam score; `repeatedMistakes` = mistakeCount>1), `getStudyActivity` (only Date.now() reader, UTC-day bucketing), `computeWeakTopicIds` (thin wrapper re-running computeProgress), `getRecentReadinessScores` (≤8 progressSnapshot.readinessScore, oldest→newest for readinessTrend), and `snapshotProgress` (the snapshot WRITER). Open-decisions note: a per-exam numeric score is derivable from `correctAnswers/totalQuestions` (on TestSession) though this layer projects only `result`.
- 2026-06-22T20:35Z ClPcs-Mac-mini: read prisma/schema.prisma Category/Topic/Question (§51–108) + lib/server/test-engine.ts demoWhere/baseWhere (§60–68) + re-checked app/(app)/practice/page.tsx per-topic count (§19–29); confirmed SERVE_DEMO_QUESTIONS=false (lib/constants.ts:46). Appended FINDINGS.md §(f) — Question↔Topic one-to-many via nullable `topicId` (drop the topicId:null bucket), Question↔Category MANY-TO-MANY (`@relation("QuestionCategories")`, no scalar FK → must scope by `categories:{some:{id}}`), Topic not category-scoped; the canonical `baseWhere` (isActive/isPublished/archivedAt:null/…demoWhere/categories filter) as the live-servable definition; a per-topic coverage TOTAL = `groupBy({by:["topicId"], where: baseWhere})` (noted baseWhere is module-local, not exported → task 07 re-derives it); and the CONTRAST that practice/page.tsx's count OMITS the demoWhere gate so it can over-count vs the real pool.
- 2026-06-22T21:05Z ClPcs-Mac-mini: read lib/server/demo-retired.integration.test.ts (127 lines: self-provisioning Category/Topic/Question(demo+official)/User fixture in beforeAll, FK-safe afterAll user→questions→topic→category, the `itDemoOff = SERVE_DEMO_QUESTIONS ? it.skip : it` compile-time skip guard) + vitest.integration.config.ts (server-only→test/empty-module.ts stub, `@` alias, include `**/*.integration.test.ts`, fileParallelism:false) + lib/test-engine/selection.test.ts (rng0/`now` injection, relative `./selection` imports, mk* helpers) + lib/streak.test.ts (`@/lib/streak` alias, `day(n)` epoch-ms helper) + package.json scripts; appended FINDINGS.md §(g) [fixture/cleanup/skip-guard + integration config], §(h) [pure unit-test conventions: vitest describe/it, inject rng/now, import-path-by-gate], §(i) [typecheck/test/test:integration/db:seed/build script table]. Only the closing "Open decisions" list remains for criterion #3.
- 2026-06-22T22:45Z ClPcs-Mac-mini: FIXED evaluator REJECT — §(g) cited demo-retired.integration.test.ts as "127 lines" but `awk END{NR}` reports 126; corrected to 126. Swept all `N lines)` file-length citations against the tree: also fixed `vitest.integration.config.ts` "19"→18 (same off-by-one class); re-verified dashboard/page.tsx (249) and practice/page.tsx (77) are exact. All file-length citations now match the real tree. Status → done.
- 2026-06-22T22:05Z ClPcs-Mac-mini: appended FINDINGS.md closing "## Open decisions for Wave 5" (criterion #3) — (1) the `recentExamScores` source for the exam-readiness heuristic: `computeProgress().recentExam` ({passed,total} pass/fail tally over ≤5 EXAM_SIMULATION sessions via `TestSession.result`) vs `getRecentReadinessScores()` (≤8 readiness SCORES 0..100 from snapshots), noting NEITHER is a per-exam numeric score (derivable from `correctAnswers/totalQuestions` on TestSession, not projected today) with a recommendation to add a small `getRecentExamScores` projection rather than overload either; (2) the mastery view home — recorded that the planner's wave5-08 brief already fixes it as a NEW `app/(app)/progress/page.tsx` route (mirroring /practice's RSC shape, linked from the dashboard via a LinkButton). Sanity-checked + corrected two stale source line refs (had copied FINDINGS.md's own line numbers): `recentExam` → progress.ts:28/76, `getRecentReadinessScores` → progress.ts:156–167 (verified via grep). All 3 criteria met → Status: done.








## Verify
**Last verify:** PASS (2026-06-22T19:01:34Z)

## Evaluation
**Last evaluation:** PASS (2026-06-22T19:03:26Z)
