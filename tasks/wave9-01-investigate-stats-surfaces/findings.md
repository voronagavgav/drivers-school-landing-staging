# Wave-9 investigation — stats surfaces (de-risk notes for tasks 02–08)

Investigation-only output for `wave9-01`. Spec: `specs/wave9-content-stats.md` (§A–§F).
Compute-on-read, **NO schema change**. Every claim below is a `file:line` citation so the
downstream tasks compose on existing code instead of duplicating it.

Proposed exported names (keep tasks 02/03/04 consistent — see spec §A/§B/§C):
- `summarizeQuestion` — `lib/content-stats.ts` (PURE, task 02)
- `flagQuestion` — `lib/content-flags.ts` (PURE, task 03)
- `getContentHealth` — `lib/server/content-stats.ts` (server aggregation, task 04)

---

## 1. findings.md exists / non-empty
This file. Satisfies the gate's `-f`/`-s` checks (`tasks/wave9-01-investigate-stats-surfaces/verify.sh:8-9`).

## 2. REUSE point — `summarizeQuestionPerformance` and how `getQuestionPerformance` already composes it

**Pure summarizer** — `lib/question-stats.ts:19-49`:
```ts
export interface QuestionPerformance {       // lib/question-stats.ts:6-11
  questionId: string;
  timesAnswered: number;
  correct: number;
  accuracy: number; // 0..1
}
export function summarizeQuestionPerformance(
  rows: { questionId: string; isCorrect: boolean }[],
  questionIds?: string[],          // optional: seed never-answered ids as 0/0/0
): QuestionPerformance[]            // sorted hardest-first: accuracy asc, ties → most-answered first
```
- PURE (no DB, no `Date.now`/`Math.random`); does not mutate inputs (header comment `lib/question-stats.ts:1-18`).
- Accuracy rule: `timesAnswered <= 0 ? 0 : correct / timesAnswered` (`lib/question-stats.ts:42`).
- Sort: accuracy ascending, ties broken by `b.timesAnswered - a.timesAnswered` (`lib/question-stats.ts:44-48`).

**Existing server composition** — `lib/server/admin.ts::getQuestionPerformance` (`lib/server/admin.ts:300-328`):
1. `prisma.testAnswer.findMany({ select: { questionId: true, isCorrect: true } })` (`:301-303`)
2. `summarizeQuestionPerformance(rows)` (NO `questionIds` arg → only answered questions) (`:305`)
3. enrich via a second `prisma.question.findMany({ where: { id: { in: stats.map(...) } } })` →
   `Map` by id → `text`/`topicTitle`/`isDemo` (`:308-327`).

→ **Task 02 (`summarizeQuestion`) should compose this for the accuracy/counts spine** rather than re-deriving
`correct/timesAnswered/accuracy`. But note the input shape differs: `summarizeQuestionPerformance` keys on
`questionId`; `summarizeQuestion` works on ONE question's rows keyed on `optionKey`
(`{ optionKey, isCorrect, timeSpentSeconds }[]` per spec §A `specs/wave9-content-stats.md:20-24`). The natural
reuse: map the single question's rows to `{ questionId: <fixed>, isCorrect }[]`, call the summarizer for
`timesAnswered/correct/accuracy`, then add `avgTimeSeconds` + per-`optionKey` `picks`/`pickRate` in
`content-stats.ts` itself. (Note the §A spec naming: `correct` not `correctPicks`.)

**Task 04 (`getContentHealth`) mirrors the `getQuestionPerformance` two-query pattern** (read TestAnswer →
summarize → enrich by id), and ALSO mirrors `getAnalyticsDashboard`'s per-question fold + `enrichQuestionStats`
batching (`lib/server/admin.ts:517-538`, `:708-739`) — that fn already groups `answerRows` per question in a
`Map` and slices most-answered/most-mistaken. Reuse the `chunk(ids, IN_BATCH_SIZE)` (`IN_BATCH_SIZE = 400`,
`lib/server/admin.ts:452`, `chunk` from `@/lib/analytics-dashboard`) batched-`IN()` idiom to stay under the
libsql bound-param limit (CLAUDE.md learning: a single `in: [...]` with ~1k+ values throws `P2029`).

## 3. AGGREGATION join — TestAnswer × QuestionOption × Question (no schema change)

`prisma/schema.prisma`:
- **`model TestAnswer`** (`schema.prisma:195-210`): `questionId` (`:199`), `selectedOptionId String?`
  (`:201`), `selectedOption QuestionOption?` relation (`:202`), `isCorrect Boolean` (`:203`),
  `answeredAt` (`:204`), **`timeSpentSeconds Int?`** (`:205`, nullable → avg-time must treat null/0-sample
  as 0 per spec §A `specs/wave9-content-stats.md:23-24`). Indexes: `@@unique([testSessionId, questionId])`
  (`:207`), `@@index([testSessionId])` (`:208`), **`@@index([questionId])` (`:209`)** → confirms the
  per-question read is already indexed, **NO schema change**.
