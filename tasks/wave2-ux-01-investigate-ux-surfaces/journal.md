# Task: wave2-ux-01-investigate-ux-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
INVESTIGATION ONLY (no code changes). Produce a written map, in this journal's `## Findings`
section, that the later Wave 2 tasks (02–12) build against. Acceptance is boolean:

1. A `## Findings` section exists in this journal and answers, with exact `file:line` (or `file` +
   symbol), each of:
   a. Where the dashboard renders its cards and the exact insertion point for a "Продовжити тест"
      card (`app/(app)/dashboard/page.tsx`).
   b. Where pure helpers live + the colocated unit-test pattern (e.g. `lib/progress.ts` +
      `lib/progress.test.ts`; `npm test` is the fast DB-free suite), where server wrappers live
      (`lib/server/*`), and the forbidden-token purity rule (`server-only`, `@/lib/db`,
      `@prisma/client`, `lib/generated`).
   c. How an in-progress `TestSession` is queried (the `prisma.testSession` shape in
      `lib/server/test-engine.ts` / `lib/server/progress.ts`; the status union `SESSION_STATUS` in
      `lib/constants.ts`).
   d. The structure of `components/test-runner.tsx`: the finish path (`finish()` + `finishingRef`),
      the option-render block, per-question state (`selected`, `idx`), and the exam footer — the
      surfaces tasks 04/05/11/12 each touch.
   e. Where Next route boundaries go: `app/(app)/error.tsx`, `app/admin/error.tsx`,
      `app/(app)/test/[id]/not-found.tsx` (confirm none exist yet) and that `error.tsx` must be
      `"use client"` and take `{ error, reset }`.
   f. The inventory of submit forms LACKING a pending/disabled state (server-action `<form>` + plain
      `Button type="submit"`): dashboard start-test forms, practice forms, onboarding — vs the ones
      already done (`components/auth-forms.tsx`, `app/admin/questions/question-editor.tsx` use
      `useActionState` `pending`). Note the `useFormStatus` pattern for the rest.
   g. The current a11y state of the test runner + where a skip-to-content link / `<main>` landmark
      lives (`app/(app)/layout.tsx`); confirm `:focus-visible` already exists in `app/globals.css`.
2. The Wave 2 new-vs-resume scope decision is recorded (see Constraints).
3. NO source files changed: `git diff --stat -- app lib components next.config.ts` is empty.

## Constraints / decisions
- Read-only. Do NOT edit any source file, add tests, or change schema. The deliverable is the
  `## Findings` text in this journal.
- Decision to record (default, conservative): the app SURFACES a "Продовжити тест" resume card on the
  dashboard; starting a new test KEEPS the existing `startSession` behaviour (creates a FRESH session).
  We do NOT auto-resume or block a new start — this is the spec's "clearly start fresh + offer resume"
  option, chosen to avoid schema/flow changes. Tasks 02/03 implement against this.
- Non-Goal: any implementation (that is tasks 02–12); no `loading.tsx` (out of Wave 2 scope per spec C).

## Findings

### (a) Dashboard cards + insertion point for a "Продовжити тест" card
File: `app/(app)/dashboard/page.tsx`. The page is an async Server Component; JSX root is
`<div className="space-y-6">` at **L71**. Children, in order:
- empty-notice banner — **L82–86** (conditional on `?empty=`)
- Readiness `<Card>` — **L88–110**
- Recommended-action `<Card>` — **L112–120**
- Stats grid — **L122–128**
- "Загальна точність" `<Card>` — **L130–133**
- "Почати тест" quick-start section — **L135–162**
- Weak-topics `<Card>` — **L164–177**

Start-test forms are `<form action={startTestAction}>` + hidden `<input name="mode">` (helper
`StartButton` at **L24–31**; the recommended-action form at **L116–119**). **Insertion point for the
resume card (task 03):** immediately inside the container, after the empty-notice block — i.e.
between **L86 and L88**, above the Readiness card, so "Продовжити тест" is the first thing seen.
It should render only when an in-progress session exists (gate added in task 02/03).

### (b) Pure helpers, colocated tests, server wrappers, purity rule
- Pure helpers: `lib/*.ts` — e.g. `lib/progress.ts`, `lib/sanitize.ts`, `lib/validation.ts`,
  `lib/mistakes.ts`, `lib/question-stats.ts`, `lib/login-throttle.ts`. No DB imports.
- Colocated unit tests: `lib/<name>.test.ts` next to each helper. Present: `lib/progress.test.ts`,
  `lib/mistakes.test.ts`, `lib/sanitize.test.ts`, `lib/validation.test.ts`,
  `lib/question-stats.test.ts`, `lib/login-throttle.test.ts`. **Task 02** adds
  `lib/session-resume.ts` + `lib/session-resume.test.ts` in this same shape.
