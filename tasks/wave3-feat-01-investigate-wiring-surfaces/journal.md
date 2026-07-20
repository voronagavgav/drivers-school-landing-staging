# Task: wave3-feat-01-investigate-wiring-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
INVESTIGATION ONLY — produce a written findings map the later Wave 3 implementation tasks rely on.
Do NOT change any source file under `lib/`, `app/`, `components/`, or `prisma/`. The only file this task
writes is THIS journal's `## Findings` section. Each criterion is a fact the driver must record so a
fresh-context tick can wire features without re-deriving the surfaces.

1. This journal contains a `## Findings` section (a heading line exactly `## Findings`).
2. `## Findings` names `lib/server/test-engine.ts` and its `startSession` function and states that the
   `MISTAKE_PRACTICE` branch orders mistakes via `orderMistakesByPriority` (from
   `lib/test-engine/selection.ts`) BEFORE `selectQuestions`, and that `selectQuestions` for
   `MISTAKE_PRACTICE` preserves caller order (`[...pool]`) — so swapping the pre-ordering call is the only
   change needed to wire spacing.
3. `## Findings` names `app/(app)/dashboard/page.tsx` as the dashboard server component and records that it
   already calls `getRecentReadinessScores(user.id, user.selectedCategoryId)` and `computeProgress(...)`,
   and that `getRecentReadinessScores` lives in `lib/server/progress.ts` (returns scores oldest→newest).
4. `## Findings` records the password-change surfaces: `verifyPassword` + `hashPassword` in `lib/auth.ts`,
   the password rule `z.string().min(8, …)` in `lib/validation.ts` (`registerSchema`), server actions live
   in `app/actions/*` with `"use server"`, and `requireUser()` (`lib/rbac.ts`) is the auth guard.
5. `## Findings` records the integration-test convention: files named `*.integration.test.ts` under
   `lib/server/`, run via `npm run test:integration` (config stubs `server-only`), create throwaway users
   keyed by `Date.now()` and delete the USER first in `afterAll` so child rows cascade.
6. `## Findings` records the seed surface: `prisma/seed.ts` (standalone PrismaClient), the `TOPICS` and
   `QUESTIONS` arrays, every question forced `sourceType:"DEMO"`/`isDemo:true`, run via `npm run db:seed`,
   and the one-correct invariant (exactly one option with `correct:true`).
7. `## Findings` states whether a Prisma schema change is needed for Wave 3 and the recorded answer is NO
   (streak/goal derive from `TestAnswer`/`TestSession` dates; password change updates `User.passwordHash`;
   sparkline reuses `ProgressSnapshot`).

## Constraints / decisions
- Read-only investigation. Producing the findings map is the deliverable; no feature code.
- Non-Goal: implementing spacing, streak, sparkline, change-password, or seed changes — those are tasks
  02–11. Keep scope to recording the surfaces accurately.

## Plan
- [x] Read the files named in the Goal, confirm the facts, write them into `## Findings`.

## Done
- [x] Read `lib/server/test-engine.ts` + `lib/test-engine/selection.ts`,
      `app/(app)/dashboard/page.tsx`, `lib/server/progress.ts`, `lib/auth.ts`, `lib/rbac.ts`,
      `lib/validation.ts`, `prisma/seed.ts`, `app/actions/*`, and
      `lib/server/access-control.integration.test.ts`; confirmed every Goal fact and wrote the
      6-part `## Findings` map (covers all verify.sh tokens incl. the NO-schema-change decision).

## Next
- [ ] (none — investigation complete; verify.sh greps the Findings map for required tokens.)

## Findings

