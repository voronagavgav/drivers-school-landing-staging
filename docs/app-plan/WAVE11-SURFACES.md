# Wave 11 — Surface Findings (insertion points & existing shapes)

**INVESTIGATION ONLY** (wave11-01). No product code changed. Every downstream Wave-11 task
(wave11-02 … wave11-15) is de-risked here by pinning exact `file:line` anchors + the existing
shapes it must thread through. Line numbers are as of 2026-07-02 (`main`); treat them as
grep anchors — if a line drifted, grep the quoted token.

---

## 1. `startSession` — the `ADAPTIVE_REVIEW` / `SPACED_REVIEW` branch point (wave11-05)

- **File:** `lib/server/test-engine.ts`
- **`baseWhere` built at** `lib/server/test-engine.ts:57`; the pool is composed by the
  blueprint / mode `if/else if` chain starting `lib/server/test-engine.ts:85`
  (`if (blueprint)`), `:107` (`MISTAKE_PRACTICE`), `:127` (`SAVED_QUESTIONS`), `:138`
  (`else` — the generic EXAM/TOPIC/MIXED lightweight pool).
- **Insertion point:** an `ADAPTIVE_REVIEW` branch belongs as a new `else if` in that chain,
  BEFORE the generic `else` at `lib/server/test-engine.ts:138`, and it needs to run AFTER
  `baseWhere` exists (`:57`) but it will build its own pool (due `ReviewState` rows), not use
  `baseWhere`'s published-question scan directly. The empty-pool guard already exists at
  `lib/server/test-engine.ts:178` (`if (selected.length === 0) throw new NoQuestionsError()`),
  so an adaptive mode with nothing due reuses the existing `NoQuestionsError` → redirect path.
- **Cycle check (CONFIRMED SAFE):** `test-engine.ts` ALREADY imports from `./study`
  (`import { recordReview } from "./study"` at `lib/server/test-engine.ts:18`). `lib/server/study.ts`
  imports only `@/lib/db`, `@/lib/generated/prisma/client` (type), and `@/lib/fsrs`
  (`lib/server/study.ts:1-3`) — it does NOT import `./test-engine`. So test-engine may import
  any new adaptive-queue helper from `./study` (or a new `./adaptive`) with **no import cycle**,
  same as it already does for `recordReview`. Keep the pure queue math in
  `lib/test-engine/*` (the queue-overrides unit test target of wave11-05) and the DB read in
  `lib/server/*`.

## 2. `submitAnswer` — latency-band override thread point (wave11-04, wave11-07)

- **File:** `lib/server/test-engine.ts`
- **`question.topicId` is known** from the `prisma.question.findUnique(... include:{topic:true})`
  at `lib/server/test-engine.ts:318`. Inside the tx, the FSRS write is the
  `await recordReview(tx, { ... }, now)` call at **`lib/server/test-engine.ts:376`**, gated by
  `if (!priorAttempt)` at `lib/server/test-engine.ts:375` (first-attempt-per-session only).
- **The `recordReview` param object** (`lib/server/test-engine.ts:378-389`) currently carries:
  `userId, questionId, topicId: question.topicId, correct, latencyMs, confidence, mode,
  testSessionId, clientEventId`. To thread a per-topic band override, read
  `TopicMastery.medianLatencyMs` for `(userId, question.topicId)` before the call and pass an
  override into `recordReview`, which forwards it to `deriveGrade`.
- **`deriveGrade` signature (wave11-04):** `lib/fsrs/grade.ts:28` —
  `deriveGrade(input: DeriveGradeInput): Grade` with `DeriveGradeInput { correct, latencyMs?,
  confidence? }` (`lib/fsrs/grade.ts:20-26`). The global bands are the constants
  `FSRS_EASY_LATENCY_MS` / `FSRS_HARD_LATENCY_MS` (`lib/fsrs/grade.ts:13-14`, applied at
  `lib/fsrs/grade.ts:33-34`). wave11-04 adds per-topic median-latency override args; wave11-07's
  new `lib/fsrs/latency-bands.ts` computes the bands from a topic's median. `recordReview` calls
  `deriveGrade({ correct, latencyMs, confidence })` at `lib/server/study.ts:93` — that call site
  is where the override must be forwarded.

