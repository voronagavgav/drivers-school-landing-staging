# FINDINGS — Wave-5 learning-surface wiring map

Investigation-only map for Wave 5. Each section cites REAL paths/line refs verified against the
current tree. Sections (b)–(i) and "Open decisions" are filled by later increments of this task.

---

## (a) Mistake-bank model & `UserMistake` → `EngineMistake` mapping

### `UserMistake` (`prisma/schema.prisma:209`–`227`)

```prisma
model UserMistake {
  id                 String    @id @default(cuid())
  userId             String
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  questionId         String
  question           Question  @relation(fields: [questionId], references: [id], onDelete: Cascade)
  topicId            String?
  topic              Topic?    @relation(fields: [topicId], references: [id])
  mistakeCount       Int       @default(1)
  correctRepeatCount Int       @default(0)
  status             String    @default("ACTIVE")  // ACTIVE | RESOLVED
  lastMistakeAt      DateTime  @default(now())
  resolvedAt         DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@unique([userId, questionId])    // one mistake row per (user, question)
  @@index([userId, status])         // backs the ACTIVE-mistakes query
}
```

Field notes:
- **`status`** is a plain `String` (NOT a Prisma enum), default `"ACTIVE"`; the only other value is
  `"RESOLVED"`. Comment in schema documents the two values.
- **`lastMistakeAt`** is a `DateTime` (default `now()`). The pure engine wants epoch ms, so the
  wiring layer converts with `.getTime()` (see mapping below).
- **`mistakeCount`** default `1` (a row is created on the first miss), **`correctRepeatCount`**
  default `0` (incremented as the user re-answers correctly toward RESOLVED).
- **`resolvedAt`** nullable `DateTime`, set when `status` flips to `"RESOLVED"`.
- `onDelete: Cascade` on both `user` and `question` relations → deleting a User or Question removes
  its `UserMistake` rows automatically. `topic` relation has NO cascade (and `topicId` is nullable).
- **`@@unique([userId, questionId])`** — guarantees at most one mistake row per (user, question);
  upserts key on this pair.

### `EngineMistake` (`lib/test-engine/types.ts:18`–`25`)

The pure engine shape (decoupled from Prisma so selection/scoring stay unit-testable, no DB):

```ts
export interface EngineMistake {
  questionId: string;
  topicId: string | null;
  mistakeCount: number;
  correctRepeatCount: number;
  /** epoch ms of the last mistake — used to order recent repeats earlier */
  lastMistakeAt: number;
}
```

### The mapping (`lib/server/test-engine.ts:113`–`123`, MISTAKE_PRACTICE branch)

```ts
const mistakes = await prisma.userMistake.findMany({ where: { userId, status: "ACTIVE" } });
const mapped = mistakes.map((m) => ({
  questionId: m.questionId,
  topicId: m.topicId,
  mistakeCount: m.mistakeCount,
  correctRepeatCount: m.correctRepeatCount,
  lastMistakeAt: m.lastMistakeAt.getTime(),   // DateTime → epoch ms
}));
const ordered = spacedMistakeOrder(mapped, Date.now());  // spaced-repetition order; clock injected here
```

Mapping summary (`UserMistake` row → `EngineMistake`):