- Scripts (`package.json`): `npm test` = `vitest run` (fast, DB-free); `npm run test:integration`
  = `vitest run --config vitest.integration.config.ts` (seeded DB; stubs `server-only`).
- Server wrappers: `lib/server/*` — e.g. `lib/server/test-engine.ts`, `lib/server/progress.ts`,
  `lib/server/mistakes.ts`; each begins with `import "server-only";` (**L1**).
- **Purity rule:** a pure `lib/*.ts` file must NOT contain the literal tokens `server-only`,
  `@/lib/db`, `@prisma/client`, or `lib/generated` ANYWHERE (verify gates grep the whole file,
  comments included). So `lib/session-resume.ts` takes already-fetched session data as plain args
  and stays DB-free; the DB read lives in `lib/server/test-engine.ts`.

### (c) Querying an in-progress TestSession
- Status union: `SESSION_STATUS = ["IN_PROGRESS", "COMPLETED", "ABANDONED"]` — `lib/constants.ts:27`;
  `type SessionStatus` at **L28**. A resumable session = `status === "IN_PROGRESS"`.
- Existing `prisma.testSession` shapes:
  - create with `status: "IN_PROGRESS"` — `lib/server/test-engine.ts:119–131` (`startSession`).
  - `findFirst({ where: { id, userId }, include: { category, questions{…}, answers } })` —
    `lib/server/test-engine.ts:148–162` (`getSessionState`).
  - `count({ where: { ...sessionWhere, status: "COMPLETED" } })` — `lib/server/progress.ts:45`.
  - `findMany({ where: { ...sessionWhere, mode: "EXAM_SIMULATION", status: "COMPLETED" },
    orderBy: { finishedAt: "desc" }, take: 5 })` — `lib/server/progress.ts:47–51`.
- **No existing query selects "the user's current in-progress session"** — **task 03** must add
  `getResumableSession(userId, categoryId?)` (a `prisma.testSession.findFirst` with
  `status: "IN_PROGRESS"`, `orderBy: { startedAt: "desc" }`, optionally scoped by `categoryId`).
- TestSession fields seen in reads: `id, userId, categoryId, mode, status, timeLimitSeconds,
  totalQuestions, correctAnswers, wrongAnswers, result, startedAt, finishedAt`.

### (d) `components/test-runner.tsx` structure (surfaces for tasks 04/05/06/11/12)
`"use client"` (**L1**); imports `submitAnswerAction, finishTestAction, toggleSaveAction` from
`@/app/actions/test` (**L5**). Per-question / runner state:
- `idx` **L42**; `selected: Record<string,string>` **L43–45**; `feedback` **L46**; `saved` **L47**;
  `pending`/`startTransition` **L48**; `finishing` **L49**; `finishingRef` idempotency latch **L50**.
- current `q = questions[idx]` **L52**; `answeredCount` **L54**; `fb` **L55**; `locked` **L56**.
- `choose(optionId)` **L58–78**; `finish()` **L80–87** (guarded by `finishingRef.current`, then
  `finishTestAction`); `toggleSave()` **L89–95**; `isLast` **L97**.
- **Option-render block** (task 11): `q.options.map(...)` **L125–148**, each option is a
  `<button type="button">` (**L135–147**); outer container `<div className="mt-4 space-y-2">`
  at **L124** — wrap with `role="radiogroup"`, add `role="radio"` + `aria-checked={isSelected}` per
  button.
- **Save toggle** (task 12 aria-label target): `<button type="button" onClick={toggleSave}>`
  **L162–164** (inside `<div className="mt-4 flex items-center justify-between">` **L161**).
- **Nav footer**: **L168–183** — Назад / Далі / Завершити тест. The manual finish `<Button … onClick={finish}
  disabled={finishing}>` is **L177–181** (rendered when `isLast || isExam`) — **task 04** gates this
  behind a new `confirming` state.
- **Exam footer notice**: **L185–189** ("Відповіли на {answeredCount} з {questions.length}…").
- `Timer` subcomponent **L194–215** (calls `onExpire={finish}` at **L109**).
- NOT present yet: `flagged` state (task 05), `confirming` state (task 04),
  `role="radiogroup"`/`role="radio"` (task 11), `aria-label`s (task 12), flag toggle button.

