# Task: wave10f-14-srs-integration-tests

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
Extend the SRS integration coverage (E5) so the un-stripped fields, whole-transaction idempotency, and the
ADAPTIVE_REVIEW gate are proven end-to-end (the direct-call bypass is exactly how these went unseen).

Boolean acceptance criteria:
1. Validation-through-action coverage: a test drives `submitAnswerAction` (or the schema + submitAnswer
   path) with a payload carrying `clientEventId`/`latencyMs` and asserts those values REACH `submitAnswer`
   / are persisted (proving the unstrip — not a direct `submitAnswer({...})` bypass).
2. Duplicate-replay coverage: replaying a full duplicate answer with the SAME `clientEventId` leaves
   `TestAnswer` NOT rewritten (e.g. `answeredAt`/`selectedOptionId` unchanged), the mistake
   `correctRepeatCount` NOT advanced, and exactly ONE `ReviewLog` row for that event.
3. ADAPTIVE_REVIEW-gate coverage: calling the start action (or `startTestSchema` validation) with
   `mode=ADAPTIVE_REVIEW` is REJECTED.
4. Tests live in `lib/server/srs-review.integration.test.ts` (or a sibling `*.integration.test.ts`) and
   are collected by the integration glob.
5. `npm run db:seed` exits 0 then `npm run test:integration` exits 0.

## Constraints / decisions
- Use a per-run-unique `clientEventId` suffix (`evt-...-${Date.now()}` computed once at module scope) —
  `ReviewLog.clientEventId` is GLOBALLY `@unique`, so a fixed literal can collide with a leftover row from
  a prior crashed run and silently fail the count assertion (see wave10-10 learning).
- Self-provision OFFICIAL (`isDemo:false`) fixtures via `createOfficialQuestion`
  (`lib/server/__testutils__/official-question.ts`) — the demo seed contributes ZERO to live pools; FK-safe
  cleanup in user→questions→topic→category order.
- Depends on wave10f-10 (schema), wave10f-12 (idempotency), wave10f-13 (gate). This task adds ONLY tests.
- Non-Goal: the production code changes those tasks own.

## Plan
- [x] Add the validation-reaches-submitAnswer test.
- [x] Add the duplicate-replay no-op test (TestAnswer + mistake count + single ReviewLog).
- [x] Add the ADAPTIVE_REVIEW start-rejection test.
- [x] `npm run db:seed` + `npm run test:integration` 0.

## Next
- [ ] (none) — Goal met; verify re-run is the acceptance gate.

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-02 ClPcs-Mac-mini: Added the three action-boundary cases to a new
  `describe("SRS plumbing through the action boundary (wave10f §E)")` block in
  `lib/server/srs-review.integration.test.ts`, self-provisioning its own OFFICIAL fixture (count:2,
  label "srs-action") so it never collides with the existing §2–§5 pool (kept the `sqCount===2`
  sanity intact). (§E1) `submitAnswerAction` with `latencyMs:4321`+`clientEventId` → asserts the
  persisted ReviewLog carries both (proves the zod-unstrip reaches recordReview). (§E2) wrong→
  correct(action)→REPLAY(action) same clientEventId → TestAnswer answeredAt/selectedOptionId
  unchanged, mistake correctRepeatCount stays 1, exactly one ReviewLog. (§E3) `startTestSchema`
  rejects `ADAPTIVE_REVIEW` AND `startTestAction(FormData)` redirect-throws + starts no session.
  Mocked `@/lib/auth` getCurrentUser (spread-preserving) for the action's requireUser; per-run-unique
  EVT_QA_ACTION/EVT_QB_REPLAY at module scope. Set Status: done.

## Verify
**Last verify:** PASS (2026-07-01T21:05:44Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T21:08:21Z)