| `UserMistake` field   | `EngineMistake` field | conversion                          |
|-----------------------|-----------------------|-------------------------------------|
| `questionId`          | `questionId`          | identity                            |
| `topicId` (`String?`) | `topicId` (`\| null`) | identity                            |
| `mistakeCount`        | `mistakeCount`        | identity                            |
| `correctRepeatCount`  | `correctRepeatCount`  | identity                            |
| `lastMistakeAt` (`DateTime`) | `lastMistakeAt` (`number`) | **`.getTime()` → epoch ms** |
| `status`              | — (filter only)       | `where: { status: "ACTIVE" }` — not carried onto the shape |
| `id`/`resolvedAt`/`createdAt`/`updatedAt` | — | dropped (engine doesn't need them) |

Note for Wave 5: the wiring layer already calls `spacedMistakeOrder(mapped, Date.now())` and
INJECTS the clock — so a "due review" notion (task wave5-02/03) has a precedent for passing `now`
in from the server layer rather than reading the clock inside pure code.

---

## (b) Server mistake wiring — active-mistakes query/map + `lib/server/mistakes.ts`

### Active-mistakes query + map (`lib/server/test-engine.ts:113`–`132`, `MISTAKE_PRACTICE` branch)

The query fetches every ACTIVE row for the user (no category/topic scope, no `take`):

```ts
const mistakes = await prisma.userMistake.findMany({ where: { userId, status: "ACTIVE" } });
const mapped = mistakes.map((m) => ({
  questionId: m.questionId,
  topicId: m.topicId,
  mistakeCount: m.mistakeCount,
  correctRepeatCount: m.correctRepeatCount,
  lastMistakeAt: m.lastMistakeAt.getTime(),   // DateTime → epoch ms (see §a mapping table)
}));
const ordered = spacedMistakeOrder(mapped, Date.now());   // pure spaced-repetition order; clock injected
const qs = await prisma.question.findMany({
  where: { id: { in: ordered.map((m) => m.questionId) }, isActive: true, isPublished: true, ...demoWhere },
  include: { options: true },
});
const byId = new Map(qs.map((q) => [q.id, q]));
pool = ordered
  .map((m) => byId.get(m.questionId))
  .filter((q): q is NonNullable<typeof q> => q != null)   // drops unpublished/archived/demo-retired
  .map((q) => toEngineQuestion(q));
```

Key behaviours for Wave 5:
- **Two-step fetch**: ACTIVE `UserMistake` rows → `spacedMistakeOrder` (pure) → re-fetch the live
  question rows by id, FILTERED by `isActive:true, isPublished:true, ...demoWhere`. So a mistake on a
  question that was later unpublished/archived/demo-retired (`SERVE_DEMO_QUESTIONS` false) is dropped
  from the practice pool but the `UserMistake` row itself stays ACTIVE in the DB.
- The pool preserves `ordered`'s order (map over `ordered`, look up in `byId`) — `spacedMistakeOrder`
  decides priority, not the DB.
- `demoWhere = SERVE_DEMO_QUESTIONS ? {} : { isDemo: false }` (defined at `lib/server/test-engine.ts:60`)
  is spread into the re-fetch where-clause — same demo gate as every other live pool (see §f).
- After this, the generic count slice still applies: `count = DEFAULT_PRACTICE_QUESTION_COUNT`
  (line 175–176), then `selectQuestions(pool, { mode, count, … })` (line 184). An empty pool →
  `NoQuestionsError` (line 191).

### `lib/server/mistakes.ts` — full module (69 lines, `import "server-only"`)

Imports the PURE engine `lib/mistakes.ts` (`applyAnswer`, `newMistake`, type `MistakeState`) and the
`MistakeStatus` type from `lib/constants`. Two exported functions:

#### `recordMistakeOutcome(userId, questionId, topicId: string | null, isCorrect: boolean): Promise<void>` (lines 12–58)

Called from `submitAnswer` (`lib/server/test-engine.ts:350`) after EVERY answer. Reads its own clock
`const now = Date.now()` (line 18), then upsert-by-hand keyed on `@@unique([userId, questionId])`
(via `where: { userId_questionId: { userId, questionId } }`):
- **No existing row + correct** → return, nothing tracked (first-time-correct is not a mistake).
- **No existing row + wrong** → `newMistake(now)` (pure) → `prisma.userMistake.create` with
  `mistakeCount/correctRepeatCount/status` from the pure state and `lastMistakeAt: new Date(now)`.
- **Existing row** → rebuild `prev: MistakeState` from the row (`resolvedAt` via `.getTime()` or
  `null`), call `applyAnswer(prev, isCorrect, now)` (pure) → `prisma.userMistake.update` by `id`.
  Note `lastMistakeAt: isCorrect ? existing.lastMistakeAt : new Date(now)` — a correct repeat
  PRESERVES the old `lastMistakeAt` (only a fresh miss bumps it). All ACTIVE↔RESOLVED transition
  logic lives in the pure `applyAnswer`/`newMistake`; this fn is pure-state ↔ Prisma marshalling only.

#### `listMistakes(userId, onlyActive = true)` (lines 60–68)

```ts
return prisma.userMistake.findMany({
  where: { userId, ...(onlyActive ? { status: "ACTIVE" } : {}) },
  orderBy: [{ mistakeCount: "desc" }, { lastMistakeAt: "desc" }],
  include: { question: { include: { topic: true, options: true, explanation: true } } },
});
```

Returns FULL `UserMistake` rows with the question (+topic/options/explanation) joined, ordered
worst-first (most misses, then most recent). Default `onlyActive=true` filters to `status:"ACTIVE"`.
NO `take`/limit and NO `now`/due filter — this is the "review list" surface, distinct from the
spaced-order practice pool above. Wave 5's `countDueMistakes` (task 03) is a NEW helper, not a tweak
to either of these — neither currently computes a "due" count against a clock.

---

## (c) Pure progress layer — `lib/progress.ts` (186 lines, NO DB, NO `server-only`)

Pure functions the DB layer feeds aggregated rows into; the result is what the dashboard renders
(module header `lib/progress.ts:9`–`12`). Imports its tuning constants from `@/lib/constants` and the
`ReadinessLevel` type from there too (`lib/progress.ts:1`–`7`). All functions are deterministic — no
clock, no rng; `readinessTrend` explicitly "does not mutate `scores`".

### Constants reused (`lib/constants.ts:88`–`96`)

| constant                         | value  | used by                                  |
|----------------------------------|--------|------------------------------------------|
| `READINESS_MIN_ANSWERS`          | `20`   | `estimateReadiness` NOT_ENOUGH_DATA gate |
| `WEAK_TOPIC_ACCURACY_THRESHOLD`  | `0.6`  | `detectWeakTopics` accuracy cutoff       |
| `WEAK_TOPIC_MIN_ANSWERS`         | `4`    | `detectWeakTopics` min-answers gate      |
| `READINESS_TREND_THRESHOLD`      | `5`    | `readinessTrend` IMPROVING/DECLINING band |

`ReadinessLevel` is the `as const` union `READINESS_LEVELS` (`lib/constants.ts:62`–`69`):
`NOT_ENOUGH_DATA | NEEDS_PRACTICE | IMPROVING | ALMOST_READY | READY_FOR_EXAM_STYLE_PRACTICE`.

### `accuracyOf(correct: number, total: number): number` (`lib/progress.ts:14`–`16`)

`total <= 0 ? 0 : correct / total` — returns a 0..1 ratio, divide-by-zero-safe.

### `TopicStat` shape (`lib/progress.ts:18`–`24`)

```ts
export interface TopicStat {
  topicId: string;
  title: string;
  answered: number;
  correct: number;
  accuracy: number; // 0..1
}
```

### `topicStats(rows): TopicStat[]` (`lib/progress.ts:26`–`34`)

Input `rows: { topicId; title; answered; correct }[]` (raw counts, NO accuracy). Maps each row to a
`TopicStat`, computing `accuracy: accuracyOf(r.correct, r.answered)`. Pure shape transform — the
caller (`lib/server/progress.ts`, §d) supplies the per-topic counts.

### `detectWeakTopics(stats: TopicStat[]): TopicStat[]` (`lib/progress.ts:37`–`45`)

Filters `t.answered >= WEAK_TOPIC_MIN_ANSWERS (4)` AND `t.accuracy < WEAK_TOPIC_ACCURACY_THRESHOLD
(0.6)`, then **sorts ascending by accuracy** (`a.accuracy - b.accuracy`) → worst-first. A topic with
< 4 answers is NEVER weak regardless of accuracy.

### `estimateReadiness(input: ReadinessInput): ReadinessResult` (`lib/progress.ts:78`–`144`)

Input/output shapes (`lib/progress.ts:47`–`64`):

```ts
export interface ReadinessInput {
  uniqueAnswered: number;
  overallAccuracy: number;          // 0..1
  weakTopicCount: number;
  unresolvedMistakes: number;
  recentExam: { passed: number; total: number };  // recent exam simulations
}
export interface ReadinessReason { code: string; text: string; }  // text = Ukrainian, user-facing
export interface ReadinessResult { level: ReadinessLevel; score: number /*0..100*/; reasons: ReadinessReason[]; }
```

Scoring (explainable — always returns the `reasons` that produced the level):
- **Gate**: `uniqueAnswered < READINESS_MIN_ANSWERS (20)` → `{ level: "NOT_ENOUGH_DATA", score: 0 }`
  with a single `not_enough_data` reason; no further computation.
- `accPart = overallAccuracy * 70` (accuracy is the backbone, up to 70 pts).
- `examPart = examTotal > 0 ? (passed / examTotal) * 20 : 0` (recent exams add up to 20). Pushes a
  `recent_exam` reason when `examTotal > 0`, else a `no_recent_exam` nudge.
- `weakPenalty = weakTopicCount * 5` (subtracted; `weak_topics` reason when > 0).
- `mistakePenalty = Math.min(unresolvedMistakes, 10) * 1.5` (capped at 10 mistakes = 15 pts;
  `unresolved_mistakes` reason when > 0, mentions «Робота над помилками»).
- `score = clamp(Math.round(accPart + examPart − weakPenalty − mistakePenalty), 0, 100)`.
- Level bands: `<40 NEEDS_PRACTICE`, `<65 IMPROVING`, `<85 ALMOST_READY`,
  else `READY_FOR_EXAM_STYLE_PRACTICE`.

NOTE for wave5-09/10: `recentExam: { passed, total }` is the EXISTING exam-readiness input shape and
matches `computeProgress().recentExam` (see §d / Open decisions) — `examReadiness` (task 09) is a NEW
heuristic, separate from this `estimateReadiness`.

### `readinessTrend(scores: number[]): "IMPROVING"|"DECLINING"|"STABLE"` (`lib/progress.ts:152`–`166`)

`scores` ordered oldest→newest. `< 2 scores → "STABLE"`. Else `diff = latest − mean(earlier)`;
`diff > READINESS_TREND_THRESHOLD (5)` → IMPROVING, `diff < −5` → DECLINING, within band → STABLE.

### UI label maps (`lib/progress.ts:169`–`185`)

`READINESS_LABEL: Record<ReadinessLevel, string>` and `READINESS_TREND_LABEL: Record<"IMPROVING"|
"DECLINING"|"STABLE", string>` — Ukrainian display strings (e.g. `NOT_ENOUGH_DATA` →
"Недостатньо даних", IMPROVING → "Динаміка: вгору"). The UI maps the enum to these, not raw codes.

---

## (d) Server progress layer — `lib/server/progress.ts` (191 lines, `import "server-only"`)

DB aggregation that feeds the pure `lib/progress.ts` (§c) functions; module header line 12: "This is
what the dashboard renders." Imports `accuracyOf`, `detectWeakTopics`, `estimateReadiness`,
`topicStats` and the `ReadinessResult`/`TopicStat` types from `@/lib/progress` (lines 3–10). Two
module-local windows: `RECENT_EXAM_WINDOW = 5` (line 14), `RECENT_READINESS_WINDOW = 8` (line 15),
`MS_PER_DAY = 86_400_000` (line 105).

### `ProgressView` shape (`lib/server/progress.ts:17`–`30`)

```ts
export interface ProgressView {
  totalAnswered: number;
  uniqueAnswered: number;
  correct: number;
  wrong: number;
  accuracy: number;            // 0..1
  completedSessions: number;
  unresolvedMistakes: number;
  repeatedMistakes: number;
  topicStats: TopicStat[];     // §c TopicStat — all topics, not just weak
  weakTopics: TopicStat[];     // detectWeakTopics(topicStats)
  recentExam: { passed: number; total: number };
  readiness: ReadinessResult;  // §c estimateReadiness output
}
```

### `computeProgress(userId: string, categoryId?: string | null): Promise<ProgressView>` (lines 32–103)

`sessionWhere = categoryId ? { userId, categoryId } : { userId }` (line 36) — every query is scoped by
category when given, else all of the user's sessions. Four queries run in parallel (`Promise.all`,
lines 40–52):
1. `prisma.testAnswer.findMany({ where: { testSession: sessionWhere }, include: { question: { include: { topic: true } } } })` — every answer (incl. IN_PROGRESS sessions, no status filter), with question+topic joined.
2. `prisma.testSession.count({ where: { ...sessionWhere, status: "COMPLETED" } })` → `completedSessions`.
3. `prisma.userMistake.findMany({ where: { userId, status: "ACTIVE" } })` — ACTIVE mistakes (NOTE: scoped by `userId` only, NOT `categoryId`).
4. `prisma.testSession.findMany({ where: { ...sessionWhere, mode: "EXAM_SIMULATION", status: "COMPLETED" }, orderBy: { finishedAt: "desc" }, take: 5 })` — the recent exam sims.

