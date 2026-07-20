# Task: wave15-08-marathon-extend-session

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T10:02Z
**Last compute:** ClPcs-Mac-mini

## Goal
The one genuinely new mechanic (spec §C): MARATHON paging via a server action that appends the next
page to an IN_PROGRESS marathon session. PASS = ALL true:

1. `extendSessionAction(input: { sessionId: string })` is exported from app/actions/test.ts (grep),
   delegating to a server fn `extendSession(sessionId, userId, now?)` in lib/server (grep
   `extendSession` in lib/server/test-engine.ts or study.ts).
2. FROZEN CLIENT CONTRACT (wave15-11 depends on it — record here, don't change later):
   `extendSessionAction` resolves to `{ added: number; total: number; questions: RunnerQuestion[] }`
   where `questions` are ONLY the newly appended items in EXACTLY the element shape of TestRunner's
   `questions` prop (per wave15-01 finding (c)); `added === questions.length`; `added: 0` +
   `questions: []` signals pool exhaustion (calm end-state, never a throw).
3. Selection = the pure `selectMarathonPage` preset over the session's category candidates with
   excludeIds = ALL questionIds already in the session (JS set-diff — no DB `notIn` over the id
   list); appended TestSessionQuestion rows continue displayOrder from the current max + 1; the
   `@@unique([testSessionId, questionId])` constraint is guaranteed by exclusion, never by
   catch-on-conflict.
4. Guards: extendSession THROWS for (a) a session owned by another user, (b) a non-MARATHON session,
   (c) a non-IN_PROGRESS session.
5. Integration proof — `lib/server/marathon-extend.integration.test.ts`;
   `npx vitest run --config vitest.integration.config.ts lib/server/marathon-extend.integration.test.ts`
   exits 0, proving:
   a. Fixture 30 published; start MARATHON (20 rows) → extendSessionAction (mocked auth, REAL action —
      production path) → `{added: 10, total: 30}`; session now has 30 rows with 30 DISTINCT
      questionIds; appended displayOrders are 20..29; each returned question object has id + options.
   b. Second extend → `{added: 0, total: 30}`, row count still 30, no throw.
   c. Answer 5 questions via the real submitAnswer BEFORE an extend → none of the answered ids appear
      among the appended questions (already-in-session ids, answered or not, are excluded).
   d. Guard cases (4a–4c) each reject (`await expect(...).rejects`).
6. `npm test` exits 0; `npx tsc --noEmit` exits 0; both frozen-oracle sha checks pass.

## Constraints / decisions
- Chunk any unavoidable `in` query at ≤200 ids (P2029); prefer loading the session's own rows +
  category pool and diffing in JS (house pattern).
- Rolling new-item budget comes from the preset (DEFAULT_NEW_ITEM_SHARE via selectMarathonPage) —
  no new selection logic in lib/server.
- finishing/resuming stays the untouched normal path (getResumableSession / finishSession /
  finalizeSession — spec §C); do not modify them.
- Analytics: no new event needed (test_started already covered the start; extends are not events —
  ANALYTICS_EVENTS untouched).

## Next
- [x] Read wave15-01 findings (c) for the runner question shape; implemented extendSession + action;
      wrote the integration file. `verify.sh` → `OK wave15-08`.
- Goal fully met. If a reviewer reopens: extendSession lives in lib/server/study.ts (exported types
  `RunnerQuestionPayload`/`ExtendSessionResult`); the action is `extendSessionAction` in
  app/actions/test.ts (validates via the reused `finishTestSchema` `{ sessionId }`).

## Artifacts
- app/actions/test.ts (extendSessionAction) · lib/server/* (extendSession)
- lib/server/marathon-extend.integration.test.ts

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T10:02Z ClPcs-Mac-mini: Implemented `extendSession(sessionId, userId, now?)` in
  lib/server/study.ts + exported `RunnerQuestionPayload`/`ExtendSessionResult` types. It guards
  (self-only / MARATHON-only / IN_PROGRESS-only, all throw), loads existing session ids as the JS
  exclude set (no DB notIn), runs the pure `selectMarathonPage`, appends TestSessionQuestion rows via
  `createMany` at displayOrder max+1.. inside a `$transaction` that also `increment`s totalQuestions,
  then returns the appended questions in the frozen RunnerQuestion shape (isCorrect/explanation
  omitted, answered:false). Pool-exhaustion returns `{added:0,total,questions:[]}` — no throw. Added
  `extendSessionAction({sessionId})` to app/actions/test.ts (reuses `finishTestSchema` for `{sessionId}`
  validation, `requireUser()` for the principal). Wrote lib/server/marathon-extend.integration.test.ts
  (5 cases: contract a, exhaustion b, exclusion c, guards 4a/4b/4c). `verify.sh` → OK wave15-08
  (tsc clean, integration 5/5, npm test 571/571, both frozen oracles intact).

## Verify
**Last verify:** PASS (2026-07-03T07:02:40Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T07:04:03Z)
