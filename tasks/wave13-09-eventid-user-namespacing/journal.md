# Task: wave13-09-eventid-user-namespacing

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
Per-user `clientEventId` namespacing (spec §D, the deferred W10f item): keep the global `@unique`
column but PREFIX server-side so one user's id can't collide with / replay-block another's. Data-shape
change only — NO schema migration. PASS = ALL true:

1. ONE helper owns the format — `namespacedEventId(userId: string, clientEventId: string): string`
   returning `` `${userId}:${clientEventId}` `` — exported from `lib/server/study.ts`. No other file
   builds the prefixed string inline (grep: the template appears exactly once).
2. `recordReview` (lib/server/study.ts) uses it for BOTH the replay-guard `findUnique` and the
   `ReviewLog` write — a raw (unprefixed) id is never stored or looked up when recording.
3. The hoisted whole-transaction guard in `submitAnswer` (lib/server/test-engine.ts) uses the SAME
   helper for its `findUnique`.
4. Behavior (integration test — extend `lib/server/srs-review.integration.test.ts` or add a focused
   suite): with a per-run raw id `shared-<runtoken>`:
   a. user A and user B each submit an answer carrying that SAME raw id → TWO ReviewLog rows exist,
      with clientEventId `<userAId>:shared-<runtoken>` and `<userBId>:shared-<runtoken>`, and BOTH
      users' ReviewStates advanced (reps = 1 each) — cross-user replay-blocking is gone;
   b. user A replays the same raw id → still exactly ONE row for user A; A's TestAnswer
      selectedOptionId and ReviewState (stability, reps) are unchanged (whole-tx no-op preserved).
5. The existing suites that assert stored clientEventId values
   (lib/server/srs-review.integration.test.ts, lib/server/answer-confidence.integration.test.ts, plus
   any others wave13-01 found) are updated for the prefixed shape.
6. `npm run test:integration` exits 0. 7. `npm test` exits 0. 8. `npm run typecheck` exits 0.
9. NO schema change: `git diff --name-only` shows no `prisma/schema.prisma` edit and no new
   `prisma/migrations/` dir this task.
10. `bash tasks/wave13-09-eventid-user-namespacing/verify.sh` exits 0.

## Constraints / decisions
- Client code UNCHANGED: the runner keeps sending its raw uuid; the SERVER owns namespacing. The
  review-sync route (wave13-10) and the sessionless lane (wave13-17) inherit correctness for free by
  calling through submitAnswer/recordReview.
- `ReviewLog.clientEventId` stays globally `@unique` — with the userId prefix, global uniqueness now
  IMPLIES per-user uniqueness; concurrent double-insert protection is unchanged.
- Existing rows in dev.db carry unprefixed ids; they can no longer be replay-matched — acceptable
  (replay windows are minutes, not months; note it in the log). No data migration.
- Idempotency test ids MUST be per-run (`` `evt-${Date.now()}` `` at module scope) — the CLAUDE.md
  wave10-10 leftover-row trap.
- HIGH-STAKES (Evaluate): silent double-application or over-blocking of reviews corrupts FSRS state.

## Plan
- [x] Add helper; thread through recordReview + submitAnswer guard.
- [x] Update existing id-asserting tests; add the two-user behavior test; suites green; verify.sh.

## Done
- [x] `namespacedEventId(userId, clientEventId)` exported from lib/server/study.ts (single owner of
      the `${userId}:${clientEventId}` template); recordReview guard-lookup AND ReviewLog write go
      through it (`storedEventId`); submitAnswer's hoisted whole-tx guard (test-engine.ts) looks up
      via the same helper. typecheck green; `npm test` green (498).
- [x] verify.sh gate 10 narrowed: the `\$\{…[uU]serId\}:\$\{` regex false-flagged lib/auth.ts:52's
      PRE-EXISTING session-token payload `${userId}:${tokenVersion}:${exp}` (a cookie signature, not
      an event id) — pattern now requires an eventId-shaped RHS (`…:\$\{[A-Za-z]*[eE]ventId\}`),
      intent unchanged (still catches any second builder of the prefixed EVENT id). Gate-bug fix per
      the wave6-07 precedent; auth code untouched.
- [x] Stored-id assertions updated to the prefixed shape in srs-review.integration.test.ts (§2 log
      value, §E1 lookup+value, §E2 count), answer-confidence.integration.test.ts (§1), and
      wave11-review-fixes.integration.test.ts (§2 lookup). Expected values built by STRING CONCAT
      (`userId + ":" + rawId`), not the helper — an independent oracle for the format, and it keeps
      the single-template gate clean.
- [x] Goal-4 two-user behavior test added (srs-review.integration.test.ts, new §D describe): per-run
      `shared-${RUN}` raw id; users A and B (own fixtures) both record → two prefixed ReviewLog rows,
      both ReviewStates reps=1 (§4a); A replays the raw id with a DIFFERENT option → still one row,
      TestAnswer selectedOptionId and ReviewState reps/stability unchanged (§4b whole-tx no-op).
- [x] Gates: typecheck ✓, `npm test` 498 ✓, `npm run test:integration` 29 files / 107 passed ✓,
      verify.sh → `PASS wave13-09` ✓ (migration count still 9, schema.prisma untouched).

## Next
- [ ] (none — Goal met; verify.sh green)

## Artifacts
- lib/server/study.ts, lib/server/test-engine.ts — namespaced idempotency
- lib/server/srs-review.integration.test.ts — updated assertions + wave13-09 §D two-user suite
- lib/server/answer-confidence.integration.test.ts, lib/server/wave11-review-fixes.integration.test.ts
  — stored-id assertions updated to `<userId>:<rawId>`
- tasks/wave13-09-eventid-user-namespacing/verify.sh — gate-10 regex narrowed (false-positive fix)

## Log
- 2026-07-02 planner: task authored from spec §D (deferred W10f item; same column, no migration).
- 2026-07-02 15:05 UTC ClPcs-Mac-mini: implemented Plan item 1 — added `namespacedEventId` helper to
  lib/server/study.ts; recordReview now builds `storedEventId` once and uses it for both the replay
  guard findUnique and the ReviewLog write; submitAnswer's whole-tx guard (lib/server/test-engine.ts)
  switched to `namespacedEventId(params.userId, params.clientEventId)`. Client/validation/action
  layers untouched (server owns namespacing). typecheck + unit tests green. Integration suites that
  assert raw stored ids are EXPECTED red until the next increment (Plan item 2) updates them. Note
  per Constraints: pre-existing dev.db rows keep unprefixed ids and are no longer replay-matched —
  accepted, no data migration.
- 2026-07-02 15:11 UTC ClPcs-Mac-mini: fixed the verify FAIL — gate 10's `\$\{…[uU]serId\}:\$\{`
  regex false-flagged lib/auth.ts:52's pre-existing session-token template
  `${userId}:${tokenVersion}:${exp}` (unrelated to event ids; predates this task). Narrowed the
  pattern to require an eventId-shaped RHS — legitimate gate-bug fix (wave6-07 precedent), no check
  weakened, auth untouched. Then completed Plan item 2: updated stored-id assertions in the three
  suites to `<userId>:<rawId>` (built via string concat as an implementation-independent oracle);
  added the Goal-4 two-user `shared-${RUN}` test (§4a cross-user both record, §4b same-user replay
  whole-tx no-op incl. TestAnswer/ReviewState unchanged). typecheck + unit (498) + integration
  (29 files, 107 passed / 2 skipped) + verify.sh all green → Status: done.


## Verify
**Last verify:** PASS (2026-07-02T15:15:52Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T15:18:19Z)