Derived (lines 54–87):
- `totalAnswered = answers.length`; `correct = answers.filter(isCorrect).length`; `wrong = total − correct`;
  `uniqueAnswered = new Set(answers.map(a => a.questionId)).size`; `accuracy = accuracyOf(correct, totalAnswered)`.
- Per-topic aggregation: a `Map<topicId, {title, answered, correct}>` built by looping answers
  (skips `topicId == null`; title falls back to `"Без теми"`), then `stats = topicStats([...entries])`
  (§c) and `weakTopics = detectWeakTopics(stats)`.
- `recentExam = { total: examSessions.length, passed: examSessions.filter(s => s.result === "PASSED").length }`
  — **`total` is the COUNT of recent completed exam sessions (≤5), NOT a per-exam question total; `passed`
  is how many of those had `TestSession.result === "PASSED"`.** This is a pass/fail tally, not a score array.
- `readiness = estimateReadiness({ uniqueAnswered, overallAccuracy: accuracy, weakTopicCount: weakTopics.length, unresolvedMistakes: mistakes.length, recentExam })` (§c).
- `repeatedMistakes = mistakes.filter(m => m.mistakeCount > 1).length`.

### `getStudyActivity(userId, categoryId?): Promise<StudyActivity>` (lines 121–141)

```ts
export interface StudyActivity {
  activityDates: number[];   // epoch-ms of EVERY answer, for pure `studyStreak` to bucket
  answeredToday: number;     // answers whose UTC calendar day === current UTC day
}
```