## 3. `finishSession` — recompute wire point (wave11-08)

- **File:** `lib/server/test-engine.ts`
- **`snapshotProgress(...)` is called at `lib/server/test-engine.ts:463`**
  (`await snapshotProgress(userId, session.categoryId)`), the last statement before the
  `return` at `lib/server/test-engine.ts:465`. The TopicMastery + ReadinessSnapshot recompute
  (wave11-08's `lib/server/mastery-readiness.ts`) wires in AFTER line 463, before the return.
- **Deriving touched topics + category:** the session row loaded at
  `lib/server/test-engine.ts:417` includes `answers` (`include: { answers: true }`) but NOT the
  questions' topics. `session.categoryId` is available directly. To get the touched `topicId`s,
  either (a) query `TestAnswer → question.topicId` for this session, or (b) read the distinct
  `ReviewLog.topicId` rows written this session (`ReviewLog.testSessionId` — `schema.prisma:328`).
  Prefer reading the session's answered questions' `topicId`s; `computeProgress` already does the
  `answer → question.topic` join pattern at `lib/server/progress.ts:62-70`.

## 4. Prisma shapes (CONFIRMED — all already exist; wave11-02 adds ONE field)

`prisma/schema.prisma`:
- **`ReviewState`** — `schema.prisma:285`. `@@unique([userId, questionId])` (`:306`); fields
  `stability, difficulty, state, dueAt, lastReviewedAt, reps, lapses, lastGrade, lastConfidence,
  lastLatencyMs`. Index `@@index([userId, dueAt])` (`:308`) is the due-queue picker for wave11-05.
- **`ReviewLog`** — `schema.prisma:312`. `clientEventId @unique` (`:329`, GLOBAL not per-user);
  `topicId?` (`:318`), `testSessionId?` (`:328`), `mode` (`:327`), `latencyMs?` (`:326`).
- **`TopicMastery`** — `schema.prisma:337`. `@@unique([userId, topicId])` (`:350`); fields
  `meanR, coverage, band ("weak|learning|strong"), itemsSeen, itemsTotal, computedAt`.
  **NO `medianLatencyMs` yet** — that is exactly the field wave11-02 adds
  (`medianLatencyMs Int?`). Grep confirms the token `medianLatencyMs` is absent from the schema
  today.
- **`ReadinessSnapshot`** — `schema.prisma:388`. `passProbability, dialPercent (Int 0..100),
  coverage, calibrationSlope?, bottleneckTopicId?, bottleneckTitle?, inputsJson (default "{}")`.
  Index `@@index([userId, createdAt])` (`:402`).
- **`UserStudyProfile`** — `schema.prisma:355`. `userId @unique` (`:357`); `examDate?, dailyGoal
  (default 15), timezone, streakCurrent, streakBest, lastStudyDay?, freezeTokens (default 2),
  freezeAutoUsedOn?, calibrationSlope?`.
- **`StudyDay`** — `schema.prisma:374`. `@@unique([userId, day])` (`:384`); `day ("YYYY-MM-DD"),
  reviewCount, goalMet, usedFreeze`.

## 5. Blueprint → `ReadinessBlock {quota, meanProb}` mapping (wave11-08)

- **File:** `lib/exam-blueprint.ts`
- **`CATEGORY_B_BLUEPRINT`** (the block→quota source) is exported at `lib/exam-blueprint.ts:63`,
  `total: DEFAULT_EXAM_QUESTION_COUNT` (`:64`), `blocks[]` each `{ key, sections, count|range }`
  (`:66-74`). Per-code lookup: `blueprintForCategoryCode(code)` at `lib/exam-blueprint.ts:83`
  (returns `null` for a category with no blueprint). Block→section membership:
  `groupCandidatesByBlock(blueprint, candidates)` at `lib/exam-blueprint.ts:106` maps a candidate's
  section (`displayOrder - 99`, `SECTION_DISPLAY_ORDER_OFFSET` at `:25`) to its block key; the
  remainder (`pdr`) block absorbs everything unclaimed (`claimedSections` at `:89`).
- **Quota:** a block's quota is its `count` (fixed) or `range` (`[min,max]`, picked per exam); the
  remainder = `total - Σ(others)`.
- **Per-block mean pass-prob:** compute R×calibration over that block's topics' `ReviewState`
  rows. Map block sections → `Topic.displayOrder` via `sectionDisplayOrders` at
  `lib/exam-blueprint.ts:33`, resolve those topics' questions, aggregate `retrievability(...)`
  (`@/lib/fsrs`, see `lib/fsrs/CLAUDE.md`) over the user's `ReviewState` rows for those questions;
  **unseen items → an honesty-floored prior** (not 1.0), so an unpractised block can't inflate the
  dial. The dial = Poisson-binomial P(≥18/20) with mock shrinkage (schema §6, `ReadinessSnapshot`).

## 6. Legacy readiness source for the shadow-view DELTA (wave11-15)

- **Files:** `lib/server/progress.ts`, `lib/readiness.ts`
- `ProgressSnapshot.readinessScore` / `readinessLevel` are written by **`snapshotProgress`** at
  `lib/server/progress.ts:171`, specifically the `prisma.progressSnapshot.create` at
  `lib/server/progress.ts:176` (`readinessLevel: p.readiness.level`, `readinessScore:
  p.readiness.score` at `lib/server/progress.ts:182-183`). `p.readiness` comes from
  `estimateReadiness(...)` at `lib/server/progress.ts:81` (imported from `@/lib/progress`).
- The learner-facing 0..100 exam-readiness estimate lives in `lib/readiness.ts` (weights
  `EXAM_READINESS_EXAM_WEIGHT` / `_MASTERY_WEIGHT` at `lib/constants.ts:121-122`, band cutoffs
  `:125-126`). The shadow view compares this legacy score against the new
  `ReadinessSnapshot.dialPercent` to show the DELTA.

## 7. STARTABLE_MODES + startTestSchema + empty-redirect (wave11-03, wave11-05)

- **`STARTABLE_MODES`** — `lib/constants.ts:23` — is `TEST_MODES.filter(m => m !== "ADAPTIVE_REVIEW")`.
  `ADAPTIVE_REVIEW` is defined in `TEST_MODES` (`lib/constants.ts:15`) with `MODE_LABEL`
  "Розумне повторення" (`lib/constants.ts:34`) but deliberately EXCLUDED from startable until the
  queue lands. **wave11-03** re-includes it (the comment at `lib/constants.ts:19-22` says "Wave 11
  adds it back once the queue lands").
- **`startTestSchema`** — `lib/validation.ts:45` — `mode: z.enum(STARTABLE_MODES, ...)`. Because it
  reads `STARTABLE_MODES`, editing the constant automatically widens the accepted modes; no schema
  edit needed beyond the constant.
- **`NoQuestionsError` → redirect** — `app/actions/test.ts:41`:
  `if (e instanceof NoQuestionsError) redirect(\`/dashboard?empty=${parsed.data.mode}\`)`. The
  mode string becomes the `empty=` query param.
- **`EMPTY_NOTICE`** — `app/(app)/dashboard/page.tsx:56` — maps mode → Ukrainian notice. It has NO
  `ADAPTIVE_REVIEW` key yet; the "nothing due" redirect target (wave11-05) needs a new entry here
  (e.g. `ADAPTIVE_REVIEW: "Наразі немає питань для повторення…"`). Rendered at
  `app/(app)/dashboard/page.tsx:124-126`.

## 8. Admin nav + browser-audit (wave11-15)

- **`NAV_LINKS`** — `app/admin/layout.tsx:8` — array of `{ href, label }`. The last entry is
  «Якість контенту» (`/admin/content-health`) at `app/admin/layout.tsx:15`. The new
  `/admin/readiness-shadow` link inserts AFTER that line (line 15), before the closing `]` at
  `app/admin/layout.tsx:16`.
- **`bin/browser-audit.sh`** — helpers `ok()`/`bad()` at `bin/browser-audit.sh:37-38`; assertions
  use `assert_url` (`:46`) / `assert_text` (`:53`). **Current assertion count = 15** at runtime:
  10 literal `assert_url`/`assert_text` calls PLUS the 5-iteration loop `for p in mistakes saved
  history account practice` at `bin/browser-audit.sh:112-114` (`assert_url "/$p" ...`). Admin block
  ends with `assert_url "/admin"` (`:135`) + `assert_text "ОГЛЯД"` (`:136`). To **reach 17**,
  wave11-15 adds 2 new assertions (e.g. admin reaches `/admin/readiness-shadow` + the shadow page
  renders its heading), following the same `nav … assert_url/assert_text` style. Summary line at
  `bin/browser-audit.sh:141`; exit gate `[ "$fail" -eq 0 ]` at `:142`.

## 9. Integration-suite fixture + noise lesson (wave11-06, wave11-09, wave11-13)

- **`createOfficialQuestion`** — `lib/server/__testutils__/official-question.ts:76` —
  `createOfficialQuestion(prisma: PrismaClient, opts?: CreateOfficialQuestionOptions):
  Promise<OfficialQuestionFixture>`. Options (`:29-52`): `label, count, categoryId, topicId
  (undefined→throwaway, null→none), withUser, userRole, isPublished, isActive, archivedAt,
  difficulty, options[]`. Returns `{ userId, categoryId, topicId, questionIds, questionId,
  cleanup }` (`:54-70`); `cleanup` is FK-safe user→questions→topic→category (`:152-163`). NOT
  collected by the integration glob (filename lacks `.integration.test.ts`).
- **Noise lesson (from the analytics suites):** the three new integration suites must use UNIQUE
  fixture keys/time-windows so a leftover row from a prior crashed run can't collide — e.g. suffix
  any fixed `clientEventId` with a per-run token (`\`evt-${Date.now()}\``, computed once at module
  scope) because `ReviewLog.clientEventId` is GLOBALLY `@unique` (`schema.prisma:329`) and
  `recordReview`'s replay guard early-returns on ANY row bearing that id. `createOfficialQuestion`
  already derives unique category codes / user emails via its `uniqueSuffix()`
  (`official-question.ts:16-21`), so category/topic/user collisions are handled; only hand-authored
  `clientEventId`s and DB-wide aggregation windows need the per-run token.
- **Prisma client in tests:** construct with the adapter — `new PrismaClient({ adapter: new
  PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }) })` (bare
  `new PrismaClient()` throws under Prisma 7 + libsql). Integration config stubs `server-only`.

---

## Summary of downstream anchor map

| Task | Primary anchor |
|------|----------------|
| wave11-02 schema `medianLatencyMs` | `prisma/schema.prisma:337` (`model TopicMastery`) |
| wave11-03 startable modes | `lib/constants.ts:23` (`STARTABLE_MODES`) |
| wave11-04 grade overrides | `lib/fsrs/grade.ts:28` (`deriveGrade`) |
| wave11-05 adaptive server | `lib/server/test-engine.ts:138` (branch), `lib/server/study.ts` (no cycle) |
| wave11-07 latency bands | `lib/fsrs/latency-bands.ts` (new); calls from `lib/fsrs/grade.ts:33-34` |
| wave11-08 recompute | `lib/server/test-engine.ts:463` (after `snapshotProgress`), `lib/exam-blueprint.ts:63` |
| wave11-15 admin shadow | `app/admin/layout.tsx:15`, `bin/browser-audit.sh:37` (15→17 assertions) |
| wave11-06/09/13 tests | `lib/server/__testutils__/official-question.ts:76` |
