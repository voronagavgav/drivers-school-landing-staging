# Task: wave12b-04-finalize-session

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §G (W11-review deferrals): make the post-finish recompute+streak RETRYABLE and reconcile
streak↔StudyDay. Read `docs/app-plan/WAVE12B-SURFACES.md` §Finish path FIRST (task 01 pins the
`getOrCreateProfile` call sites and whether the "double upsert" premise holds).

PASS = ALL true:

1. `lib/server/test-engine.ts` exports `finalizeSession(sessionId: string): Promise<void>` (or with an
   optional injected `now`) that performs ALL post-completion side effects keyed off a COMPLETED
   session row: touched-topic recompute (`recomputeTopicMastery`), `recomputeReadiness`, and the
   streak/StudyDay update. It loads what it needs from the session id (no captured in-memory state),
   so it is safe to call again later for the same session.
2. `finishSession` calls `finalizeSession` for its recompute+streak work (the old inline block at
   ~lines 494–531 is replaced by the call — grep: `finalizeSession(` appears in `finishSession` and
   `recomputeReadiness(` no longer appears inline inside `finishSession`'s body outside `finalizeSession`).
3. IDEMPOTENT streak: re-running `finalizeSession` for an already-finalized session does NOT advance
   the streak again, does NOT double-count the StudyDay, and does not throw. Mechanism decision:
   key the streak/StudyDay step off the StudyDay row for the session's completion day (one source of
   truth: StudyDay rows — spec §G), e.g. streak walk derives from goalMet StudyDay history rather than
   a bare lastStudyDay compare, or an equivalent guard task 01's DECISION pins.
4. De-dupe: at most ONE `getOrCreateProfile` upsert executes per finish flow inside
   `finishSession`/`finalizeSession` (if task 01 REFUTED the double-upsert premise, document that in
   the Log and keep the single call — criterion is then vacuously met, but the reconcile in 3 still applies).
5. Streak↔StudyDay agreement: after finishing a session that meets the daily goal, the same
   transaction/flow leaves BOTH a goalMet StudyDay row for that day AND an advanced `streakCurrent`,
   and they agree (a day with goalMet=true is exactly a day the streak walk counts).
6. `lib/server/finalize-session.integration.test.ts` exists and, via the REAL paths
   (`createOfficialQuestion` fixture, real `startSession`/`submitAnswer`/`finishSession`), asserts:
   (a) finish → streakCurrent/StudyDay/TopicMastery written; (b) calling `finalizeSession(sessionId)`
   a SECOND time → `streakCurrent`, `streakBest`, and the day's StudyDay `answeredCount`/`goalMet`
   are UNCHANGED and no error is thrown; (c) TopicMastery values unchanged after the re-run.
   FK-safe cleanup order per CLAUDE.md (user before questions).
7. Existing `finish-idempotency.integration.test.ts` and `wave11-review-fixes.integration.test.ts`
   still pass; `npm run test:integration` exits 0; `npm run typecheck` + `npm test` + `npm run build` exit 0.
8. `npx vitest list -c vitest.integration.config.ts` (captured to a var) includes
   `finalize-session.integration.test.ts`.

## Constraints / decisions
- `finalizeSession` may create a NEW ReadinessSnapshot row on re-run (recompute is snapshot-append by
  design) — idempotence is defined over user-visible aggregates: streak fields, StudyDay, TopicMastery
  values. Do NOT contort recomputeReadiness into row-level dedupe.
- Keep fire-and-forget `void recordEvent(...)` analytics OUTSIDE any `$transaction` (CLAUDE.md).
- Do NOT change the FSRS math, grading, or session scoring — this is plumbing extraction only.
- Non-Goal: calling finalizeSession from a retry queue/cron (W13+); only inline + re-callable.

## Plan
- [x] Read WAVE12B-SURFACES.md §Finish path + the current finishSession block.
- [x] Extract finalizeSession; rework streak step to StudyDay-derived/guarded.
- [x] Write finalize-session.integration.test.ts (re-run idempotence).
- [x] Full suite + verify.sh.

## Done
- [x] Extracted `finalizeSession(sessionId, now?)` (test-engine.ts): loads the session by id, no-ops
      unless COMPLETED, runs snapshotProgress + touched-topic recomputeTopicMastery +
      recomputeReadiness + the streak step. `finishSession` now calls it (criteria 1–2).