Reads `prisma.testAnswer.findMany({ where: { testSession: sessionWhere }, select: { answeredAt: true } })`,
then **reads the clock**: `today = Math.floor(Date.now() / MS_PER_DAY)` (line 131, UTC day). Pushes each
`answeredAt.getTime()` into `activityDates` and counts `answeredToday` when its UTC day matches. (The only
fn here that touches `Date.now()`; `computeProgress`/`getRecentReadinessScores` are clock-free.)

### `computeWeakTopicIds(userId, categoryId?): Promise<string[]>` (lines 144–150)

Thin wrapper: `const p = await computeProgress(userId, categoryId); return p.weakTopics.map(t => t.topicId)`.
Used to bias `MIXED_PRACTICE` selection (comment line 143). Re-runs the FULL `computeProgress` query set.

### `getRecentReadinessScores(userId, categoryId?): Promise<number[]>` (lines 156–168)

```ts
const snapshots = await prisma.progressSnapshot.findMany({
  where: categoryId ? { userId, categoryId } : { userId },
  orderBy: { createdAt: "desc" }, take: 8 /* RECENT_READINESS_WINDOW */,
  select: { readinessScore: true },
});
return snapshots.map((s) => s.readinessScore).reverse();   // oldest→newest
```

Returns the last ≤8 `ProgressSnapshot.readinessScore` values (0..100 ints, from
`estimateReadiness().score`), **oldest→newest** — the exact ordering the pure `readinessTrend()` (§c)
expects. Empty array if the user has no snapshots yet.

### `snapshotProgress(userId, categoryId?): Promise<void>` (lines 171–190) — the snapshot WRITER

Not in the §(d) signature list but it is the SOURCE the snapshots above come from: runs
`computeProgress`, then `prisma.progressSnapshot.create` persisting `totalAnswered`, `uniqueAnswered`,
`accuracy`, `readinessLevel: readiness.level`, `readinessScore: readiness.score`, and a
`weakTopicsJson` (stringified `{topicId,title,accuracy}[]`). So `readinessScore` snapshots only exist
for sessions where this was called (after a completed session) — relevant to whether
`getRecentReadinessScores` has data for wave5-10's trend/readiness wiring.

NOTE for wave5-09/10 (exam-readiness heuristic input source): the two candidate sources surface
DIFFERENT things — `computeProgress().recentExam` is `{passed, total}` (a pass/fail tally over ≤5 recent
exam SESSIONS, via `TestSession.result`), whereas `getRecentReadinessScores()` is a `number[]` of
readiness SCORES (0..100) over ≤8 snapshots. Neither is a list of per-exam raw scores; if `examReadiness`
(task 09) wants `recentExamScores` as numeric exam results, that shape is NEW and must be derived — this
layer reads only `TestSession.result` (PASSED/FAILED), but the model ALSO carries
`correctAnswers`/`wrongAnswers`/`totalQuestions` (`prisma/schema.prisma:153`–`178`), so a per-exam
numeric score (`correctAnswers / totalQuestions`) is available from the same `examSessions` query —
it is simply not projected today. Captured for the "Open decisions" increment.

---

## (e) Dashboard + practice wiring — start-test forms & readiness disclaimer

### Dashboard (`app/(app)/dashboard/page.tsx`, 249 lines) — `async` server component

`export default async function DashboardPage({ searchParams })` (line 46). No `"use client"`; it is a
plain RSC that `await`s data and renders. Top-of-render flow:
- `const user = await requireUser()` (line 51); `if (!user.selectedCategoryId) redirect("/onboarding")`
  (line 52) — every query below is category-scoped by `user.selectedCategoryId`.
- `const { empty } = await searchParams` (line 54) — `searchParams` is a Promise (Next 16); `empty` is
  the failure breadcrumb `startTestAction` sets on a `NoQuestionsError` (see below); `EMPTY_NOTICE`
  (lines 38–44) maps each mode → a Ukrainian "nothing to do yet" notice rendered at lines 95–99.
