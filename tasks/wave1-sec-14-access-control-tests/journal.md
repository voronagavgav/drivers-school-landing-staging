# Task: wave1-sec-14-access-control-tests

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-17
**Last compute:** ClPcs-Mac-mini

## Goal
Add access-control integration tests (spec section D) proving no IDOR, server-side RBAC on admin
mutations, and published/active gating in the engine — and fix any gap the tests reveal in the SERVER
layer (never UI-only).

1. A NEW test file `lib/server/access-control.integration.test.ts` exists (real DB; runs under the
   `test:integration` config that stubs `server-only`).
2. IDOR: it proves user A cannot read user B's session — `getSessionState(<B's sessionId>, <A's userId>)`
   returns `null`; and `submitAnswer`/`finishSession` for a session not owned by the caller throw
   `INVALID_SESSION`.
3. Engine gating: it proves a question that is NOT published (or is archived/inactive) is NEVER selected
   into a started session's pool, across the relevant modes — including `SAVED_QUESTIONS` (a saved but
   later-unpublished question must be excluded).
4. RBAC: server-side rejection of non-admins is proven two ways: (a) a test asserts
   `requireContentManager()` (via `app/admin/actions.ts` → e.g. `createQuestion`) REJECTS a `USER`-role
   principal (getCurrentUser mocked to a USER ⇒ the call redirects/throws, no write); AND (b) every
   exported mutation in `app/admin/actions.ts` calls `requireContentManager()` (≥ 12 invocations) — so
   the proven gate covers all of them.
5. Any gap the tests reveal is FIXED in the server layer (e.g. if `SAVED_QUESTIONS` selection leaks an
   unpublished question, add the `isPublished` filter in `startSession`). After fixes:
   `npm run test:integration` exits 0; `npm test` and `npm run typecheck` exit 0.

## Constraints / decisions
- Add the new integration test; only EDIT source if a test reveals a real gap, and then only in the
  server layer (`lib/server/*` / `lib/rbac.ts`) — never a UI-only fix.
- The AUDIT marks RBAC + IDOR + exam answer-withholding as already GOOD; expect the IDOR and admin-RBAC
  tests to pass without source changes. The most likely real gap is `SAVED_QUESTIONS` not filtering
  `isPublished` in `startSession` (`lib/server/test-engine.ts`) — fix it there if the test shows it.
- For the RBAC behavioral test, mock `@/lib/auth`'s `getCurrentUser` to return a `USER`-role object and
  assert the admin mutation rejects (Next `redirect()` throws a control-flow error — assert it rejects);
  do NOT attempt to drive real cookies in the node test runtime.
- Test hygiene: throwaway users/questions created in the test are deleted in `afterAll` (mirror
  `engine.integration.test.ts`) so the seeded DB stays clean. Do not mutate seeded demo content.
- Non-Goal: adding new RBAC layers or routes; the exam answer-leak path is already covered by the
  engine's `reveal` gate (no new test required, though one is welcome).

## Plan
- [x] Write `lib/server/access-control.integration.test.ts`: IDOR (getSessionState/submit/finish),
      engine published/active gating (incl. SAVED), RBAC rejection (mocked USER).
- [x] Run `npm run test:integration`; if the SAVED published gate (or any gap) fails, fix `startSession`.
- [x] `npm run typecheck` && `npm test` && `npm run test:integration`.

## Done
- [x] Wrote `lib/server/access-control.integration.test.ts` (6 tests): IDOR (getSessionState→null for
      foreign caller; submit/finish throw INVALID_SESSION), non-saved + SAVED_QUESTIONS published gating,
      RBAC (`createQuestion` rejects a mocked USER, no write).
- [x] Test surfaced the predicted gap → fixed `startSession` SAVED branch to filter
      `isPublished && archivedAt === null` (not just `isActive`).
- [x] typecheck clean · `npm test` 91 passed · `npm run test:integration` 8 passed · verify.sh PASS.
- [x] Addressed evaluator REJECT (criterion 3): added explicit archived + inactive exclusion proofs.
      New non-saved test asserts an inactive and an archived question are both dropped (`toEqual([liveId])`);
      SAVED test broadened to drop saved-then-unpublished, -archived, AND -deactivated questions.

## Next
- [ ] (none — goal met; evaluator REJECT addressed; verify.sh green)

## Artifacts
- lib/server/access-control.integration.test.ts — IDOR + RBAC + published-gating proofs
- lib/server/test-engine.ts — (only if a gap is found) server-layer fix, e.g. SAVED isPublished filter
- tasks/wave1-sec-14-access-control-tests/verify.sh — test present + RBAC structural + suites green

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T11:51Z ClPcs-Mac-mini: wrote access-control.integration.test.ts (IDOR + SAVED/non-saved
  published gating + RBAC mocked-USER reject). Run surfaced the SAVED leak gap; fixed startSession SAVED
  branch to also require isPublished && archivedAt===null. typecheck/unit(91)/integration(8)/verify.sh
  all green → Status: done.
- 2026-06-17T11:57Z ClPcs-Mac-mini: evaluator REJECT (criterion 3: archived/inactive exclusion not
  explicitly tested). Added archivedAt to makeQuestion helper; new non-saved test proves inactive +
  archived questions are excluded (toEqual([liveId])); broadened SAVED test to also drop archived &
  deactivated saved questions. typecheck/unit(91)/integration(9)/verify.sh all green → Status: done.

## Verify
**Last verify:** PASS (2026-06-17T08:57:38Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T08:58:45Z)
