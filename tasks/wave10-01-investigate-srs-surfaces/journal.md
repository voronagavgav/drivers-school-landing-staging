# Task: wave10-01-investigate-srs-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
INVESTIGATION ONLY — produce a findings map so the implementation tasks (02, 07, 08, 09, 10) have a
concrete surface. **No production code change** (only this journal is edited). PASS = ALL true:

1. `## Findings` names, with `file:line`, the current write sequence inside `submitAnswer`
   (`lib/server/test-engine.ts`) — the `testAnswer.upsert`, `recordMistakeOutcome`, and `recordEvent`
   calls — and states explicitly whether they run inside a `prisma.$transaction` today (they do NOT).
2. Findings record `recordMistakeOutcome`'s signature (`lib/server/mistakes.ts`) and whether it can accept
   an interactive-transaction client (`tx`); state what must change so the TestAnswer + mistake + the new
   `recordReview` writes can share ONE `prisma.$transaction` (spec §F), and name the chosen approach for 09
   (e.g. "add an optional trailing `tx` param to `recordMistakeOutcome`, defaulting to module `prisma`").
3. Findings list EVERY exhaustive consumer of `TEST_MODES`/`TestMode` that a new `ADAPTIVE_REVIEW` member
   touches — at minimum `MODE_LABEL` (`lib/constants.ts`, a `Record<TestMode,…>`), the `z.enum(TEST_MODES)`
   in `lib/validation.ts`, `showsImmediateFeedback` (`lib/server/test-engine.ts`), and the `MODE_LABEL[...]`
   UI reads under `app/(app)/**` — each with `file:line` — so task 07 keeps typecheck at 0.
4. Findings give the exact insertion points for the schema back-relations: the `User` relation block and the
   `Question` relation block in `prisma/schema.prisma`, plus where `TestAnswer.confidence` goes — with line
   numbers.
5. Findings give the FK-safe teardown for the 9 new models relative to `createOfficialQuestion`'s cleanup
   (`lib/server/__testutils__/official-question.ts`): confirm the new `ReviewState`/`ReviewLog` rows key on
   `userId` + `questionId` with `onDelete: Cascade` on both FKs, so deleting the User (or Question) removes
   them; flag whether any new row blocks the existing user→question→topic→category delete order.
6. Findings confirm the migration mechanics from CLAUDE.md hold: `prisma migrate deploy` (NOT `migrate dev`),
   one `ADD COLUMN` per `ALTER`, dir name `<14-digit ts>_srs_learning_state`, `migration_lock.toml` provider
   `sqlite`; list the existing `prisma/migrations/` dirs so 02 picks a strictly-later timestamp.
7. Findings note the model-count reconciliation: plan doc `docs/app-plan/05-tech-architecture.md` §1 says
   "eight new models" but §1.1–§1.8 defines NINE (§1.8 bundles `PushSubscription` + `NotificationLog`); the
   wave-10 spec is authoritative → 02 creates NINE `CREATE TABLE`s.