- Data calls (all `await`, sequential): `computeProgress(user.id, user.selectedCategoryId)` → `p`
  (line 57, §d), `r = p.readiness` (line 58), `getRecentReadinessScores(...)` → `recentScores`
  (line 60), `readinessTrend(recentScores)` → `trend` (line 61, §c), `sparkline(recentScores)` when
  `≥2` points (line 63), `getStudyActivity(...)` → `activity` (line 65), `studyStreak(...)` (line 66),
  `getResumableSession(...)` (line 69).
- A "Recommended next action" branch (lines 72–81) picks a `{ text, mode, cta }`: `unresolvedMistakes
  > 0` → **MISTAKE_PRACTICE**; else `weakTopics.length > 0` → MIXED_PRACTICE; else `recentExam.total
  === 0` → EXAM_SIMULATION; else another EXAM_SIMULATION. Wave-5 due/mastery cards should slot near
  this block (it is the existing "what to do next" surface).

### How a test is started from the dashboard — the `startTestAction` form pattern

Every "start" control is a `<form action={startTestAction}>` with a hidden `<input name="mode">`. Two
shapes in this file:
- **`StartButton({ mode, label, variant })`** helper (lines 29–36): `<form action={startTestAction}>`
  + `<input type="hidden" name="mode" value={mode} />` + a `<SubmitButton>` carrying
  `data-track-label={`start_${mode}`}`. Used for the four quick-start cards (lines 213/218/223 +
  a `LinkButton href="/practice"` for topic practice at line 228). **MISTAKE_PRACTICE** is started by
  `<StartButton mode="MISTAKE_PRACTICE" label="Опрацювати помилки" />` (line 223), card titled
  «Робота над помилками» (lines 220–224).
- The "Recommended action" card (lines 185–188) inlines the same `<form action={startTestAction}>` +
  `<input type="hidden" name="mode" value={recommend.mode} />` directly (no helper), with
  `data-track-label={`recommend_${recommend.mode}`}`.

So a new Wave-5 dashboard card that launches a mode follows this exact idiom: a server-action form with
a hidden `name="mode"` (optionally `name="topicId"`) input — no client JS, no onClick.

### `startTestAction` (`app/actions/test.ts:22`–`45`, `"use server"`)

```ts
export async function startTestAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const mode = String(formData.get("mode") ?? "");
  const topicId = formData.get("topicId") ? String(formData.get("topicId")) : null;
  const parsed = startTestSchema.safeParse({ mode, topicId });
  if (!parsed.success) redirect("/dashboard");          // unknown mode → bounce, no engine touch
  let sessionId: string | null = null;
  try {
    sessionId = await startSession({ userId: user.id, mode: parsed.data.mode,
      categoryId: user.selectedCategoryId ?? null, topicId: parsed.data.topicId ?? null });
  } catch (e) {
    if (e instanceof NoQuestionsError) redirect(`/dashboard?empty=${parsed.data.mode}`);  // ← EMPTY_NOTICE breadcrumb
    throw e;
  }
  redirect(`/test/${sessionId}`);
}
```

Reads only `mode` + `topicId` from the FormData, validates via `startTestSchema` (`@/lib/validation`),
delegates to `startSession` (§b), and `redirect()`s to `/test/<id>` (or back to
`/dashboard?empty=<mode>` on an empty pool). `categoryId` always comes from `user.selectedCategoryId`
server-side (never from the form). The same action serves EXAM_SIMULATION / MIXED_PRACTICE /
MISTAKE_PRACTICE / TOPIC_PRACTICE — the mode string is the only switch.

### `/practice` (`app/(app)/practice/page.tsx`, 77 lines) — `async` server component, starts TOPIC_PRACTICE

`export default async function PracticePage()` (line 8). `requireUser()` + onboarding redirect, then:
- Loads `prisma.topic.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } })`
  (lines 13–16) — ALL active topics (NOT category-filtered).
- Counts published questions per topic IN the selected category (lines 19–29):
  `prisma.question.findMany({ where: { isActive: true, isPublished: true, archivedAt: null,
  categories: { some: { id: categoryId } } }, select: { topicId: true } })`, then a
  `Map<topicId, count>` built by looping. **This is the existing per-topic coverage-count pattern for §(f)
  — note it omits the `SERVE_DEMO_QUESTIONS`/`isDemo` gate that the live pool's `baseWhere` applies (§f).**
- Each topic card (lines 54–71) renders a `<Badge>{n} пит.</Badge>` and a
  `<form action={startTestAction}>` with **TWO** hidden inputs — `<input name="mode" value="TOPIC_PRACTICE" />`
  AND `<input name="topicId" value={t.id} />` (lines 63–65). The SubmitButton is `disabled={n === 0}`
  (label «Тренувати тему» when `n>0`, else «Немає питань»). There is also a top «Змішана практика» card
  starting MIXED_PRACTICE (lines 44–48). So `name="topicId"` is the wiring that scopes a session to one
  topic — set ONLY for TOPIC_PRACTICE.

### Existing readiness disclaimer copy (dashboard readiness card)

The readiness `<Card>` (lines 117–159) renders the `ReadinessMeter`, the trend `<Badge>` + sparkline
`<svg>`, the `reasons` list, and CLOSES with a disclaimer `<p>` (lines 156–158):

> «Показник готовності — внутрішня оцінка для підготовки. Він не гарантує складання офіційного іспиту.»

(`app/(app)/dashboard/page.tsx:157`.) This already disclaims that the readiness score does **not**
guarantee passing the official exam — Wave-5's exam-readiness estimate (task 10) should reuse / sit
beside this existing copy rather than introduce a competing or stronger claim.

---

## (f) Per-topic question TOTALS for a coverage ratio (answered ÷ topic total)

### The `Question`↔`Topic`↔`Category` relations (`prisma/schema.prisma:51`–`108`)

