# Task: wave14-02-nudge-policy-pure

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02T21:04Z
**Last compute:** mac-mini

## Goal
PURE nudge decision policy (spec §A) — `lib/nudge-policy.ts`, no DB, no `server-only`, fully
deterministic (all state injected). PASS = ALL true:

1. `lib/constants.ts` exports: `NUDGE_KINDS = ["REVIEW_DUE","EXAM_COUNTDOWN","DAY_OFF_OFFER","READINESS_MILESTONE"] as const`,
   `NUDGE_WEEKLY_CAP = 4`, `NUDGE_WINDOW_DAYS = 7`, `NUDGE_EXAM_COUNTDOWN_DAYS = [7,3,1] as const`,
   `NUDGE_READINESS_MILESTONES = [25,50,75] as const`, `NUDGE_EVENING_HOUR = 18` (each with a short
   why-comment, house style).
2. `lib/nudge-policy.ts` exports `NudgeKind` (union from NUDGE_KINDS), `NudgeInput` (interface below),
   and `decideNudge(input: NudgeInput): { kind: NudgeKind; dedupeKey: string } | null`. The input
   interface is EXACTLY (names pinned so wave14-03 composes):
   `{ dayKey: string; userId: string; dueCount: number; examDaysLeft: number | null;
      streakAlive: boolean; yesterdayGoalMet: boolean; todayReviewCount: number; localHour: number;
      readinessPrev: number | null; readinessCurr: number | null; sufficientData: boolean;
      sentLast7Days: number; emittedToday: boolean;
      settings: { notifReviewDue: boolean; notifExamCountdown: boolean; notifStudyReminder: boolean } }`.
3. Pinned semantics (implement exactly — these ARE the spec §A rules made concrete):
   - Global suppressors, checked first: `emittedToday === true` → null (one nudge/day);
     `sentLast7Days >= NUDGE_WEEKLY_CAP` → null (rolling ≤4/7d cap).
   - Priority order when several kinds qualify: EXAM_COUNTDOWN > REVIEW_DUE > READINESS_MILESTONE >
     DAY_OFF_OFFER.
   - EXAM_COUNTDOWN qualifies iff `settings.notifExamCountdown` && `examDaysLeft` ∈ {7,3,1} (exactly;
     0, 2, 5, null do NOT fire).
   - REVIEW_DUE qualifies iff `settings.notifReviewDue` && `dueCount > 0`.
   - READINESS_MILESTONE qualifies iff `settings.notifStudyReminder` && `sufficientData` &&
     both readiness values non-null && some m ∈ {25,50,75} has `readinessPrev < m && readinessCurr >= m`
     (upward crossing only; downward never fires).
   - DAY_OFF_OFFER qualifies iff `settings.notifStudyReminder` && `streakAlive` && `yesterdayGoalMet`
     && `todayReviewCount === 0` && `localHour >= NUDGE_EVENING_HOUR`.
   - dedupeKey = kind + ":" + dayKey + ":" + userId (STRING CONCAT, matching the NotificationLog
     dedupeKey shape `<kind>:<day>:<userId>`).
