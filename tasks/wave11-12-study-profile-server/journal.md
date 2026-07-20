# Task: wave11-12-study-profile-server

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Server logic for the study profile, StudyDay tracking, detoxified streak, and the study plan — no
learner UI. Depends wave11-10 (streak-policy), wave11-11 (study-plan). DONE when (verify.sh exits 0):

1. `lib/server/study-profile.ts` exports:
   - `getOrCreateProfile(userId)` → the `UserStudyProfile` row (upsert-create defaults if absent);
   - `setExamDateAction(formData)` and `setDailyGoalAction(formData)` — SELF-ONLY server actions:
     they resolve the user via `requireUser()` and update ONLY that user's profile; they NEVER read a
     `userId`/target-user from the client input. zod-validated (examDate = optional ISO date or clear;
     dailyGoal = int in a sane range, e.g. 5..100). Add schemas to `lib/validation.ts`.
   - `bumpStudyDay(userId, tz, tx = prisma)` — upsert today's `StudyDay` (day key = the profile
     `timezone`, default Europe/Kyiv), `reviewCount++`, `goalMet = reviewCount >= profile.dailyGoal`.
2. `bumpStudyDay` is called inside `submitAnswer`'s tx (StudyDay bump on answer), using the user's
   profile timezone. Fire-and-forget analytics stays outside the tx.
3. Streak on `finishSession`: after the recompute, read the profile, compute today's day key in the
   profile tz, call `nextStreakState(prev, todayKey, freezeTokens)` (pure), and persist
   `streakCurrent`/`streakBest`/`lastStudyDay`/`freezeTokens` (and `freezeAutoUsedOn` when a freeze
   fired). Server returns state only — NO punitive messaging.
4. `getStudyPlan(userId)` in `lib/server/study.ts`: gathers `examDate` + due count (ReviewState due at
   now) + unseen count for the user's category, calls the pure `computeStudyPlan(...)`, returns
   `{ daysLeft, dailyQuota, feasible, message }`.
5. `npm run typecheck` exits 0; `npm run build` exits 0.

## Constraints / decisions
- RBAC SELF-ONLY is a security property (spec §F) — proven behaviorally in wave11-13 (Evaluate). Here:
   the actions must derive identity from `requireUser()`, never from a client-supplied user id.
- Detoxified streak: a single missed day auto-consumes a freeze token (via wave11-10 policy); never a
   punitive reset in copy — the server layer emits STATE only.
- Day-key-in-timezone derivation is a small server util (reads server `now`); keep the streak/plan
   MATH in the pure modules (wave11-10/11) — this module only orchestrates + persists.
- No learner UI (dashboard cards / plan UI are W12).

## Plan
- [x] getOrCreateProfile + validation schemas + self-only actions (+ bumpStudyDay defined).
- [x] bumpStudyDay + wire into submitAnswer tx.
- [x] Streak recompute in finishSession via nextStreakState.
- [x] getStudyPlan via computeStudyPlan.

## Next
- [ ] (none — Goal met, verify.sh green) Behavioral RBAC/streak/plan proof lands in wave11-13.

## Artifacts
- lib/server/study-profile.ts — getOrCreateProfile, setExamDateAction, setDailyGoalAction (self-only via
  requireUser), bumpStudyDay, dayKeyInTimezone (en-CA day key in profile tz).
- lib/validation.ts — setExamDateSchema (ISO date | clear), setDailyGoalSchema (coerced int 5..100).
- lib/server/test-engine.ts — submitAnswer tx now calls bumpStudyDay(userId, profile.timezone, tx, now)
  inside the first-attempt block (mirrors recordReview; analytics stays outside tx); finishSession
  advances the detoxified streak via pure nextStreakState after the readiness recompute, persisting
  streakCurrent/streakBest/lastStudyDay/freezeTokens (+ freezeAutoUsedOn when a freeze fired).
- lib/server/study.ts — getStudyPlan(userId, now?) gathers examDate + due (ReviewState dueAt<=now) +
  unseen counts for the user's selectedCategory (where:{userId} scan + JS join, no id-list in), delegates
  to pure computeStudyPlan.

## Log
- 2026-07-02 planner: task authored.
- 2026-07-02 ClPcs-Mac-mini: authored lib/server/study-profile.ts (getOrCreateProfile upsert w/ optional
  tx; self-only setExamDate/setDailyGoal actions returning {ok}|{error}; bumpStudyDay upsert w/ tz day
  key + goalMet; dayKeyInTimezone via Intl en-CA). Added setExamDateSchema/setDailyGoalSchema to
  lib/validation.ts. `npm run typecheck` exits 0. Wiring into submitAnswer/finishSession + getStudyPlan
  remain (verify.sh not yet green — needs test-engine.ts wiring + getStudyPlan in study.ts).
- 2026-07-02 ClPcs-Mac-mini: completed the pure-module wiring (fixes the FAILing nextStreakState gate +
  the two remaining gates, all interdependent). test-engine.ts: submitAnswer bumps StudyDay in-tx on the
  first attempt via bumpStudyDay(userId, profile.timezone, tx, now); finishSession advances the
  detoxified streak via pure nextStreakState after the readiness recompute (persists streak fields +
  freezeAutoUsedOn on freeze). study.ts: added getStudyPlan(userId, now?) delegating to pure
  computeStudyPlan over exam date + due/unseen counts for the user's selectedCategory (userId-scan JS
  join, no id-list `in`). typecheck 0, build 0, verify.sh PASS. Status → done.


## Verify
**Last verify:** PASS (2026-07-01T23:36:49Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T23:39:05Z)