```prisma
model Category {                                   // :51
  code       String  @unique   // "B", "A", "C"
  questions  Question[]  @relation("QuestionCategories")   // many-to-many side
}
model Topic {                                      // :65
  displayOrder Int     @default(0)   // official section ordering (blueprint uses displayOrder-99)
  isActive     Boolean @default(true)
  questions    Question[]            // one-to-many: Question.topicId → Topic
}
model Question {                                   // :81
  topicId     String?                              // NULLABLE — a question MAY have no topic
  topic       Topic?   @relation(fields: [topicId], references: [id])
  isDemo      Boolean  @default(true)              // the demo gate (see baseWhere)
  isActive    Boolean  @default(true)
  isPublished Boolean  @default(false)             // defaults FALSE — must be set true to be live
  archivedAt  DateTime?                            // soft-delete; live pool requires null
  categories  Category[] @relation("QuestionCategories")   // MANY-TO-MANY (a Q can be in >1 category)
  @@index([topicId])                               // :106 — backs a per-topic count/group
  @@index([isPublished, isActive])                 // :107 — backs the baseWhere scan
}
```

Key relation facts for a coverage ratio:
- **`Question` ↔ `Topic` is one-to-many via the scalar `topicId` (`String?`, nullable).** So a topic's
  total = count of `Question` rows whose `topicId` equals that topic's id; questions with `topicId =
  null` belong to NO topic and must be excluded from any per-topic denominator (they’d otherwise vanish
  silently). `Topic.questions` is the relation side; `@@index([topicId])` (`:106`) backs the grouping.
- **`Question` ↔ `Category` is MANY-TO-MANY** (`@relation("QuestionCategories")`, implicit join) — a
  question can belong to multiple categories. A coverage total is therefore always *within one
  category*: filter by `categories: { some: { id: categoryId } }`, NOT by a scalar FK (there is none).
- A topic is NOT category-scoped (no `categoryId` on `Topic`) — the same Topic can hold questions in
  several categories. So the per-topic denominator is only meaningful when ALSO scoped to the selected
  category (the live pool always is).

### The live-pool `baseWhere` (`lib/server/test-engine.ts:60`–`68`)

```ts
const demoWhere = SERVE_DEMO_QUESTIONS ? {} : { isDemo: false };   // :60 — the demo retirement gate
const baseWhere = {                                                // :62
  isActive: true,
  isPublished: true,
  archivedAt: null,
  ...demoWhere,
  ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
};
```

`baseWhere` is the canonical definition of "a live, servable question": `isActive:true`,
`isPublished:true`, `archivedAt:null`, the spread `demoWhere`, and (when a category is given) the
many-to-many `categories: { some: { id: categoryId } }` filter. **`SERVE_DEMO_QUESTIONS` is currently
`false`** (`lib/constants.ts`) and the seed creates ONLY `isDemo:true` rows — so today `baseWhere`
excludes the entire seeded demo set from any live pool (the standing seed-vs-live gotcha in the
root CLAUDE.md learnings). Any coverage ratio that wants to match the pool a user actually practises
against MUST reuse this exact `baseWhere`, including the `demoWhere` spread.

**So a per-topic coverage TOTAL (the denominator of answered ÷ total) = count of `Question` rows
matching `baseWhere` grouped by `topicId`.** The natural query for Wave 5 (task 07's
`getTopicMastery` per-topic live-total groupBy) is:

```ts
prisma.question.groupBy({
  by: ["topicId"],
  where: { ...baseWhere /* incl. demoWhere + categories:{some:{id:categoryId}} */ },
  _count: { _all: true },
});                                   // → [{ topicId, _count: { _all } }, …]; drop the topicId:null bucket
```

(`baseWhere` is module-local to `startSession`, not exported — task 07 will need to re-derive the same
object, or factor it out; it is NOT importable as-is today.)

### Contrast: the un-gated per-topic count already in `/practice` (§e)

`app/(app)/practice/page.tsx:19`–`29` already counts published questions per topic, but with a
DIFFERENT (looser) where-clause than `baseWhere`:

```ts
prisma.question.findMany({
  where: { isActive: true, isPublished: true, archivedAt: null,
           categories: { some: { id: categoryId } } },   // ← NO demoWhere / isDemo filter
  select: { topicId: true },
});                                                       // then a Map<topicId, count> by looping
```

It **omits the `SERVE_DEMO_QUESTIONS`/`isDemo:false` gate**, so with the flag off it would count demo
questions that the live pool (`baseWhere`) actually filters OUT — its per-topic badge can therefore
*over-count* relative to what `MISTAKE_PRACTICE`/`TOPIC_PRACTICE` will really serve. (In practice the
seed is all-demo so this counts demo rows; the seeded numbers happen to be what `/practice` shows.)
For a HONEST coverage ratio Wave-5 should use `baseWhere` (demo-gated), not replicate this looser
clause — otherwise `answered ÷ total` could exceed 1 once live (official) content lands and the demo
denominator is wrong. It also uses `findMany + Map` rather than a `groupBy`; either works, but
`groupBy` is the lighter shape for a pure total.

---

## (g) Integration-test fixture pattern + `vitest.integration.config.ts`

Concrete example: `lib/server/demo-retired.integration.test.ts` (126 lines). It self-provisions an
OFFICIAL+DEMO question set, drives `startSession`, and cleans up FK-safely.

### Naming + harness

- File name ends `*.integration.test.ts` — this is the `include` glob the integration config matches
  (`vitest.integration.config.ts:15`). The default `npm test` config does NOT pick these up (they hit
  the seeded DB); only `npm run test:integration` (§i) runs them.
- Imports: `import { describe, it, expect, beforeAll, afterAll } from "vitest";` then the REAL
  server/db modules via the `@/` alias — `import { prisma } from "@/lib/db";`,
  `import { startSession } from "@/lib/server/test-engine";`,
  `import { SERVE_DEMO_QUESTIONS } from "@/lib/constants";` (lines 1–4). Integration tests import
  `@/lib/db` directly (unit tests never do — they stay pure).

### Self-provisioning fixture (`beforeAll`, lines 22–68)

Build a throwaway live pool the seed can't be relied on for (the seed is all-demo, see §f):

```ts
const category = await prisma.category.create({
  data: { code: `DEMO_RETIRE_${Date.now()}`, title: "Demo Retire Test", isActive: true },
});                                            // `code` is @unique → make it unique with Date.now()
const topic = await prisma.topic.create({ data: { title: `demo-retire-${Date.now()}`, isActive: true } });
const makeQuestion = async (text, isDemo) =>
  (await prisma.question.create({ data: {
    text, topicId: topic.id, difficulty: 1,
    sourceType: isDemo ? "DEMO" : "OFFICIAL", isDemo,
    isActive: true, isPublished: true,           // MUST set isPublished:true — default is false (§f)
    categories: { connect: { id: category.id } },// many-to-many connect (no scalar FK, §f)
    options: { create: [
      { text: "right", isCorrect: true,  displayOrder: 0 },
      { text: "wrong", isCorrect: false, displayOrder: 1 } ] },
  } })).id;
