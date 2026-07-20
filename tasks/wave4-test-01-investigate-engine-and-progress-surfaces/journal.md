# Task: wave4-test-01-investigate-engine-and-progress-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** ClPcs-Mac-mini

## Goal
INVESTIGATION ONLY (no production code, no test code, no commits beyond this journal). Map exactly how
to construct the Wave 4 section-A engine edge-case integration tests (tasks 02–04) and the section-B
progress-at-volume test (task 05), so those tasks can each be written in one context window. "Done" =
the `## Findings` section below answers every item with concrete `file:symbol` references.

1. Findings name which existing integration test already covers spec-A case 4 ("finishing an
   already-COMPLETED session stays idempotent / no duplicate snapshot") — the file and the key
   assertion — so tasks 02–04 do NOT re-implement it.
2. Findings document the throwaway-data recipe used by existing tests: how a throwaway `User` is
   created in `beforeAll` and deleted in `afterAll` (`lib/server/engine.integration.test.ts`,
   `finish-idempotency.integration.test.ts`), the `Date.now()`-keyed email convention, and the
   cleanup ORDER constraint from CLAUDE.md (delete Users before throwaway Questions —
   `TestSessionQuestion`/`TestAnswer`→Question are NOT cascades). State which seeded `Category` code
   the tests reuse (`code: "B"`).
3. Findings explain, with `lib/test-engine/selection.ts` line refs (`selectQuestions`,
   `prioritizeWeakTopics`), the DETERMINISTIC guarantee for MIXED_PRACTICE: all weak-topic questions
   are ordered BEFORE all non-weak ones (shuffled only WITHIN each band), then sliced to
   `DEFAULT_PRACTICE_QUESTION_COUNT`. State the implication for task 03 (assert displayOrder BANDS,
   not exact order; keep the throwaway pool ≤ the count so nothing is sliced away).
4. Findings describe how `lib/server/test-engine.ts:startSession` builds each pool: EXAM_SIMULATION
   count from `DEFAULT_EXAM_QUESTION_COUNT` (=20); SAVED_QUESTIONS filters
   `isActive && isPublished && archivedAt === null` (`test-engine.ts:~92`); MIXED_PRACTICE uses
   `computeWeakTopicIds`. Confirm `session.totalQuestions === selected.length` (so a short pool yields
   a short-but-complete session, and `finishSession` over it still computes a result).
5. Findings state how `lib/server/progress.ts:computeProgress` aggregates (counts ALL `testAnswer`
   rows for the user's sessions in the category; per-topic via `topicStats`; weak detection via
   `detectWeakTopics` using `WEAK_TOPIC_MIN_ANSWERS`=4 and `WEAK_TOPIC_ACCURACY_THRESHOLD`=0.6;
   readiness via `estimateReadiness` needing `READINESS_MIN_ANSWERS`=20 UNIQUE answers) — i.e. the
   minimum throwaway data task 05 must seed to make totals/per-topic/weak/readiness non-trivial, and
   the fact that `computeProgress` is a pure read so calling it twice yields identical numbers (stable).
6. Findings name how to create + tear down throwaway published `Question`+`Option` rows under a
   throwaway `Topic` in the seeded `Category "B"` (so 02–04 build small controlled pools), and confirm
   NO schema change is required for any of tasks 02–05.

## Constraints / decisions
- READ-ONLY investigation. Do not write any `*.ts`/`*.tsx`, run migrations, or seed. The only file you
  edit is this journal's `## Findings`.
- Non-Goal: implementing the tests (tasks 02–05 do that). Do not propose schema changes — Wave 4 is
  explicitly no-schema-change (`specs/wave4-testing.md` "Out of scope").
- Prefer reusing the seeded `Category code "B"` and creating throwaway Topics/Questions under it (per
  the existing integration-test convention) over mutating seeded rows.

## Plan
- [x] Read the four existing `*.integration.test.ts` files + `lib/server/test-engine.ts`,
  `lib/server/progress.ts`, `lib/test-engine/selection.ts`, `lib/constants.ts`, `prisma/schema.prisma`.
- [x] Write `## Findings` answering items 1–6 with `file:symbol` refs.

## Done
- [x] Read all engine/progress/selection sources + existing integration tests + seed + schema, and
  recorded `## Findings` answering items 1–6 with concrete `file:symbol` references.

## Next
- [ ] (none — Goal met; tasks 02–05 consume these Findings.)

## Findings

### 1. Idempotency case (spec-A case 4) is ALREADY covered — do NOT re-implement in 02–04
- File: `lib/server/finish-idempotency.integration.test.ts`.
- `describe("finishSession is idempotent")` → `it("finishing an already-completed session does not duplicate the snapshot or change counts")` (line 33).
- KEY assertion: `expect(snapshotsAfterSecond).toBe(snapshotsAfterFirst)` (line 73) — proves the second `finishSession` on an already-`COMPLETED` session adds NO `ProgressSnapshot` row; backed by stored-count-unchanged asserts (second.total/correct/wrong/result === first, lines 66–69; session.correctAnswers/wrongAnswers/result unchanged, lines 77–79). A second test asserts a non-owner finish throws `INVALID_SESSION` (line 82).
- The guard lives at `lib/server/test-engine.ts:finishSession` lines 289–300 (`if (session.status !== "IN_PROGRESS") return { ...stored summary }` BEFORE the `snapshotProgress` call at line 329). Tasks 02–04 must NOT add idempotency assertions.

### 2. Throwaway-data recipe used by existing integration tests
- `beforeAll` (e.g. `engine.integration.test.ts:12–25`, identical shape in `finish-idempotency.integration.test.ts:12–25`):
  - Look up seeded category: `const cat = await prisma.category.findFirstOrThrow({ where: { code: "B" } }); categoryId = cat.id;` — **the tests reuse seeded `Category code "B"`.**
  - Create throwaway user with the `Date.now()`-keyed email convention: `email: \`it-${Date.now()}@test.local\`` (prefix varies per file: `it-`, `finish-idem-`), `passwordHash: "x"`, `role: "USER"`, `selectedCategoryId: categoryId`. Keep `userId = u.id`.
- `afterAll` (lines 27–30): `await prisma.user.delete({ where: { id: userId } }).catch(() => undefined); await prisma.$disconnect();`. Deleting the user cascades all its children.
- **Cleanup ORDER constraint (CLAUDE.md):** when a test also creates throwaway `Question`s, delete the **User BEFORE the throwaway Questions**. `TestSessionQuestion.question` (`schema.prisma:179`) and `TestAnswer.question` (`schema.prisma:191`) have **NO `onDelete`** (non-cascade) → a Question still referenced by a session row won't delete. Deleting the User (`User`→`TestSession` is `onDelete: Cascade`, `schema.prisma:153`) cascades `TestSession`→`TestSessionQuestion` (`schema.prisma:177`) and `TestAnswer` (`schema.prisma:189`) first, freeing the Questions.
- Test harness: `vitest.integration.config.ts` aliases `server-only` → `test/empty-module.ts` and `@` → repo root; `include: ["**/*.integration.test.ts"]`, `fileParallelism: false` (so vitest mocks don't leak across files). Run via `npm run test:integration`. Import from `@/lib/db`, `@/lib/server/test-engine`, `@/lib/server/progress`.

### 3. MIXED_PRACTICE determinism — weak-topic BAND ordering (task 03)
- `lib/test-engine/selection.ts:prioritizeWeakTopics` (lines 84–93): partitions the pool into `inWeak = pool.filter(q => q.topicId && weak.has(q.topicId))` and `rest = pool.filter(q => !(…))`, then returns `[...shuffle(inWeak, rng), ...shuffle(rest, rng)]`. So **every weak-topic question is ordered before every non-weak question; shuffle happens only WITHIN each band.**
- `lib/test-engine/selection.ts:selectQuestions` (lines 99–128): `case "MIXED_PRACTICE"` (lines 114–116) calls `prioritizeWeakTopics`, then `return ordered.slice(0, Math.max(0, opts.count))` (line 127). `opts.count` for MIXED is `DEFAULT_PRACTICE_QUESTION_COUNT` (=20) — set at `test-engine.ts:103–104`.
- The real `startSession` path passes NO `rng` (`test-engine.ts:108–113`) → `selectQuestions` defaults `rng = Math.random` (line 103) → within-band order is nondeterministic.
- **Implication for task 03:** assert displayOrder **BANDS**, not exact order — i.e. read `TestSessionQuestion` rows (ordered by `displayOrder`) and assert all weak-topic `questionId`s occupy the lowest `displayOrder`s (a contiguous prefix) and all non-weak ones follow. Keep the throwaway pool **≤ DEFAULT_PRACTICE_QUESTION_COUNT (20)** so `.slice` drops nothing (else band members at the tail could be cut, breaking the "all weak appear" assumption).

### 4. How `startSession` builds each pool, and short-but-complete sessions
`lib/server/test-engine.ts:startSession` (lines 45–139). `baseWhere = { isActive:true, isPublished:true, archivedAt:null, ...(categoryId ? { categories: { some: { id: categoryId } } } : {}) }` (lines 54–59).
- **EXAM_SIMULATION** — `count = DEFAULT_EXAM_QUESTION_COUNT` (=20) (lines 103–104). Pool = all questions matching `baseWhere` (lines 95–101). `selectQuestions` shuffles (`selection.ts:117/123`) then slices to `count` (line 127). If the category has **fewer than 20** published questions, the session runs SHORT.
- **SAVED_QUESTIONS** — `prisma.savedQuestion.findMany({ where:{userId}, orderBy:{createdAt:"desc"}, include:{question:{include:{options:true}}} })` then `.filter(q => q.isActive && q.isPublished && q.archivedAt === null)` (**lines 83–93, the filter at line 92**). `selectQuestions` uses `[...pool]` (NO shuffle for SAVED) sliced to `DEFAULT_PRACTICE_QUESTION_COUNT`.
- **MIXED_PRACTICE** — `weakTopicIds = await computeWeakTopicIds(userId, categoryId)` (lines 105–106), pool = `baseWhere` questions, then `prioritizeWeakTopics` (see §3).
- **`session.totalQuestions === selected.length`** is set at `test-engine.ts:127` (`totalQuestions: selected.length`); the ordered list is created at lines 128–130 (`displayOrder: i`). A short pool → a short-but-complete session. `finishSession` computes `total = session.totalQuestions || session.answers.length` (line 302) and still returns a result (`PASSED`/`FAILED` for exams via `evaluateExam`, line 308). `if (selected.length === 0) throw new NoQuestionsError()` (line 115).
- **CAVEAT for task 02 (exam short pool):** seeded `Category B` currently has **16** published questions (`prisma/seed.ts` QUESTIONS array, 16 entries) — already < 20 — but `wave3-feat-11-expand-seed-content` may grow it past 20, and adding throwaway questions under B only INFLATES the B pool. For a DETERMINISTIC short pool, task 02 should create its **own throwaway `Category`** (unique `code`, e.g. `\`W4-${Date.now()}\``) with a known small count (e.g. 3) of throwaway published questions connected to it, then `startSession({ mode:"EXAM_SIMULATION", categoryId: <throwawayCatId> })` and assert `totalQuestions === 3` and the session finishes with a result. Reusing B would make the count depend on seed size.

### 5. `computeProgress` aggregation + minimum data for task 05; stability
`lib/server/progress.ts:computeProgress` (lines 32–103). `sessionWhere = categoryId ? { userId, categoryId } : { userId }` (lines 36–38).
- Counts **ALL `testAnswer` rows** for the user's sessions in the category: `prisma.testAnswer.findMany({ where:{ testSession: sessionWhere }, include:{ question:{ include:{ topic:true } } } })` (lines 41–44). `totalAnswered = answers.length` (54); `correct` (55); `uniqueAnswered = new Set(answers.map(a => a.questionId)).size` (57); `accuracy = accuracyOf(correct, totalAnswered)` (58).
- **Per-topic:** `byTopic` map (lines 61–70) → `topicStats(...)` (`lib/progress.ts:topicStats`, lines 27–34).
- **Weak detection:** `detectWeakTopics(stats)` (progress.ts:74; `lib/progress.ts:detectWeakTopics` lines 37–45) keeps topics with `answered >= WEAK_TOPIC_MIN_ANSWERS` (=4, `constants.ts:86`) AND `accuracy < WEAK_TOPIC_ACCURACY_THRESHOLD` (=0.6, `constants.ts:84`), sorted ascending by accuracy.
- **Readiness:** `estimateReadiness({ uniqueAnswered, overallAccuracy, weakTopicCount, unresolvedMistakes, recentExam })` (progress.ts:81–87; `lib/progress.ts:estimateReadiness` lines 78–144). If `uniqueAnswered < READINESS_MIN_ANSWERS` (=20, `constants.ts:82`) → `level:"NOT_ENOUGH_DATA", score:0`. Otherwise score = `accuracy*70 + (passed/total)*20 − weakTopicCount*5 − min(unresolved,10)*1.5`, clamped 0..100; level bands at `<40 NEEDS_PRACTICE / <65 IMPROVING / <85 ALMOST_READY / else READY…`.
- **Minimum throwaway data for task 05** (to make totals/per-topic/weak/readiness all non-trivial): seed **≥ 20 UNIQUE answered questions** (so readiness escapes `NOT_ENOUGH_DATA`) across **≥ 2 topics**, with **one topic having ≥ 4 answers at < 60% accuracy** (so it is detected weak). Easiest: create ≥20 throwaway published questions split across 2+ throwaway topics under a category, run one or more sessions answering all (deterministically: answer the weak topic mostly wrong, the rest correct), `finishSession`, then assert `computeProgress` numbers.
- **Stability:** `computeProgress` is a pure READ (only `findMany`/`count`, no writes; `snapshotProgress` is the separate writer at lines 171–190). Calling it twice against unchanged DB state yields identical numbers — task 05 can call it twice and assert deep-equality of `{ totalAnswered, uniqueAnswered, correct, wrong, accuracy, completedSessions, weakTopics, readiness.level, readiness.score }`.

### 6. Throwaway published Question+Option recipe + teardown; NO schema change
Pattern mirrors `prisma/seed.ts:307–334` (question.create with options) and the existing `beforeAll`:
- **Topic:** `const topic = await prisma.topic.create({ data: { title: \`wave4-${Date.now()}\`, isActive: true } });`
- **Published question** (note defaults: `isPublished` defaults to **false** at `schema.prisma:88`, so it MUST be set true; `isActive` defaults true, `archivedAt` defaults null):
  ```ts
  await prisma.question.create({ data: {
    text: "...", topicId: topic.id, difficulty: 1,
    sourceType: "DEMO", isDemo: true, isActive: true, isPublished: true,
    categories: { connect: { id: categoryId } },        // Category "B" or a throwaway cat
    options: { create: [
      { text: "right", isCorrect: true,  displayOrder: 0 },
      { text: "wrong", isCorrect: false, displayOrder: 1 },
    ] },
  }});
  ```
  At least one `isCorrect:true` option is required by `submitAnswer`/scoring. Connecting to the category satisfies `baseWhere.categories.some.id`. For task 04, also create variants with `isPublished:false` or `archivedAt: new Date()` and `savedQuestion.create({ data:{ userId, questionId } })` to prove the `test-engine.ts:92` filter excludes them.
- **Teardown ORDER** (afterAll):
  1. `await prisma.user.delete({ where: { id: userId } })` — cascades `TestSession`→`TestSessionQuestion`/`TestAnswer`, plus `UserMistake`/`SavedQuestion`/`ProgressSnapshot` (all `User onDelete: Cascade`), removing the rows that reference the throwaway Questions via NON-cascade FKs.
  2. `await prisma.question.deleteMany({ where: { topicId: topic.id } })` — cascades `QuestionOption` (`schema.prisma:110` Cascade), `QuestionExplanation`, and any remaining `UserMistake`/`SavedQuestion` by `question` FK (Cascade). Implicit `QuestionCategories` join rows drop automatically.
  3. `await prisma.topic.delete({ where: { id: topic.id } })` (and the throwaway Category, if created, after its questions are gone). `Question.topicId` is optional/non-cascade so questions must be gone first.
  4. `await prisma.$disconnect();`
- **NO schema change is required for any of tasks 02–05** — all use existing models (`Category`, `Topic`, `Question`, `QuestionOption`, `TestSession`, `TestSessionQuestion`, `TestAnswer`, `SavedQuestion`, `UserMistake`, `ProgressSnapshot`) and fields. Matches `specs/wave4-testing.md` "Out of scope: No schema change".

## Artifacts
- (this journal's Findings section) — construction notes for tasks 02–05.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: investigation complete. Read `lib/server/test-engine.ts`,
  `lib/server/progress.ts`, `lib/progress.ts`, `lib/test-engine/selection.ts`, `lib/constants.ts`,
  `prisma/schema.prisma` + `prisma/seed.ts`, all four `*.integration.test.ts` files, and
  `vitest.integration.config.ts`. Filled `## Findings` 1–6 with `file:symbol`/line refs. Notable: the
  idempotency case (A-4) is already covered by `finish-idempotency.integration.test.ts` (do not
  re-implement); seeded Category B has only 16 published questions so task 02's short-exam test should
  use its OWN throwaway Category for a deterministic count rather than reusing B. No code/test files
  written. Status → done.

## Verify
**Last verify:** PASS (2026-06-17T15:57:04Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T15:59:46Z)
