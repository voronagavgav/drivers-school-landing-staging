# Task: wave11-13-study-profile-integration-test

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop
**Evaluate:** yes

## Goal
Author `lib/server/study-profile.integration.test.ts` proving the profile/streak/StudyDay logic through
PRODUCTION entry paths. Depends wave11-12. DONE when (verify.sh exits 0):

1. Self-provisions OFFICIAL fixtures (`createOfficialQuestion`, UNIQUE keys/category per run, FK-safe
   cleanup) — noise-proof.
2. PROFILE ACTIONS (self-only RBAC): with auth partial-mocked to fixture user A,
   `setDailyGoalAction`/`setExamDateAction` update ONLY A's `UserStudyProfile` (assert A's row changed;
   a second fixture user B's profile is UNCHANGED). Invalid input (out-of-range goal / bad date) is
   rejected (no write / zod error) — assert the row is not corrupted.
3. STUDYDAY BUMP ON ANSWER: calling `submitAnswer` for the fixture user creates/updates today's
   `StudyDay` row with `reviewCount` incremented; once `reviewCount >= dailyGoal`, `goalMet === true`.
4. STREAK + FREEZE across synthetic days, each driven through the REAL `finishSession` by seeding
   `profile.lastStudyDay`/`freezeTokens` relative to today's Kyiv day key BEFORE finish:
   - `lastStudyDay = today−1` → `finishSession` → `streakCurrent` increments (consecutive), no freeze;
   - `lastStudyDay = today−2`, `freezeTokens = 1` → `finishSession` → streak PRESERVED (not reset),
     `freezeTokens === 0`, `freezeAutoUsedOn` set (auto-freeze);
   - `lastStudyDay = today−3` → `finishSession` → `streakCurrent === 1` (reset), tokens unchanged.
   `streakBest` never decreases across these.
5. File is in the integration list (capture-to-var) and runs GREEN in isolation.

## Constraints / decisions
- PRODUCTION-PATH: profile changes via the real `setDailyGoalAction`/`setExamDateAction`; streak via
   the real `finishSession`; StudyDay via the real `submitAnswer`. Not internal helpers.
- Self-only RBAC is the security assertion (§2): confirm A's action cannot mutate B's profile — there
   is no target-user param, and B's row must be untouched.
- Streak transitions are anchored on TODAY's Kyiv day key with `lastStudyDay` seeded at today−N, so
   each case drives one real finish (finishSession reads the real clock).
- Test-only: NO product edits (bug → mark blocked on wave11-12).
- Verify runs ONLY this file (shared dev-DB state).

## Plan
- [x] Profile action self-only assertions (A vs B).
- [x] StudyDay bump on submitAnswer.
- [x] Three streak/freeze transitions via finishSession with seeded lastStudyDay.

## Next
- [ ] Done — verify.sh green (8 tests). No further increment.

## Artifacts
- lib/server/study-profile.integration.test.ts

## Log
- 2026-07-02 planner: task authored.
- 2026-07-02T02:42Z ClPcs-Mac-mini: authored lib/server/study-profile.integration.test.ts (3
  describes / 8 tests): §2 profile actions self-only via partial-mocked getCurrentUser (A mutates,
  B untouched; invalid goal/date rejected, row uncorrupted); §3 StudyDay reviewCount bump + goalMet
  threshold through real submitAnswer; §4 three streak transitions (consecutive +1 / one-missed
  auto-freeze / ≥3-missed reset) through real finishSession, seeding lastStudyDay = today−N via a
  DST-independent UTC-day-index dayKeyMinus helper anchored on the Kyiv today key. Fixtures via
  createOfficialQuestion (FK-safe cleanup), prisma.$disconnect in a top-level afterAll. verify.sh
  exits 0 — 8 passed, in the integration list.

## Verify
**Last verify:** PASS (2026-07-01T23:42:51Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T23:44:35Z)