const u = await prisma.user.create({ data: {
  name: "…", email: `demo-retire-${Date.now()}@test.local`,  // unique email
  passwordHash: "x", role: "USER", selectedCategoryId: category.id } });
```

Essentials a Wave-5 fixture (tasks 05) must replicate: `isPublished:true` + `isActive:true` +
`isDemo:false`/`sourceType:"OFFICIAL"` + `categories.connect` to enter a live pool; nested
`options.create` (≥1 `isCorrect:true`) or the question is unanswerable; a `User` with
`selectedCategoryId` set; `Date.now()`-suffixed `code`/`email` to dodge `@unique` collisions across runs.

### FK-safe cleanup (`afterAll`, lines 70–76) — ORDER MATTERS

```ts
afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);          // 1. user FIRST
  await prisma.question.deleteMany({ where: { topicId } }).catch(() => undefined);     // 2. questions
  await prisma.topic.delete({ where: { id: topicId } }).catch(() => undefined);        // 3. topic
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);  // 4. category
  await prisma.$disconnect();
});
```

User is deleted FIRST so its session children (`TestSession`/`TestSessionQuestion`/`TestAnswer`,
`UserMistake`, `SavedQuestion`) cascade away and stop referencing the questions — otherwise the
`question.deleteMany` would FK-fail (`TestSessionQuestion`→Question is NOT a cascade; see the root
CLAUDE.md learning). Each delete is `.catch(() => undefined)` so a partial setup still tears down.
The order is the documented **user → questions → topic → category** chain.

### Compile-time skip guard (line 80)

`const itDemoOff = SERVE_DEMO_QUESTIONS ? it.skip : it;` — when a behavioural contract only holds
because a COMPILE-TIME constant has a known value, gate the `it` on it so flipping the flag makes the
skip reason explicit instead of silently asserting the wrong thing. (For RUNTIME DB preconditions use
vitest 4's `ctx.skip(cond, msg)` instead — see the root CLAUDE.md learning.)

### `vitest.integration.config.ts` (18 lines)

```ts
export default defineConfig({
  resolve: { alias: {
    "server-only": path.resolve(import.meta.dirname, "test/empty-module.ts"),  // stub the throw
    "@": path.resolve(import.meta.dirname, "."),
  } },
  test: { environment: "node", include: ["**/*.integration.test.ts"], fileParallelism: false },
});
```

- The **`server-only` alias** points at `test/empty-module.ts` (an empty stub) — `server-only` THROWS
  outside a Next server runtime, so importing real server modules (which `import "server-only"`) under
  vitest needs this. The `@` alias mirrors the app's path alias.
- `environment: "node"`, `include` is ONLY the `*.integration.test.ts` glob (keeps DB tests out of the
  default unit run), and `fileParallelism: false` — integration suites share one seeded SQLite DB, so
  they run serially to avoid cross-file interference.

---

## (h) Unit-test conventions — `lib/test-engine/selection.test.ts`, `lib/streak.test.ts`

Pure unit tests (no DB, no `server-only`, no real clock). Both use vitest `describe/it/expect`:
`import { describe, it, expect } from "vitest";` (selection.test.ts:1, streak.test.ts:1).

- **Import style differs by location**: `selection.test.ts` imports the unit under test RELATIVELY
  (`from "./selection"`, types `from "./types"`, lines 2–9) — sibling files in `lib/test-engine/`.
  `streak.test.ts` imports via the `@/` ALIAS (`import { studyStreak } from "@/lib/streak";`, line 2).
  Both resolve under vitest; pick by what the verify gate greps for (some gates require a literal
  `@/lib/…` string — see root CLAUDE.md).
- **Injected determinism, not real entropy**: a fixed rng `const rng0 = () => 0;`
  (selection.test.ts:12) makes Fisher–Yates a fixed rotation; the clock is passed in explicitly
  (`const now = 10 * DAY;` then `spacedMistakeOrder(m, now)`, lines 51–55). `streak.test.ts` feeds
  explicit epoch-ms via a `const day = (n) => n * DAY;` helper (lines 4–6). NEVER `Math.random()` /
  `Date.now()` inside a pure test — inject the seam the pure fn already exposes.
- **Small local factory helpers** at file top build fixtures tersely: `mkQ(id, topicId)` /
  `mkM(questionId, mistakeCount, correctRepeatCount, lastMistakeAt)` (selection.test.ts:14–25),
  `day(n)` (streak.test.ts:5).
- **Structure**: one `describe("<unit>.<fn>", …)` per function, nested `it("<behaviour phrase>", () =>
  {…})`; assertions are value-equality first — `expect(x).toEqual([...])`, `.toHaveLength(n)`,
  `.toContain(id)`, `.toBe(true)`. Tests also assert NON-mutation of inputs (selection.test.ts:35,78).

So a Wave-5 PURE test (tasks 02/06/09 — `due-mistakes`, `mastery`, `exam-readiness`) should mirror
this: `vitest` `describe/it/expect`, inject `now`/`rng`, build inputs with tiny `mk*` helpers, assert
exact shapes, and import the unit by whichever path its verify gate expects.

---

## (i) Exact npm scripts (`package.json:5`–`20`)

| script             | command                                              | role                                        |
|--------------------|------------------------------------------------------|---------------------------------------------|
| `typecheck`        | `tsc --noEmit`                                        | full TS check, no emit                      |
| `test`             | `vitest run`                                          | fast PURE unit suites (default config)       |
| `test:integration` | `vitest run --config vitest.integration.config.ts`   | DB-backed `*.integration.test.ts` (§g)       |
| `db:seed`          | `tsx prisma/seed.ts`                                 | seed the SQLite DB (also `prisma.seed` field)|
| `build`            | `next build`                                          | production build (Turbopack)                 |

Also present: `db:generate` (`prisma generate`), `db:migrate` (`prisma migrate dev` — INTERACTIVE,
avoid in agent shells, see root CLAUDE.md), `db:reset`, `db:studio`, `dev` (`next dev`), `start`
(`next start`), `lint` (`eslint`), `audit:browser` (`bash bin/browser-audit.sh` — the real-browser
http gate). Wave-5 verify gates will lean on `typecheck` + `test` + `test:integration` + `build`.

---

## Open decisions for Wave 5

Two choices the later tasks must make — recorded here so they are decided once, not re-derived in
fresh context. (This is a NOTE of the options + the constraint each carries, not a pre-commitment
beyond what the planner's task briefs already fix.)

### 1. Source of `recentExamScores` for the exam-readiness heuristic (tasks wave5-09 / wave5-10)

Task 09's pure `examReadiness({ recentExamScores, topicBands })` wants a list of recent exam
*scores*. The server progress layer (§d) exposes TWO candidate sources, and **neither is a list of
per-exam numeric scores today**:

- **`computeProgress().recentExam`** — `{ passed: number; total: number }` (interface
  `lib/server/progress.ts:28`, constructed `:76`). A pass/FAIL TALLY over the ≤5 most recent COMPLETED
  `EXAM_SIMULATION` sessions, derived from
  `TestSession.result === "PASSED"`. It is a count of passes, NOT individual scores — it loses each
  exam's actual percentage. This is the shape the EXISTING `estimateReadiness` (§c) already consumes.
- **`getRecentReadinessScores()`** — `number[]` of ≤8 `ProgressSnapshot.readinessScore` values
  (0..100), oldest→newest (`lib/server/progress.ts:156`–`167`). These are READINESS scores (the output
  of `estimateReadiness`), NOT exam scores — and they only exist where `snapshotProgress` was called
  (after a completed session, §d). Feeding these into `examReadiness` would make it a function of the
  prior readiness heuristic, not of raw exam results (risk of a feedback loop / double-counting).
- **Neither = per-exam raw score.** A genuine `recentExamScores: number[]` (one % per exam) is
  DERIVABLE but not projected today: the same recent-`EXAM_SIMULATION` query in `computeProgress`
  reads only `result`, yet `TestSession` ALSO carries `correctAnswers` / `wrongAnswers` /
  `totalQuestions` (`prisma/schema.prisma:153`–`178`), so `correctAnswers / totalQuestions` per
  session gives the true score array. **Recommendation:** if task 09/10 wants real exam scores, add a
  small projection (a new server helper, e.g. `getRecentExamScores(userId, categoryId)`, returning the
  `correctAnswers/totalQuestions` ratios from the existing ≤5-exam query) rather than overloading
  `recentExam` (pass/fail) or `getRecentReadinessScores` (readiness, not exam) — both of those carry a
  semantic mismatch. The smallest-surface fallback if a new helper is out of scope: pass
  `recentExam.passed/recentExam.total` as a single ratio. Decide in task 09/10; this task does not
  pick.

### 2. Home for the per-topic mastery view (tasks wave5-07 / wave5-08)

Where does the per-topic mastery surface live — a NEW `/progress` route, or extend the existing
dashboard readiness card?

- The dashboard (`app/(app)/dashboard/page.tsx`, §e) is already a dense `async` RSC (readiness meter,
  trend, sparkline, streak, recommended action, quick-start cards). It already calls `computeProgress`
  (so `topicStats`/`weakTopics` are in hand) — extending it adds no query but crowds the page.
- **The planner's wave5-08 brief names `app/(app)/progress/page.tsx` as a NEW route** (see the resume
  brief: "Create `app/(app)/progress/page.tsx` with the `getTopicMastery` call"). So the DECISION is
  already taken by the plan: a dedicated `/progress` server-component route, mirroring `/practice`'s
  RSC shape (§e — `requireUser()` + onboarding redirect + category-scoped queries), calling task 07's
  new `getTopicMastery` (`lib/server/mastery.ts`, the per-topic live-total `groupBy` over `baseWhere`,
  §f). The dashboard would then link to `/progress` (a `LinkButton href="/progress"`, the same idiom as
  the existing `href="/practice"` button, §e) rather than inline the full mastery table.

Both decisions are left to their owning tasks; this map only records the options + the constraint each
carries so the implementation tasks don't re-investigate the data sources.