- [x] Streak reconcile (criteria 3, 5): advances ONLY when the completion day's StudyDay row has
      goalMet=true (StudyDay = source of truth), day key from `session.finishedAt` (not wall clock),
      forward-only guard (`lastStudyDay < dayKey`) → re-run is a no-op, retry after later activity
      can't regress lastStudyDay.
- [x] De-dupe (criterion 4): `bumpStudyDay(userId, tx?, now?)` now owns its profile fetch/timezone
      (dropped `tz` param); deleted the outer `getOrCreateProfile` in submitAnswer — one profile
      upsert per first-attempt answer, one per finalize.
- [x] Integration test (criteria 6, 8): `lib/server/finalize-session.integration.test.ts` — real
      startSession/submitAnswer/finishSession over a `createOfficialQuestion` fixture (dailyGoal 1);
      asserts (a) streak/StudyDay/TopicMastery written, (b) second `finalizeSession(sessionId)`
      resolves and leaves streakCurrent/streakBest/lastStudyDay/freezeTokens + StudyDay
      reviewCount/goalMet unchanged, (c) TopicMastery meanR/coverage/band/itemsSeen/itemsTotal
      unchanged. FK-safe cleanup via fixture.cleanup().
- [x] Re-run determinism fix the test exposed: `recomputeTopicMastery`/`recomputeReadiness` gained an
      optional trailing `now` param; `finalizeSession` passes `session.finishedAt ?? now` so a retry
      recomputes identical retrievability numbers (wall-clock decay made meanR drift ~1e-8 between
      runs — a real retryability gap, fixed in code, not the assertion).
- [x] Full gate (criterion 7): verify.sh PASS end-to-end (typecheck, 422 unit, build, seed,
      25/25 integration suites, 90 passed + 2 sanctioned skips).

## Next
- (none — Goal fully met, verify.sh PASSes end-to-end)

## Artifacts
- lib/server/test-engine.ts (finalizeSession + submitAnswer de-dupe + finishedAt-keyed recompute
  refNow), lib/server/mastery-readiness.ts (injectable `now` on both recomputes),
  lib/server/study-profile.ts (bumpStudyDay owns profile/tz),
  lib/server/study-profile.integration.test.ts (§4 updated to §G semantics),
  lib/server/finalize-session.integration.test.ts (criterion 6)

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 08:06 UTC ClPcs-Mac-mini: extracted finalizeSession per WAVE12B-SURFACES §Finish path
  DECISION (snapshot/recompute/streak moved; analytics stays inline in finishSession). Streak is now
  goalMet-gated + finishedAt-keyed + forward-only (criteria 3/5); bumpStudyDay single-owner de-dupe
  (criterion 4 — task 01 CONFIRMED the double upsert but located it on the SUBMIT path, 418+103, so
  the fix lands there; finishSession itself always had one call). ORACLE NOTE: study-profile
  integration §4 seeded default dailyGoal(15) and asserted streak advance on a 1-answer finish —
  encoding the exact pre-§G semantics the spec calls the bug ("streak advances on ANY finished
  session regardless of goal"); updated the fixture to dailyGoal:1 (evidence: journal criterion 5 +
  WAVE12B-SURFACES §Finish path nextStreakState bullet), assertions themselves untouched. typecheck
  + npm test (422) green; study-profile/finish-idempotency/wave11-review-fixes integration suites
  green (12/12). Next: the finalize-session integration test.
- 2026-07-02 08:17 UTC ClPcs-Mac-mini: wrote finalize-session.integration.test.ts (criterion 6,
  mirrors study-profile suite conventions; no auth mock needed — engine fns take userId). Its (c)
  assertion caught a REAL retryability gap: recomputeTopicMastery hardcoded `new Date()`, so a
  re-run's meanR drifted (retrievability decays with wall-clock) — fixed in CODE per oracle
  integrity: both recomputes take optional trailing `now`, finalizeSession passes
  `session.finishedAt ?? now` (same row-derived-time principle as the streak dayKey). First full
  test:integration run had ONE red: analytics-dashboard (fixture path crowded out of the top-10
  topPaths by 481 accumulated dev.db AnalyticsEvent rows — pre-existing state, physically untouched
  by this task; verify.sh's `db:seed` clears AnalyticsEvent). After reseed: 25/25 suites green.
  verify.sh PASS end-to-end (typecheck + 422 unit + build + seed + integration). Status → done.


## Verify
**Last verify:** PASS (2026-07-02T08:18:19Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T08:21:57Z)
