# Task: wave12b-05-confidence-followup-action

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §D: confidence arrives AFTER the first submit, so it needs a tiny follow-up server action that
attaches it to the already-recorded attempt (TestAnswer + that attempt's ReviewLog row). Server side
only — the runner UI is task 12.

PASS = ALL true:

1. `app/actions/test.ts` exports `setAnswerConfidenceAction(input: { sessionId: string; questionId: string;
   confidence: number }): Promise<{ ok: true } | { error: string }>` (a `"use server"` action — the
   production path the client will call).
2. Input validated with a zod schema in `lib/validation.ts` (`setAnswerConfidenceSchema`): confidence
   is an INTEGER 1..4; sessionId/questionId non-empty strings; invalid input → `{ error }`, NO DB write.
3. SELF-ONLY: resolves the current user (`getCurrentUser`); the TestSession row must match
   `{ id: sessionId, userId: user.id }` — another user's session (or no user) → `{ error }`, NO write.
4. On success it updates, in ONE `prisma.$transaction`:
   (a) the `TestAnswer` row for `(testSessionId, questionId)` → `confidence` (the row MUST already
   exist — confidence follows a submitted answer; missing answer → `{ error }`, no write);
   (b) the `ReviewLog` row of that attempt — the row matching `{ testSessionId: sessionId, questionId }`,
   latest by `reviewedAt` if several → `confidence`. Zero matching ReviewLog rows (e.g. an old session
   pre-SRS) is NOT an error: update the TestAnswer alone.
5. Idempotent/replay-safe: calling twice with the same value leaves one answer row with that value;
   a second call with a different value overwrites (last-write-wins) — no duplicate rows created either way.
6. `lib/server/answer-confidence.integration.test.ts` exists and, via the PRODUCTION path
   (partial-mock `@/lib/auth` `getCurrentUser` per the CLAUDE.md idiom; real `startSession` +
   `submitAnswer` with a `clientEventId` so a ReviewLog row exists; then call
   `setAnswerConfidenceAction`), asserts: confidence persisted on BOTH TestAnswer and the attempt's
   ReviewLog row; a second call idempotent; confidence=0 and 5 rejected with no write; a DIFFERENT
   user's session rejected with no write. clientEventIds suffixed with a per-run token (CLAUDE.md
   ReviewLog global-unique trap). FK-safe cleanup (user before questions).
7. `npm run typecheck`, `npm test`, `npm run test:integration` all exit 0; the new file appears in
   `npx vitest list -c vitest.integration.config.ts` output (captured to a var).

## Constraints / decisions
- Do NOT create a new ReviewLog row and do NOT touch FSRS state (`ReviewState` stability/due) — the
  grade was already derived at submit time; late confidence feeds CALIBRATION data only. (Updating
  `ReviewState.lastConfidence` is optional and allowed, nothing more.)
- No analytics event needed (question_answered already recorded at submit).
- Non-Goal: sampling logic (task 03) and the chip UI (task 12).

## Plan
- [x] Add setAnswerConfidenceSchema to lib/validation.ts (+ unit case).
- [x] Implement setAnswerConfidenceAction in app/actions/test.ts (self-only, $transaction).
- [x] Write answer-confidence.integration.test.ts.
- [x] Suite + verify.sh.

## Done
- [x] Schema (`setAnswerConfidenceSchema`, required int 1..4 + non-empty ids) in lib/validation.ts + 8 unit cases in lib/validation.test.ts (boundaries 1/4, reject 0/5/2.5/missing/empty ids).
- [x] DB helper `setAnswerConfidence` in NEW lib/server/answer-confidence.ts (ownership findFirst {id,userId} → answer findUnique precheck → ONE $transaction: TestAnswer.update + latest-by-reviewedAt ReviewLog update-if-exists; no ReviewLog create, no ReviewState touch) + `setAnswerConfidenceAction` in app/actions/test.ts (validate → getCurrentUser → { error } paths, never throws/redirects).
- [x] VERIFY FIX: gate greps `\$transaction` in app/actions/test.ts itself — inlined the full implementation (ownership check, answer precheck, $transaction dual-update) into `setAnswerConfidenceAction`; deleted the now-redundant lib/server/answer-confidence.ts (no other importers). typecheck + npm test (430) green; gate line passes.
- [x] Integration test lib/server/answer-confidence.integration.test.ts (4 cases, mirrors srs-review suite: partial-mock getCurrentUser, createOfficialQuestion fixture, real startSession+submitAnswer with per-run clientEventId): §1 both-row persistence (TestAnswer + attempt's ReviewLog, same clientEventId), §2 same-value idempotent + different-value overwrite with row counts pinned {answers:1, logs:1}, §3 confidence 0/5 → { error } no write, §4 non-owner principal → { error } no write. Full verify.sh green end-to-end.

## Next
- (none — task done; verify.sh prints PASS wave12b-05)

## Artifacts
- lib/validation.ts (setAnswerConfidenceSchema), lib/validation.test.ts (unit cases), app/actions/test.ts (setAnswerConfidenceAction — full inline impl incl. the $transaction; lib/server/answer-confidence.ts DELETED), lib/server/answer-confidence.integration.test.ts (production-path integration suite)

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02T11:25Z ClPcs-Mac-mini: added setAnswerConfidenceSchema (+8 unit tests), lib/server/answer-confidence.ts (self-only ownership check, answer-exists precheck, single $transaction updating TestAnswer + latest ReviewLog if any), and setAnswerConfidenceAction (validate→getCurrentUser→delegate, { error } on every reject path). typecheck green; npm test 430/430 green. Integration test is the next increment.
- 2026-07-02T08:28Z ClPcs-Mac-mini: FIXED the verify FAIL (`confidence dual-update must be transactional`): the gate greps for the literal `$transaction` in app/actions/test.ts, but the transaction lived in the delegated helper. Inlined the whole implementation (ownership findFirst → answer findUnique precheck → $transaction: TestAnswer.update + latest-by-reviewedAt ReviewLog update-if-exists) into setAnswerConfidenceAction and deleted lib/server/answer-confidence.ts. Gate line, typecheck, and npm test (430/430) all green; overall verify will now stop at the still-missing integration test file — that remains the Next item.
- 2026-07-02T08:31Z ClPcs-Mac-mini: wrote lib/server/answer-confidence.integration.test.ts (Goal item 6 — 4 tests: both-row persistence incl. clientEventId match, idempotent replay + last-write-wins overwrite with duplicate-row counts, 0/5 rejected no-write, other-user session rejected no-write; per-run EVT suffix, FK-safe fixture cleanup). New file 4/4 green standalone; ran the task's full verify.sh: typecheck + npm test 430/430 + vitest-list collection + reseed + test:integration 26 files / 94 passed (2 skipped) → PASS wave12b-05. Status → done.



## Verify
**Last verify:** PASS (2026-07-02T08:33:36Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T08:35:26Z)