### (e) Route boundaries
Confirmed ABSENT (none exist yet): `app/(app)/error.tsx`, `app/admin/error.tsx`,
`app/(app)/test/[id]/not-found.tsx`, plus `app/error.tsx`, `app/not-found.tsx`; no `loading.tsx`
anywhere under `app`.
- `error.tsx` (tasks 07/08) MUST be a Client Component (`"use client"`) and accept
  `{ error: Error & { digest?: string }; reset: () => void }`.
- `not-found.tsx` (task 09) is a Server Component, no props; it is already reachable —
  `app/(app)/test/[id]/page.tsx:11` calls `notFound()` when `getSessionState` returns null.
- App `<main>` landmark: `app/(app)/layout.tsx:9`
  (`<main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">`). Nav is `<AppNav>`
  (`components/app-nav.tsx`). No skip-to-content link exists yet.

### (f) Submit-form pending-state inventory (task 10)
ALREADY have pending (`useActionState` → `disabled={pending}`):
`components/auth-forms.tsx:24,45`; `app/admin/questions/question-editor.tsx:353`;
`app/admin/categories/category-form.tsx:71`; `app/admin/topics/topic-form.tsx:102`;
`app/admin/content-versions/content-version-form.tsx:75`.

LACKING any pending/disabled feedback (plain `<form action={serverAction}>` + `Button type="submit"`)
— targets for a shared `useFormStatus` submit button:
- `app/(app)/dashboard/page.tsx:26–30` (StartButton helper) and `:116–119` (recommended action).
- `app/(app)/practice/page.tsx:43–46` (mixed) and `:62–67` (topic; has `disabled={n===0}` only).
- `app/(app)/onboarding/page.tsx:21,42`.
- `app/(app)/saved/page.tsx:20–22` (start practice) and `:45` (`removeSavedAction`).
- `app/(app)/mistakes/page.tsx:22–24`.
- `app/(app)/test/[id]/result/page.tsx:55–57` ("Пройти ще раз").
- admin small forms: `app/admin/layout.tsx:38–40` (logout), `components/app-nav.tsx:27` (logout),
  `app/admin/categories/page.tsx:83–86` (toggle active),
  `app/admin/questions/[id]/page.tsx:68/75/83` (publish/unpublish/archive).

Pattern (task 10): a `"use client"` `components/submit-button.tsx` that calls
`const { pending } = useFormStatus()` and renders `<Button type="submit" disabled={pending}>`. It
MUST render as a child of the `<form>` (useFormStatus only reads the nearest ancestor `<form>`).
The base `Button` lives at `components/ui.tsx:19`.

### (g) a11y state + skip-link / landmark / focus
- Test-runner options are plain `<button type="button">` (no `role`/`aria-checked`) — task 11.
- The save toggle (**L162**) and the future flag toggle have no `aria-label` — task 12.
- `<main>` landmark: `app/(app)/layout.tsx:9`. No skip-to-content link yet (task 12 may add one).
- `:focus-visible` already exists: `app/globals.css:71` —
  `outline: 2px solid var(--color-sign); outline-offset: 2px;`. (No work needed.)

### Decision recorded (new-vs-resume scope)
Per Constraints: the dashboard SURFACES a "Продовжити тест" resume card when an `IN_PROGRESS`
session exists; starting a new test KEEPS the current `startSession` behaviour (always creates a
FRESH session — `lib/server/test-engine.ts:119`). We do NOT auto-resume and do NOT block a new
start. No schema or flow changes. Tasks 02/03 implement against this.

### No source files changed
`git diff --stat -- app lib components next.config.ts` is empty (verified this tick).

## Plan
- [x] Read the files named in the Goal and write `## Findings` with exact locations.
- [x] Record the resume-vs-fresh decision in `## Findings`.

## Done
- [x] Read dashboard, test-runner, test/[id] page, test-engine, progress, constants, layout,
      globals.css; inventoried forms; confirmed no error/not-found boundaries exist.
- [x] Wrote `## Findings` (a–g) with exact `file:line` references + the resume-vs-fresh decision.
- [x] Verified `git diff --stat -- app lib components next.config.ts` is empty (no source changed).

## Next
- [ ] (none — goal met; Wave 2 tasks 02–12 build against `## Findings`)

## Artifacts
- (this journal's `## Findings` section — the map consumed by tasks 02–12)

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T14:05Z ClPcs-Mac-mini: investigation complete. Read dashboard/test-runner/test page,
  test-engine + progress + constants, layout + globals.css; greped form inventory and route
  boundaries. Wrote `## Findings` (a–g) with exact file:line, recorded resume-vs-fresh decision,
  confirmed empty source diff. Status → done. No source files touched.

## Verify
**Last verify:** PASS (2026-06-17T11:08:01Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T11:09:35Z)
