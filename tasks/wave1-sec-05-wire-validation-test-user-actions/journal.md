# Task: wave1-sec-05-wire-validation-test-user-actions

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
Wire the task-02 schemas into the test-flow and user server actions (spec section A). Invalid input is
guarded BEFORE any DB write and never produces an unhandled 500; valid input behaves exactly as before.

1. `app/actions/test.ts` imports the needed schemas (`startTestSchema`, `submitAnswerSchema`,
   `finishTestSchema`, `toggleSaveSchema`, `removeSavedSchema`) from `@/lib/validation`.
2. OBJECT-ARG actions guard via `safeParse` BEFORE delegating to the engine/DB:
   - `submitAnswerAction` parses with `submitAnswerSchema` before calling `submitAnswer(...)`.
   - `finishTestAction` parses with `finishTestSchema` before calling `finishSession(...)`.
   - `toggleSaveAction` parses with `toggleSaveSchema` before `saveQuestion`/`unsaveQuestion`.
   On a failed parse they throw a guard error (a thrown-and-caught guard, not a silent bad persist) —
   no DB write happens for invalid input.
3. FORM actions guard without breaking their redirects:
   - `startTestAction` parses `mode`/`topicId` with `startTestSchema`; an invalid `mode` redirects to
     `/dashboard` (and the existing `NoQuestionsError` → `/dashboard?empty=<mode>` redirect is preserved).
   - `removeSavedAction` parses with `removeSavedSchema`; an invalid/empty `questionId` is a no-op that
     still `revalidatePath("/saved")` (no throw, no bad delete).
4. `app/actions/user.ts` imports `selectCategorySchema` and `selectCategoryAction` parses `categoryId`
   with it BEFORE the `prisma.category.findFirst` lookup; an invalid `categoryId` still redirects to
   `/onboarding` (existing behaviour preserved).
5. All five `test.ts` exports (`startTestAction`, `submitAnswerAction`, `finishTestAction`,
   `toggleSaveAction`, `removeSavedAction`) and `selectCategoryAction` remain exported with unchanged
   signatures. `npm run typecheck` exits 0 and `npm test` exits 0 (zero failures).

## Constraints / decisions
- Edit ONLY `app/actions/test.ts` and `app/actions/user.ts`. Do not touch `lib/validation.ts`,
  `lib/server/*`, components, or auth/admin actions.
- Preserve EXACT redirect semantics: `startTestAction` success → `/test/<id>`, NoQuestions →
  `/dashboard?empty=<mode>`; `selectCategoryAction` → `/dashboard` on success, `/onboarding` on bad
  category; `removeSavedAction` → revalidate `/saved`.
- `requireUser()` must still run for every action (auth gate unchanged). Validation is additive.
- For object-arg actions, "never 500s" means: a malformed object is rejected by a controlled guard
  before any DB call — not that the function can never throw. A thrown guard error is acceptable.
- Non-Goal: changing the engine (`lib/server/test-engine.ts`) — that is tasks 12/14. No image-URL
  handling here (tasks 06/08).

## Plan
- [x] test.ts: import schemas; add `safeParse` guards to submit/finish/toggleSave (object-arg) and
      start/removeSaved (form) actions, preserving redirects.
- [x] user.ts: import `selectCategorySchema`; parse `categoryId` before the category lookup.
- [x] `npm run typecheck` && `npm test`.

## Done
- [x] test.ts fully wired: imports the five schemas + `firstIssueMessage`; object-arg actions
      (submit/finish/toggleSave) `safeParse` then throw a guard `Error` on failure before any engine
      call; `startTestAction` redirects to `/dashboard` on bad mode (NoQuestions→`/dashboard?empty=`
      preserved, `parsed.data.mode` typed as `TestMode` so the cast is gone); `removeSavedAction` is a
      controlled no-op on empty/invalid id but still `revalidatePath("/saved")`. `npm run typecheck` → 0.
- [x] user.ts wired: imports `selectCategorySchema`, `safeParse`s `{ categoryId }` BEFORE the
      `prisma.category.findFirst` lookup; an invalid/empty id redirects to `/onboarding` (existing
      not-found redirect preserved, lookup now uses `parsed.data.categoryId`). Full verify.sh PASS:
      typecheck → 0, `npm test` → 63 passed / 0 fail.

## Next
- (none — goal met; verify.sh PASS)

## Artifacts
- app/actions/test.ts — validated test-flow actions
- app/actions/user.ts — validated category selection
- tasks/wave1-sec-05-wire-validation-test-user-actions/verify.sh — wiring + parse-before-DB + typecheck/test

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: wired all five validation schemas into `app/actions/test.ts`
  (safeParse guards on every action, redirects/revalidate preserved, `as TestMode` cast removed since
  the enum now infers it). `npm run typecheck` exits 0. user.ts + full `npm test` remain.
- 2026-06-17T11:15Z ClPcs-Mac-mini: fixed the failing gate — wired `selectCategorySchema` into
  `app/actions/user.ts`: imported it and `safeParse({ categoryId })` BEFORE the `prisma.category.findFirst`
  lookup, redirecting to `/onboarding` on a bad/empty id (existing not-found redirect preserved). Ran
  the full verify.sh → PASS (typecheck 0, npm test 63 passed / 0 fail). Goal met; Status → done.


## Verify
**Last verify:** PASS (2026-06-17T08:16:06Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:16:52Z)