4. ORACLE (frozen at plan time 2026-07-02, BEFORE implementation — do not alter the expected values):
   `lib/nudge-policy.test.ts` contains a vector table asserting, from base input
   B = { dayKey:"2026-07-02", userId:"u1", dueCount:0, examDaysLeft:null, streakAlive:false,
   yesterdayGoalMet:false, todayReviewCount:0, localHour:10, readinessPrev:null, readinessCurr:null,
   sufficientData:false, sentLast7Days:0, emittedToday:false, settings all true }:
   - V1  B                                              → null
   - V2  B+{dueCount:5}                                 → kind REVIEW_DUE, dedupeKey "REVIEW_DUE:2026-07-02:u1"
   - V3  B+{dueCount:5, examDaysLeft:3}                 → kind EXAM_COUNTDOWN (priority over REVIEW_DUE)
   - V4  B+{examDaysLeft:5}                             → null;  B+{examDaysLeft:2} → null;  B+{examDaysLeft:0} → null
   - V5  B+{examDaysLeft:7} → EXAM_COUNTDOWN;  B+{examDaysLeft:1} → EXAM_COUNTDOWN
   - V6  B+{dueCount:5, sentLast7Days:4}                → null (cap)
   - V7  B+{dueCount:5, sentLast7Days:3}                → REVIEW_DUE (4th send allowed — cap is ≤4)
   - V8  B+{dueCount:5, emittedToday:true}              → null (one per day)
   - V9  B+{dueCount:5, settings.notifReviewDue:false}  → null
   - V10 B+{readinessPrev:48, readinessCurr:52, sufficientData:true} → READINESS_MILESTONE
   - V11 V10+{sufficientData:false}                     → null
   - V12 B+{readinessPrev:52, readinessCurr:48, sufficientData:true} → null (downward)
   - V13 B+{readinessPrev:20, readinessCurr:80, sufficientData:true} → READINESS_MILESTONE (multi-cross → one nudge)
   - V14 B+{readinessPrev:50, readinessCurr:50, sufficientData:true} → null (must CROSS, prev<m required)
   - V15 B+{streakAlive:true, yesterdayGoalMet:true, localHour:19}   → DAY_OFF_OFFER
   - V16 V15+{localHour:14}                             → null (evening = localHour ≥ 18)
   - V17 V15+{todayReviewCount:3}                       → null (today must be empty)
   - V18 V15+{settings.notifStudyReminder:false}        → null
   - V19 V15+{dueCount:2}                               → REVIEW_DUE (priority over DAY_OFF_OFFER)
5. Purity: `lib/nudge-policy.ts` contains NONE of `server-only`, `@/lib/db`, `@prisma/client`,
   `lib/generated`, `Math.random`, `Date.now`, `new Date(` (all inputs injected; no wall clock).
6. `npm test` exits 0 (new tests included); `x="$(npx vitest list)"` contains `nudge-policy.test.ts`.
7. `npm run typecheck` exits 0.
8. No schema/migration change; `bash tasks/wave14-02-nudge-policy-pure/verify.sh` exits 0.

## Constraints / decisions
- Oracle vectors frozen by the PLANNER before any implementation existed (anti self-grading). The
  implementer may add MORE cases but may not change V1–V19's inputs/expected outputs, which are also
  pinned in verify.sh greps.
- No separate red-test oracle task: the driver backlog runs sequentially and other tasks' verify gates
  run `npm test` — a red window would cross-couple. The frozen-literal vectors in this journal +
  verify.sh serve as the external oracle instead.
- dedupeKey built by string concat (NOT a `${...}:${...}` template ending in a userId→eventId shape) —
  keeps clear of the wave13-09 single-builder gate; irrelevant match-wise but cheap insurance.
- Quiet hours (`notifQuietStart/End`) are OUT OF SCOPE: these are in-app dashboard cards rendered on
  visit, not pushes; note this in code comment. Web Push remains deferred (spec Out-of-scope).
- `examDaysLeft` derivation (whole days, timezone) is wave14-03's concern — the pure fn only sees the int.

## Next
- [x] Add constants, then implement decideNudge + the V1–V19 vector table in lib/nudge-policy.test.ts.
- (none — Goal fully met; verify.sh PASS. wave14-03 can build lib/server/nudges.ts on the pinned NudgeInput.)

## Artifacts
- lib/nudge-policy.ts, lib/nudge-policy.test.ts, lib/constants.ts (nudge block «---- Nudges (Wave 14) ----»)

## Log
- 2026-07-02T20:43Z planner: task created; oracle V1–V19 frozen.
- 2026-07-02T21:04Z ClPcs-Mac-mini: added the 6 nudge constants to lib/constants.ts; implemented
  lib/nudge-policy.ts (decideNudge — suppressors first, priority EXAM_COUNTDOWN > REVIEW_DUE >
  READINESS_MILESTONE > DAY_OFF_OFFER, dedupeKey via string concat); wrote lib/nudge-policy.test.ts
  with the frozen V1–V19 table verbatim (19 tests, grouped by kind). typecheck 0; npm test 542/542;
  `bash tasks/wave14-02-nudge-policy-pure/verify.sh` → PASS wave14-02. Status → done.

## Verify
**Last verify:** PASS (2026-07-02T21:04:49Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T21:05:39Z)