## Constraints / decisions
- READ-ONLY. Do not modify `schema.prisma`, any `lib/**`, or run migrations; only edit this journal.
- Deliverable is the findings map, not a design of the FSRS math (that is 03/04's job) nor any implementation.
- Non-Goal: writing the migration, the pure engine, or any server wiring.

## Plan
- [x] Read `submitAnswer` + `finishSession` in `lib/server/test-engine.ts`; record the write sequence.
- [x] Read `recordMistakeOutcome` (`lib/server/mistakes.ts`) + `recordEvent` (`lib/analytics.ts`); decide tx.
- [x] Grep all `TEST_MODES`/`TestMode`/`MODE_LABEL` consumers; list them with file:line.
- [x] Read `User`/`Question`/`TestAnswer` blocks in `schema.prisma`; note relation insertion points.
- [x] Read `createOfficialQuestion` cleanup; state FK-safe teardown for the new rows.
- [x] Write the `## Findings` section answering Goal 1–7.

## Findings

### 1. `submitAnswer` write sequence (`lib/server/test-engine.ts:298`) — Goal 1
`submitAnswer(params)` is declared at `lib/server/test-engine.ts:298` (params: `sessionId`,
`userId`, `questionId`, `selectedOptionId`, `timeSpentSeconds?` — lines 298–304). Its writes run
**sequentially, NOT inside any `prisma.$transaction`** (no `$transaction` call appears anywhere in
the function; each write is a top-level `await prisma.*` / fire-and-forget):

1. **Read** `prisma.testSession.findFirst` (`:305`) — guards `status === "IN_PROGRESS"` (`:308`, throws `INVALID_SESSION`).
2. **Read** `prisma.question.findUnique` (`:310`) with `options`/`explanation`/`topic` include (`:312`); throws `INVALID_QUESTION` (`:314`).
3. Compute `correct = isAnswerCorrect(...)` (`:316`) — pure.
4. **WRITE** `await prisma.testAnswer.upsert({...})` (`:318`) — unique key `testSessionId_questionId` (`:320`); on `update` sets `selectedOptionId`/`isCorrect`/`timeSpentSeconds`/`answeredAt` (`:322–327`), on `create` sets the same minus `answeredAt` (`:328–334`).
5. **WRITE** `await recordMistakeOutcome(params.userId, params.questionId, question.topicId, correct)` (`:337`) — awaited, sequential (imported from `./mistakes` at `:17`).
6. **WRITE (fire-and-forget)** `void recordEvent("question_answered", params.userId, {sessionId, questionId, correct})` (`:338`) — NOT awaited (`void`), so its DB write races/settles outside the request path (imported from `@/lib/analytics` at `:16`).
7. Returns `{recorded:true}` for exam mode (`:344–346`, `showsImmediateFeedback` is false only for `EXAM_SIMULATION`, `:223`), else `{recorded, isCorrect, correctOptionId, explanation}` (`:347–352`).

Implication for task 09 (spec §F, single-transaction dual-write): steps 4 + 5 + the new
`recordReview` write must be wrapped in ONE `prisma.$transaction(async (tx) => { ... })`, which
requires steps 4 and 5 to accept the interactive `tx` client (see Finding 2). `recordEvent` (step
6) stays a fire-and-forget analytics call OUTSIDE the tx — it is not correctness-critical and is
already `void`-ed.

Context — `finishSession` (`:356`): also has NO `$transaction`; sequential
`prisma.testSession.update` (`:385`) → `void recordEvent("test_completed"…)` (`:396`, + exam pass/fail
`:398`) → `await snapshotProgress(userId, session.categoryId)` (`:403`). Idempotency guard at
`:366` returns the stored summary if the session is not `IN_PROGRESS`. Out of scope for wave 10 but
relevant if `recordReview` ever needs a batch flush at finish.

### 2. `recordMistakeOutcome` + `recordEvent` — tx approach for §F (Goal 2)
`recordMistakeOutcome(userId: string, questionId: string, topicId: string | null, isCorrect: boolean):
Promise<void>` at `lib/server/mistakes.ts:13–59`. It hard-references the module `prisma` singleton
(imported `@/lib/db` at `:2`) for its three DB ops: `prisma.userMistake.findUnique` (`:20`),
`prisma.userMistake.create` (`:27`), `prisma.userMistake.update` (`:49`). It does **NOT** accept a `tx`
client today.

`recordEvent(eventName, userId, payload?): Promise<void>` at `lib/analytics.ts:9–25` — writes one
`prisma.analyticsEvent.create` (`:15`) inside a try/catch that logs-and-swallows any error (fire-and-forget
contract, `:7–8`).

**Chosen approach for 09** (per spec §F, single-transaction dual-write): add an optional trailing client
param to `recordMistakeOutcome`, defaulting to the module `prisma`, e.g.
`recordMistakeOutcome(userId, questionId, topicId, isCorrect, db: Prisma.TransactionClient | typeof prisma = prisma)`,
then replace the three `prisma.userMistake.*` calls with `db.userMistake.*`. A Prisma interactive-tx client
exposes the same `.userMistake.findUnique/create/update` model delegates, so no other body change is needed;
existing callers stay source-compatible via the default arg. Then in `submitAnswer` wrap
`testAnswer.upsert` (`:318`) + `recordMistakeOutcome(...,tx)` (`:337`) + the NEW `recordReview(tx,...)`
(task 08, already spec'd `tx`-first) in ONE `prisma.$transaction(async (tx) => { ... })`.

`recordEvent` (step 6, `test-engine.ts:338`) stays **OUTSIDE** the transaction: it is `void`-ed,
non-correctness-critical, and already swallows its own errors — putting it inside the tx would give an
analytics failure the power to roll back a real answer+review write. Keep it after `$transaction` resolves.

### 3. `TEST_MODES` / `TestMode` / `MODE_LABEL` consumers for `ADAPTIVE_REVIEW` (Goal 3)
Every exhaustive surface a new `"ADAPTIVE_REVIEW"` member touches, with the hard-vs-auto distinction so
task 07 keeps typecheck at 0:

- **`lib/constants.ts:9–15`** — the `TEST_MODES` tuple (currently 5 members). ADD `"ADAPTIVE_REVIEW"` here.
  `TestMode` (`:16`) = `(typeof TEST_MODES)[number]` → the union auto-widens.
- **`lib/constants.ts:18–24`** — `MODE_LABEL: Record<TestMode, string>` is an EXHAUSTIVE record →
  **HARD compile requirement**: must add `ADAPTIVE_REVIEW: "Розумне повторення"` or typecheck fails on the
  missing key. (These two `constants.ts` edits are the ONLY hard typecheck requirements.)
- **`lib/validation.ts:2` (import) + `:46`** — `mode: z.enum(TEST_MODES, { error: … })`. Enum is built from
  the tuple → the new member becomes accepted input automatically; no edit needed.
- **`lib/server/test-engine.ts:223–225`** — `showsImmediateFeedback(mode: string)` returns
  `mode !== "EXAM_SIMULATION"` → ADAPTIVE_REVIEW returns `true` (shows feedback). Typed `string`, no compile
  break; task 07 confirms that's the intended UX.
- **`lib/server/test-engine.ts` pool dispatch** — the mode branch in `startSession` is an `if/else if` chain
  (`:73` exam, `:106` MISTAKE_PRACTICE, `:126` SAVED_QUESTIONS, `:139` TOPIC_PRACTICE, else MIXED default),
  NOT an exhaustive `switch`/`never` check → a new mode falls to the default branch with NO compile error.
  Task 07 must add an ADAPTIVE_REVIEW pool-building branch (runtime behavior, not a typecheck gate).
- **`lib/server/admin.ts:20` (import) + `:750`** — `MODE_LABEL[g.mode as keyof typeof MODE_LABEL] ?? g.mode`
  — index read with `?? fallback`; auto-covered.
- UI reads under `app/(app)/**` (all index/type reads with `?? fallback` → auto-covered, no edit):
  - **`app/(app)/dashboard/page.tsx`** — `:16–17` imports `MODE_LABEL`/`TestMode`; `:32`
    `StartButton({mode: TestMode, …})`; `:101` `mode: TestMode`; `:137`
    `MODE_LABEL[resumable.mode as TestMode] ?? resumable.mode`.
  - **`app/(app)/history/page.tsx`** — `:4` import; `:41` `MODE_LABEL[s.mode as TestMode] ?? s.mode`.

### 4. Schema back-relation insertion points (Goal 4)
`prisma/schema.prisma`:
- **`User` relation block — `prisma/schema.prisma:40–45`** (the existing back-relation list ends at `:45`
  `adminActions AdminActionLog[]`, block closes `:46`). Add the nine new back-relations here:
  `reviewStates ReviewState[]`, `reviewLogs ReviewLog[]`, `topicMasteries TopicMastery[]`,
  `studyProfile UserStudyProfile?`, `studyDays StudyDay[]`, `readinessSnapshots ReadinessSnapshot[]`,
  `settings UserSettings?`, `pushSubscriptions PushSubscription[]`, `notifications NotificationLog[]`
  (names per plan §1.9). `User` gets **no new scalar column** — relation fields only, no migration SQL.
- **`Question` relation block — `prisma/schema.prisma:100–106`** (existing back-relations end at `:106`
  `savedBy SavedQuestion[]`, block closes `:112`). Add `reviewStates ReviewState[]` and
  `reviewLogs ReviewLog[]`. `Question` gets **no new scalar column** — relation fields only.
- **`TestAnswer.confidence Int?` — inside `model TestAnswer` (`prisma/schema.prisma:195–210`)**; add the
  nullable column adjacent to `timeSpentSeconds Int?` (`:205`), i.e. a new line after `:205` before the
  `@@unique`/`@@index` block (`:207`). Nullable, no default → additive/data-preserving `ALTER TABLE
  "TestAnswer" ADD COLUMN "confidence" INTEGER;` (one ADD COLUMN per ALTER).

### 5. FK-safe teardown for the 9 new models vs `createOfficialQuestion` (Goal 5)
`createOfficialQuestion`'s `cleanup` (`lib/server/__testutils__/official-question.ts:152–163`) deletes in
order **user → questions → topic → category**, relying on cascades to sweep children.

Confirmed from plan §1.1–§1.8: every new row that references a user keys on `userId` with
`@relation(..., onDelete: Cascade)`, and the two per-item models (`ReviewState` §1.1, `ReviewLog` §1.2)
ALSO reference `questionId` with `onDelete: Cascade`. Specifically:
- `ReviewState` (§1.1): `user … onDelete: Cascade` + `question … onDelete: Cascade`, `@@unique([userId, questionId])`.
- `ReviewLog` (§1.2): `user … onDelete: Cascade` + `question … onDelete: Cascade`.
- `TopicMastery` (§1.3), `UserStudyProfile` (§1.4), `StudyDay` (§1.5), `ReadinessSnapshot` (§1.6),
  `UserSettings` (§1.7), `PushSubscription` + `NotificationLog` (§1.8): all `user … onDelete: Cascade`.

Result: deleting the User (cleanup step 1) cascades ALL nine models' rows; deleting the Question (step 2)
cascades any `ReviewState`/`ReviewLog` still keyed to it. So **NO new row blocks** the existing
user→question→topic→category delete order — the current `cleanup` needs no reordering. (Note `TopicMastery`
keys on `topicId` too; §1.3 must set that FK `onDelete: Cascade` as well so cleanup's topic-delete step
doesn't hit an FK constraint — 02 must copy that cascade verbatim from the spec.)

### 6. Migration mechanics (Goal 6)
CLAUDE.md mechanics hold and are confirmed against the repo:
- Use **`prisma migrate deploy`** (non-interactive), NOT `prisma migrate dev` (interactive → fails in the
  agent/driver non-TTY shell). Hand-author `prisma/migrations/<14-digit ts>_srs_learning_state/migration.sql`
  then `prisma migrate deploy`; regenerate with `prisma generate`.
- **One `ADD COLUMN` per `ALTER TABLE`** (SQLite: no multi-column ALTER) — only `TestAnswer.confidence` is an
  ADD COLUMN; the nine models are `CREATE TABLE`s + their `CREATE INDEX`es.
- `prisma/migrations/migration_lock.toml` pins `provider = "sqlite"` (already present).
- Existing migration dirs (02 must pick a **strictly-later** 14-digit timestamp than the max):
  `20260616173350_init`, `20260616173400_test_answer_unique`, `20260618140000_user_token_version`,
  `20260618170000_analytics_granular_events`, `20260623091643_question_image_key`,
  `20260623115746_question_option_keys`. Max ts = **`20260623115746`** → the new dir must be
  `> 20260623115746` (e.g. `20260701000000_srs_learning_state`).

### 7. Model-count reconciliation (Goal 7)
`docs/app-plan/05-tech-architecture.md` §1 intro line ("We add **eight new models**…") UNDERCOUNTS: §1.1–§1.8
define **NINE** models because §1.8 bundles TWO (`PushSubscription` **+** `NotificationLog`). The wave-10 spec
is authoritative → **task 02 creates NINE `CREATE TABLE`s**: `ReviewState`, `ReviewLog`, `TopicMastery`,
`UserStudyProfile`, `StudyDay`, `ReadinessSnapshot`, `UserSettings`, `PushSubscription`, `NotificationLog`
(plus the one additive column `TestAnswer.confidence`, §1.9).

## Next
- (none) — Findings map complete (Goals 1–7 answered). Investigation deliverable done; downstream tasks 02/07/08/09/10 can consume `## Findings`.

## Log
- 2026-07-01 planner: task authored from specs/wave10-srs-foundation.md (investigation for §A/§E/§F/§G).
- 2026-07-01T00:00Z ClPcs-Mac-mini: read `submitAnswer` (test-engine.ts:298–353) + `finishSession` (356–406); wrote Finding 1 — write sequence (testAnswer.upsert :318, recordMistakeOutcome :337, void recordEvent :338), confirmed NO `prisma.$transaction` today. Goal 1 answered.
- 2026-07-01T16:40Z ClPcs-Mac-mini: completed Findings 2–7 (verify had failed on the TEST_MODES/MODE_LABEL check). Read `recordMistakeOutcome` (mistakes.ts:13–59, no tx param; approach: optional trailing `db=prisma`), `recordEvent` (analytics.ts:9–25, stays outside tx); grepped all TEST_MODES/TestMode/MODE_LABEL consumers (constants.ts:9–24 hard, validation.ts:46 + admin.ts:750 + dashboard/history pages auto-covered, if/else-if pool dispatch not exhaustive); noted schema back-relation insertion points (User :40–45, Question :100–106, TestAnswer.confidence after :205); confirmed FK-safe cascade teardown for the 9 models; listed migration dirs (max ts 20260623115746) + migrate-deploy mechanics; reconciled 8-vs-9 model count. Status → done.


## Verify
**Last verify:** PASS (2026-07-01T16:24:47Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T16:26:28Z)
