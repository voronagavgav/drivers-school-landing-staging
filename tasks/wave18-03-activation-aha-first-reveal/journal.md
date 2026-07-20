# Task: wave18-03-activation-aha-first-reveal

**Status:** done
**Driver:** auto
**Updated:** 2026-07-06T10:12Z
**Last compute:** mac-mini

## Goal
Spec wave18 T3 (CONFIRMED #4, minor). In `lib/server/test-engine.ts` (~L468–484) the `activation_aha`
event gates on `showsImmediateFeedback(mode) && question.explanation && testAnswer.count === 1` where
the count is `prisma.testAnswer.count({ where: { testSession: { userId } } })` — i.e. GLOBAL answer
count over ALL modes. Because `showsImmediateFeedback` is FALSE for DIAGNOSTIC & EXAM_SIMULATION, a user
whose FIRST answer is a diagnostic/exam question bumps the global count past 1 WITHOUT entering the
feedback block, so `activation_aha` NEVER fires for the onboarding/diagnostic-first cohort — the exact
cohort the funnel exists to instrument. Fix: fire on the FIRST answer that BOTH shows feedback AND has
an explanation (a first-REVEAL check), scoped to qualifying answers only, not the global count.

PASS = ALL true (oracle scenarios below are hand-computed known answers, frozen at plan time —
`activation_aha` counted via `prisma.analyticsEvent.count({ where: { userId, eventName:
"activation_aha" } })`, polled with `vi.waitFor` because the event is fire-and-forget):

1. The gate no longer uses a GLOBAL `testAnswer.count === 1`. The count/condition that decides firing
   MUST restrict to qualifying answers only — answers in a FEEDBACK-mode session (mode NOT in
   {EXAM_SIMULATION, DIAGNOSTIC}, mirroring `showsImmediateFeedback`) whose question HAS an explanation
   — and fire exactly when THIS answer is the user's first such qualifying answer. Verify by grep: the
   firing block no longer contains a bare `=== 1` over an unfiltered `testAnswer.count({ where: {
   testSession: { userId … } } })`; the query filters on session mode AND question explanation.
2. ORACLE A (the bug cohort — must FIRE): a user answers a DIAGNOSTIC question FIRST (no feedback), then
   answers a MIXED_PRACTICE question that HAS an explanation → `activation_aha` count for that user ==
   1, and the recorded event's payload `mode` is `MIXED_PRACTICE` (the answer it fired on), NOT
   DIAGNOSTIC. (Under the OLD code this count would be 0 — the test must fail on the pre-fix engine.)
3. ORACLE B (MIXED-first — still FIRES once): a fresh user whose FIRST answer is a MIXED_PRACTICE
   feedback question with an explanation → `activation_aha` count == 1.
4. ORACLE C (fire-once): after Oracle B's user answers a SECOND and THIRD qualifying MIXED_PRACTICE
   question with explanations, their `activation_aha` count is STILL 1 (never double-counts).
5. ORACLE D (explanation required): a user whose first qualifying-mode answer is to a question with NO
   explanation does NOT fire on it; a later MIXED_PRACTICE answer WITH an explanation is what fires
   `activation_aha` (count becomes 1 on the explanation answer, 0 before it).
6. Fire-once + off the hot path: firing stays a fire-and-forget `void recordEvent(...)` OUTSIDE the
   write `$transaction` (never awaited on the answer path), exactly as today. A pure replay (re-submit
   of the same answer) still records no second event.
7. Integration test lives at `lib/server/activation-aha.integration.test.ts`, drives the REAL submit
   path (`submitAnswer` / `submitAnswerAction`, the entry the app calls — NOT a hand-rolled internal
   count), and covers Oracles A–D. `npx tsc --noEmit` · `npm test` · `npm run test:integration` all
   exit 0.

## Constraints / decisions
- Keep the mode filter CONSISTENT with `showsImmediateFeedback` (both exclude EXAM_SIMULATION &
  DIAGNOSTIC) — if you introduce a shared mode list, both the outer guard and the count filter derive
  from it, so they can't drift. The outer guard `showsImmediateFeedback(session.mode) &&
  question.explanation` already ensures THIS answer qualifies, so the count query only needs to count
  the user's TOTAL qualifying answers (including this one) and fire when that equals 1.
- Additive / behaviour-preserving for the already-working MIXED-first cohort (Oracle B/C unchanged from
  intent). No schema change (`activation_aha` already in `ANALYTICS_EVENTS`, `lib/constants.ts`). No new
  event names.
- Analytics cleanup: the test seeds real analyticsEvent rows; delete them for its fixture users in
  teardown BEFORE deleting the users (`AnalyticsEvent.userId` is SetNull — orphaned null-userId rows
  would pollute later funnel counts), per the CLAUDE.md analytics-teardown learning.
- To build a DIAGNOSTIC-first-then-MIXED user: two throwaway sessions on the same fixture category —
  a DIAGNOSTIC session answered first, then a MIXED_PRACTICE session — the fixture questions carry real
  explanations (createOfficialQuestion options + a patched explanation if the fixture lacks one; ensure
  at least one fixture question HAS an explanation and, for Oracle D, one WITHOUT).

## Next
- [x] Replace the global `testAnswer.count === 1` gate with a qualifying-answers-only first-reveal
      count; write the A–D oracle integration test driving the real submit path.
- Goal met. If verify re-runs red, check the LAN-server / dev-DB state — the change is code-only
  (no schema/migration).

## Artifacts
- `lib/server/test-engine.ts` (~L253–258, L468–498): new exported `WITHHELD_FEEDBACK_MODES`
  single-source-of-truth const; `showsImmediateFeedback` derives from it; the `activation_aha` count
  now filters `testSession.mode notIn WITHHELD_FEEDBACK_MODES` AND `question.explanation isNot null`
  (qualifying-answers-only first-reveal) instead of the GLOBAL `testAnswer.count === 1`.
- `lib/server/activation-aha.integration.test.ts` (new): Oracles A–D over the real `submitAnswer`
  path; A & D provably fail on the pre-fix global-count gate (verified by temp-reverting).

## Log
- 2026-07-06 mac-mini: planned from specs/wave18-funnel-fixes.md T3.
- 2026-07-06T10:12Z ClPcs-Mac-mini: fixed the gate — introduced `WITHHELD_FEEDBACK_MODES` const so
  `showsImmediateFeedback` and the aha count can't drift; the count now restricts to qualifying
  answers (feedback-mode session + question has explanation) and fires when THIS is the first such.
  Wrote `activation-aha.integration.test.ts` (A–D, real submit path, analytics teardown before user
  delete). Verified non-vacuous: temp-reverting the count to the global form makes Oracle A & D fail.
  `tsc` clean; `npm test` 608 pass; new suite + diagnostic-withhold + funnel-events integration green.

## Verify
**Last verify:** PASS (2026-07-06T07:12:43Z)

## Evaluation
**Last evaluation:** PASS (2026-07-06T07:14:31Z)