### 1. Mistake-spacing wiring surface (tasks 02–03)
- `lib/server/test-engine.ts` holds `startSession(params)` (the only DB orchestrator that builds a
  question pool). Its `MISTAKE_PRACTICE` branch (lines 63–82) fetches the user's `ACTIVE`
  `UserMistake` rows, maps each to `{ questionId, topicId, mistakeCount, correctRepeatCount,
  lastMistakeAt: m.lastMistakeAt.getTime() }`, and orders them via
  `orderMistakesByPriority(...)` (imported from `lib/test-engine/selection.ts`) BEFORE building
  `pool`. The pool is then rehydrated from `prisma.question.findMany` keyed by the ordered ids and
  re-sorted to match `ordered` (`ordered.map((m) => byId.get(m.questionId))…`).
- The later `selectQuestions(pool, { mode, … })` call (line 108) for `MISTAKE_PRACTICE` falls into
  the default switch arm of `selectQuestions` (`lib/test-engine/selection.ts` lines 68–75) which
  returns `[...pool]` — i.e. it PRESERVES caller order and only `slice(0, count)`s. It does NOT
  reshuffle (only `EXAM_SIMULATION` shuffles there).
- Conclusion: the final session order for `MISTAKE_PRACTICE` is fully determined by the
  pre-ordering call. To wire spacing, task 03 only needs to swap `orderMistakesByPriority(mapped)`
  for `spacedMistakeOrder(mapped, Date.now())` (task 02's new pure fn in `selection.ts`); no change
  to `selectQuestions` or the pool-rehydration is required. The mapped shape already carries
  `mistakeCount`, `correctRepeatCount`, and `lastMistakeAt` (ms epoch), which is the input
  `spacedMistakeOrder` needs (recency + mistakeCount weight − correctRepeat penalty).

### 2. Dashboard surface (tasks 05, 07)
- `app/(app)/dashboard/page.tsx` is the dashboard server component (`export default async function
  DashboardPage`). It guards with `requireUser()` and redirects to `/onboarding` when no
  `selectedCategoryId`.
- It already calls `computeProgress(user.id, user.selectedCategoryId)` and
  `getRecentReadinessScores(user.id, user.selectedCategoryId)` (line 57), then
  `readinessTrend(recentScores)`. So `recentScores: number[]` is already in scope on the page —
  task 07's sparkline can render directly off it (guard `recentScores.length >= 2`).
- `getRecentReadinessScores` lives in `lib/server/progress.ts` (lines 118–130): reads
  `ProgressSnapshot.readinessScore`, `orderBy createdAt desc`, `take RECENT_READINESS_WINDOW` (8),
  then `.reverse()` → returns scores OLDEST→NEWEST. Same file holds `computeProgress`,
  `snapshotProgress`, `computeWeakTopicIds`. A new `getStudyActivity` (task 05) belongs here and
  should group `TestAnswer.answeredAt` (the column exists; set on each upsert in
  `submitAnswer`) → epoch list + today count, scoped like the others (`{ userId, categoryId }`,
  via `testSession` relation as `computeProgress` does for answers).

### 3. Password-change surfaces (tasks 08–10)
- Hashing/verify: `lib/auth.ts` exports `hashPassword(plain)` (bcrypt cost 10) and
  `verifyPassword(plain, hash)` (bcrypt.compare). It also exports `getCurrentUser()` and
  `SessionUser`. It is `server-only`.
- Password rule: `lib/validation.ts` `registerSchema` uses `z.string().min(8, { error: "Пароль має
  містити щонайменше 8 символів." })`. zod is v4 → custom messages use `{ error: … }`. Task 08's
  `changePasswordSchema` should reuse this 8-char rule (current + new password) and live in this
  same pure module; `firstIssueMessage(error)` turns a parse failure into `{ error }`.
- Server actions live in `app/actions/*` (`auth.ts`, `user.ts`, `test.ts`), each starting with
  `"use server";`. The change-password action (task 08) belongs in `app/actions/user.ts` (or a new
  `app/actions/` file). Flow: `requireUser()` → load `prisma.user.findUnique` →
  `verifyPassword(current, user.passwordHash)` (reject if false) → `hashPassword(new)` →
  `prisma.user.update({ data: { passwordHash } })`.
- Auth guard: `requireUser()` from `lib/rbac.ts` (redirects to `/login` when unauthenticated);
  returns the `SessionUser`. Use it as the change-password gate (a user changing their own password
  needs no role check).
- Account screen (task 09): no `/account` route exists yet under `app/(app)/`; scaffold a server
  page that calls `requireUser()` + a client password form posting to the action.

### 4. Integration-test convention (task 10)
- Integration tests are named `*.integration.test.ts` under `lib/server/` (existing:
  `access-control.integration.test.ts`, `engine.integration.test.ts`,
  `finish-idempotency.integration.test.ts`). They run via `npm run test:integration`
  (`vitest run --config vitest.integration.config.ts`, which stubs `server-only`) and are EXCLUDED
  from the default `npm test`.
- Convention to mirror for `change-password.integration.test.ts` (model on
  `access-control.integration.test.ts`): import the real `prisma` from `@/lib/db`; create throwaway
  users with `email: \`…-${Date.now()}@test.local\``, `passwordHash: "x"` (or a real bcrypt hash
  when the test must verify the current password); in `afterAll`, DELETE THE USER FIRST so child
  rows cascade, then delete throwaway questions/categories, then `prisma.$disconnect()`. To exercise
  an action that calls `getCurrentUser()`, partial-mock auth:
  `vi.mock("@/lib/auth", async (importOriginal) => ({ ...(await importOriginal()),
  getCurrentUser: vi.fn() }))` then `vi.mocked(getCurrentUser).mockResolvedValue(... as ...)`.

### 5. Seed surface (task 11)
- `prisma/seed.ts` runs under tsx via `npm run db:seed` and instantiates its OWN `PrismaClient`
  (libsql adapter) — it must NOT import `lib/db` (`server-only` would throw). Topics are the `TOPICS`
  array; questions are the `QUESTIONS: SeedQuestion[]` array. `main()` clears tables in FK-safe order,
  creates one demo `ContentVersion`, categories B/A/C, topics, then each question.
- Invariants task 11 must preserve: every question is forced `sourceType: "DEMO"` / `isDemo: true`
  (set in the `prisma.question.create` data, not per-seed-row) and belongs to the demo content
  version; each question's `options` must have EXACTLY ONE `{ correct: true }` (the one-correct
  invariant — options default `isCorrect: Boolean(o.correct)`); `topic` must match a `TOPICS` title
  (looked up in `topicByTitle`); extra categories beyond "B" go in the optional `categories` array of
  category codes. New questions are just new `SeedQuestion` entries (and new topics added to `TOPICS`).

### 6. Schema decision — NO schema change for Wave 3
- No Prisma schema change is needed for Wave 3 (recorded answer: NO). Rationale: mistake spacing
  reorders existing `UserMistake` rows (no new columns); study streak / activity-goal derive from
  existing `TestAnswer.answeredAt` (already populated by `submitAnswer`) and `TestSession` dates;
  the sparkline reuses existing `ProgressSnapshot.readinessScore` history via
  `getRecentReadinessScores`; change-password updates the existing `User.passwordHash` column;
  expanded seed content only adds rows to existing `Topic`/`Question`/`QuestionOption` tables.

## Artifacts
- tasks/wave3-feat-01-investigate-wiring-surfaces/journal.md — the Wave 3 findings map.
- tasks/wave3-feat-01-investigate-wiring-surfaces/verify.sh — greps this journal for the required tokens.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: read all Goal-named surfaces (test-engine/selection, dashboard
  page, progress, auth, rbac, validation, seed, app/actions, access-control integration test),
  confirmed each fact, and wrote the full `## Findings` map (6 sections) satisfying verify.sh
  criteria 1–7 including the NO-schema-change decision. Set Status: done.

## Verify
**Last verify:** PASS (2026-06-17T12:16:23Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T12:17:48Z)
