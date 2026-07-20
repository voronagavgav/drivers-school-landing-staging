# Task: wave19a-07-capture-wiring-ui

**Status:** done
**Driver:** auto
**Updated:** 2026-07-12
**Last compute:** ClPcs-Mac-mini

CAPTURE SURFACE (Part 2 §J). Wire `recordExamOutcome` (wave19a-06) into the REAL user-facing exam-outcome report
path so that when a learner honestly reports their ТСЦ exam result, a calibration `PassOutcome` pair is captured.
The account page ALREADY has the honest control `ExamOutcomeForm` («Як пройшов іспит?» → PASSED/FAILED via
`reportExamOutcomeAction`, `lib/server/study-profile.ts`) — reuse it; do NOT add a second, duplicative "did you
pass?" control (that would be a confusing dark-pattern surface).

## Goal
PASS = ALL true:

1. `reportExamOutcomeAction` (the action the account `ExamOutcomeForm` posts to) additionally calls
   `recordExamOutcome(outcome === "PASSED", ...)` on a successful PASSED/FAILED report (the calibration insert is
   AWAITED so the row is durable; only the analytics event stays fire-and-forget). No new client-facing control is
   added; the existing account exam-outcome UI is the entry point.
2. PRODUCTION-PATH integration test (extend `lib/server/exam-outcome.integration.test.ts` or a sibling) drives
   `reportExamOutcomeAction` (NOT recordExamOutcome directly) via `FormData` and asserts that, with a seeded
   sufficient-data `ReadinessSnapshot` (`passProbability: 0.61`) for the session user, a PASSED report creates BOTH
   the `UserStudyProfile.examOutcome = "PASSED"` row AND exactly one `PassOutcome` with
   `predictedPassProbability === 0.61`, `passed === true`, `source === "self_report"`.
3. The IDOR/self-only guarantees of the existing action are preserved: a smuggled `userId` FormData field is inert
   (no PassOutcome or profile row for another user). (The existing §b IDOR test still passes; add a PassOutcome
   assertion for user B = 0 rows.)
4. When the session user has NO sufficient-data snapshot, a PASSED report still succeeds and writes the profile row
   but creates NO PassOutcome (graceful — the capture gate holds).
5. `npm run -s typecheck` exits 0; `npm run -s db:seed` then `npm run -s test:integration` exits 0.
6. Browser smoke (served app): the account page still renders the exam-outcome control and it submits without error.
   verify.sh drives it via "$DRIVER_BROWSER_CMD" against the account page; the deeper DB assertion is the
   integration test above. (If the app is not served in the driver env, this step is covered by wave19a-09.)

## Constraints / decisions
- Design/craft (frontend-design — no visible control is being redesigned, but if any copy is touched): copy is
  design material — the existing «Як пройшов іспит?» / «Склав/Не склав» is honest and active; keep it. One job per
  element — do NOT bolt calibration language onto the control; the capture is a silent, honest consequence of the
  report the user already makes. No fabricated claims, no scarcity, no second "did you pass?" prompt. 44px targets,
  visible focus, reduced-motion respected — inherited from the existing form; do not regress them.
- The calibration `PassOutcome` insert is a SEPARATE table/purpose from `UserStudyProfile.examOutcome`; compose,
  don't merge. Await the insert (durability), keep `recordEvent` fire-and-forget.
- Do NOT change the existing action's public signature (single `FormData`) — the account page + its IDOR test
  depend on it.
- Non-goals: the admin read view (08), the metrics module, isotonic, any new client component.

## Next
- [x] Compose `recordExamOutcome` into `reportExamOutcomeAction`; extend the production-path integration test with
      the PassOutcome assertions; run typecheck + integration; browser smoke the account control.
- (Goal met. Item 6 served-app browser smoke is deferred to wave19a-09 per the task note — no app served in
  this driver tick; the deeper DB assertion is the §e integration test.)

## Log
- 2026-07-07 laptop: planned.
- 2026-07-12 ClPcs-Mac-mini: Composed the calibration capture into the honest report path — `reportExamOutcomeAction`
  (lib/server/study-profile.ts) now `await`s `recordExamOutcome(outcome === "PASSED")` after the profile upsert (durable
  insert; `recordEvent` stays fire-and-forget). No new client control — reuses the existing account `ExamOutcomeForm`.
  Extended lib/server/exam-outcome.integration.test.ts: §b now also asserts user B has 0 PassOutcome rows (IDOR-safe for
  the composed capture); new §e drives a PASSED report through the action with a seeded sufficient-data
  ReadinessSnapshot (passProbability 0.61) → asserts profile examOutcome=PASSED AND exactly one PassOutcome
  {predictedPassProbability 0.61, passed true, source "self_report"}; new §f (fresh user, no snapshot) → profile written
  but 0 PassOutcome (honesty-law gate holds). Added fixtureC + userCId to the harness (Cascade cleanup via user delete).
  `npm run -s typecheck` clean; `db:seed` then full `test:integration` green (60 files / 260 passed, 2 skipped).

## Artifacts
- lib/server/study-profile.ts — reportExamOutcomeAction composes recordExamOutcome (awaited).
- lib/server/exam-outcome.integration.test.ts — §b PassOutcome-0 assertion + new §e/§f production-path capture tests.

## Verify
**Last verify:** PASS (2026-07-12T13:52:31Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T13:55:09Z)