- **`model QuestionOption`** (`schema.prisma:114-129`): `questionId` (`:116`), `text` (`:118`),
  `isCorrect Boolean` (`:119`), `displayOrder` (`:120`), **`optionKey String? @unique`** (`:121`, stable
  content key from `lib/content-key.ts`). Indexes `@@index([questionId])` (`:127`),
  `@@index([optionKey])` (`:128`). Join: `TestAnswer.selectedOptionId → QuestionOption.id`, then read its
  `optionKey`/`isCorrect`. The pure `summarizeQuestion` keys options on `optionKey`, so the server layer must
  resolve `selectedOptionId → optionKey` (load the question's options, build an id→optionKey map). Some
  `selectedOptionId` may be null (skipped) — guard.
- **`model Question`** (`schema.prisma:81-112`): **`questionKey String? @unique`** (`:89`), `text` (`:83`),
  `topicId String?` (`:84`), `topic Topic?` relation (`:85`), `isDemo` (`:91`). Index `@@index([topicId])`
  (`:108`).
- **`model Topic`** (`schema.prisma:65-79`): `id`/`title` (`:66-67`) for the per-topic rollup label (spec §C
  topic rollups `specs/wave9-content-stats.md:42-43`).

Recommended fetch shape for `getContentHealth` (one pass, batched): `prisma.testAnswer.findMany({ select:
{ questionId, selectedOptionId, isCorrect, timeSpentSeconds } })`, plus `prisma.question.findMany` (the
answered ids, batched) with `include: { options: { select: { id, optionKey, isCorrect } }, topic: { select:
{ id, title } } }`. **No `where` user filter** — content health is global (task 07 asserts on specific
fixture questions, not totals).

## 4. UI host — admin gate, nav array, page to mirror

- **Admin gate**: `app/admin/layout.tsx:23` calls `const user = await requireContentManager();` for EVERY
  admin route (comment `:22`). So `app/admin/content-health/page.tsx` is automatically protected — it does
  NOT need its own gate, but spec §F.5 (`specs/wave9-content-stats.md:70-72`) + task 06 still want the page
  itself to import/call `requireContentManager()` (defense-in-depth + the static gate greps the page file).
  `requireContentManager` is from `@/lib/rbac` (`app/admin/layout.tsx:2`).
- **`NAV_LINKS`** array to extend: `app/admin/layout.tsx:8-15` (type `NavLink` from `@/app/admin/admin-nav`,
  `:6`). Add `{ href: "/admin/content-health", label: "Якість контенту" }` **after** the «Аналітика» entry
  (`app/admin/layout.tsx:14`) per spec §D (`specs/wave9-content-stats.md:51`) — task 06 owns this edit, NOT 01.
- **Page to mirror**: `app/admin/analytics/page.tsx` — `default`-exported **async server component**
  (`app/admin/analytics/page.tsx:52`), `searchParams: Promise<{...}>` is awaited (`:57`, Next 16 async
  params), fetches via a `@/lib/server/admin` helper (`:59`), renders KPI cards with
  `Stat` inside `Card` (`:100-123`), section headers via `SectionTitle` (`:96-99`), and closes with
  `<LegalDisclaimer />` (`:255`). Imports: `Card, SectionTitle, Stat` from `@/components/ui`
  (`app/admin/analytics/page.tsx:3`), `LegalDisclaimer` from `@/components/brand` (`:4`).
- **UI primitives available** (`components/ui.tsx`): `Card` (`:46`), `SectionTitle({ children, hint })`
  (`:54`), `Stat({ label, value, sub })` (`:150`), `Badge` (`:65`), `DemoBadge` (`:87`),
  `cx` classname helper (`:5`). The per-option pick-distribution bars + flag badges are NEW small
  presentational pieces → task 05 (`app/admin/content-health/parts.tsx`: `OptionDistribution`, `FlagBadge`);
  the analytics page's `BarList`/`TimeSeriesBars` live in a co-located `./charts` (`app/admin/analytics/page.tsx:11`),
  the same co-location pattern task 05 should follow.
- KPI strip (spec §D `specs/wave9-content-stats.md:49-51`): total answered, % questions with a flag, mean
  accuracy — derived in the page by a trivial reduce over `getContentHealth().questions` (task 06), NOT in
  the server helper.

## 5. TEST conventions

- **Unit vs integration split** (CLAUDE.md): `npm test` = fast PURE unit tests, no DB (config
  `vitest.config.ts`); `npm run test:integration` = DB-backed flow, separate config
  `vitest.integration.config.ts` (stubs `server-only` → empty), glob `**/*.integration.test.ts`. Pure
  tasks 02/03 add `lib/content-stats.test.ts` / `lib/content-flags.test.ts` to the DEFAULT unit suite;
  task 07 adds `lib/server/content-stats.integration.test.ts` to the integration suite. Do NOT let a
  DB-backed test into the default `npm test`.
- **Prove a test FILE is INCLUDED** with `npx vitest list` (the default reporter prints only a summary on
  all-pass and never lists filenames, so `npm test | grep <file>` never matches). Capture to a var FIRST to
  avoid SIGPIPE under `pipefail`:
  `x="$(npx vitest list || true)"; echo "$x" | grep -q content-stats.test`. For the integration file add the
  config flag: `npx vitest list --config vitest.integration.config.ts` (spec §F.3
  `specs/wave9-content-stats.md:67-68`, task 07 PASS item).
- **Integration fixture to reuse**: `lib/server/__testutils__/official-question.ts::createOfficialQuestion`
  (`:76-166`). Signature: `createOfficialQuestion(prisma, opts?)` → `{ userId, categoryId, topicId,
  questionIds, questionId, cleanup }` (`:54-70`, `:165`). Overrides incl. `count`, `categoryId`, `topicId`,
  `isPublished`, `isActive`, `archivedAt`, `difficulty`, **`options: OfficialOption[]`** (`:23-27`, `:29-52`)
  — task 07 sets `options` to a known set so a specific distractor can out-pick the correct option. `cleanup`
  is FK-safe (user→questions→topic→category, `:152-163`); call once in `afterAll` BEFORE `$disconnect`. The
  `prisma` client is a PARAMETER — the file imports only `import type { PrismaClient }` (`:14`), no
  `@/lib/db`/`server-only`, so it's runtime-agnostic and the suite owns the connection. A `__testutils__/*.ts`
  file is NOT collected by the integration glob (header `:1-4`), so it never runs as a suite itself.
- **Task 07 wrong-key fixture pattern** (spec §E `specs/wave9-content-stats.md:55-61`): build a throwaway
  OFFICIAL question via `createOfficialQuestion`, create a throwaway `TestSession` + `TestAnswer` rows so a
  `isCorrect:false` option gets MORE `picks` than the `isCorrect:true` option; pass a SMALL `minSample` to
  `getContentHealth({ minSample })` so a handful of answers clears the thin-data threshold; locate the fixture
  question in the returned `questions` by id/`questionKey` (NOT global totals — other rows exist) and assert
  it carries `WRONG_KEY_SUSPECTED`; add a healthy question and assert it has no flags. `TestAnswer` has
  `@@unique([testSessionId, questionId])` (`schema.prisma:207`) — to record multiple picks for one question,
  use MULTIPLE sessions (one answer per (session,question)).

## 6. NO schema change required; proposed names

**NO schema change** — this is COMPUTE-ON-READ over already-recorded `TestAnswer` data; `TestAnswer` already
carries `selectedOptionId`/`isCorrect`/`timeSpentSeconds` (`schema.prisma:201-205`) and already has
`@@index([questionId])` (`schema.prisma:209`); `QuestionOption.optionKey` (`:121`) and `Question.questionKey`
(`:89`) already exist (Wave-7 stable keys). Spec confirms: "COMPUTE-ON-READ — no schema change, no new table"
(`specs/wave9-content-stats.md:6-7`) and §F.5 gate asserts `prisma/schema.prisma` is NOT modified
(`specs/wave9-content-stats.md:71-72`). No `prisma migrate`/`db push`/`generate` in any wave-9 task.

Proposed exports (restated for consistency): `summarizeQuestion` (`lib/content-stats.ts`),
`flagQuestion` (`lib/content-flags.ts`), `getContentHealth` (`lib/server/content-stats.ts`).
Flag set (spec §B `specs/wave9-content-stats.md:28-34`): `WRONG_KEY_SUSPECTED` (a distractor out-draws the
keyed answer; the answer-key-error catch), `LOW_DISCRIMINATION` (accuracy ≈ `1/optionCount`),
`INSUFFICIENT_DATA` (`timesAnswered < minSample`, emitted INSTEAD of the others — never flag on thin data).

**Purity reminder** (CLAUDE.md + wave9-02 journal Goal item 2): the §A/§B purity gates grep the WHOLE file
(incl. comments) for exactly these tokens — `server-only`, `@/lib/db`, `@prisma/client`, `lib/generated`,
`Math.random`, `Date.now`, `new Date`. Don't write those literal tokens in doc comments of the pure modules.
Reusing `summarizeQuestionPerformance` is explicitly ALLOWED and EXPECTED — task 02's gate does NOT forbid that
token; importing the already-pure `./question-stats` is the intended reuse path ("do not re-derive accuracy
logic", wave9-02 journal `:16-18`).
