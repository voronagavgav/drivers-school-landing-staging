# Task: wave16-10-exam-outcome-capture

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-04T18:00Z
**Last compute:** mac-mini

## Goal
Spec T3 (capture half): self-reported real-exam outcome on the account page — «Склав / Не склав» +
exam date — own-user only. PASS = ALL true:

1. A server action `reportExamOutcomeAction` exists in `lib/server/study-profile.ts` (house home
   of profile writes): resolves the user via `getCurrentUser()`/`requireUser()` and writes ONLY
   that user's `UserStudyProfile` (`outcome` from `z.enum(EXAM_OUTCOMES)`, `examOutcomeDate` via
   `z.iso.datetime()` or a date-input string schema in lib/validation.ts, `examOutcomeReportedAt`
   set server-side). The action accepts NO userId parameter — identity comes from the session
   ONLY (IDOR-impossible by construction; assert the signature in the test).
2. On success the action records the typed analytics event `exam_outcome_reported` via
   `recordEvent` (fire-and-forget `void`, OUTSIDE any transaction — house rule) with payload
   limited to `{ outcome, examDate }` (enum + ISO date, no free text).
3. Account page (`app/(app)/account/page.tsx`, next to the exam-date section per wave16-01
   Findings 1e) renders the outcome form: two-option choice «Склав» / «Не склав» + date input,
   wired through the house inline-`"use server"` wrapper → client form pattern. Current saved
   outcome is displayed after save. Copy: neutral, factual («Як пройшов іспит?» — no
   congratulation/guilt asymmetry in form copy).
4. Integration test `lib/server/exam-outcome.integration.test.ts` via the REAL action
   (partial-mock getCurrentUser):
   a. valid FAILED + date → profile row updated for THE SESSION user, `examOutcomeReportedAt`
      set; `vi.waitFor`-polled `exam_outcome_reported` AnalyticsEvent count = 1 (house
      fire-and-forget rule);
   b. IDOR probe: with getCurrentUser mocked as user A, a crafted FormData that ALSO smuggles a
      `userId` field for user B → user B's profile is UNCHANGED (assert B's row byte-equal
      before/after);
   c. invalid outcome string → `{ error }` (Ukrainian), no profile change;
   d. PASSED without date → per schema decision (date required alongside outcome — reject with
      Ukrainian error; record decision in Log if changed).
5. NO nudge logic in this task (wave16-11) — grep: no edits to lib/nudge-policy.ts or
   lib/server/nudges.ts.
6. `npx tsc --noEmit`, `npm test`, `npm run test:integration` exit 0.

## Constraints / decisions
- Own-user-only is enforced by construction: the action derives identity from the session and
  ignores any client-supplied user identifier. The IDOR test proves smuggled ids are inert.
- examOutcomeDate is the REAL service-center exam date (may be past); it is distinct from
  `examDate` (the planned/target date used by the plan). Do not overwrite `examDate`.
- Re-submitting overwrites the previous outcome (latest wins) — one row per user, no history
  table this wave (conservative scope).
- Depends on: wave16-02 (EXAM_OUTCOMES, analytics event name), wave16-03 (columns).

## Next
- [x] Add the validation schema, the action, the account-page form, then the integration test.
- (none — Goal fully met; all 6 criteria verified green.)

## Artifacts
- lib/server/study-profile.ts — reportExamOutcomeAction
- lib/validation.ts — outcome schema
- app/(app)/account/page.tsx (+ components/account-forms.tsx if the client form lives there)
- lib/server/exam-outcome.integration.test.ts

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T18:00Z ClPcs-Mac-mini: implemented the full T3 capture slice. Added
  `reportExamOutcomeSchema` (lib/validation.ts — outcome `z.enum(EXAM_OUTCOMES)` + required
  `examDate` via DATE_KEY_RE; date REQUIRED alongside outcome per criterion 4d). Added
  `reportExamOutcomeAction(formData)` to lib/server/study-profile.ts — SELF-ONLY via
  requireUser(), takes NO userId param, upserts only the session user's examOutcome/
  examOutcomeDate/examOutcomeReportedAt(server-stamped), then `void recordEvent(
  "exam_outcome_reported", user.id, {outcome, examDate})` outside any tx (house rule).
  Added `ExamOutcomeForm` (components/account-forms.tsx — two-option «Склав»/«Не склав»
  radios + date input, neutral copy) and wired an inline-`"use server"` wrapper + Card
  «Як пройшов іспит?» next to the exam-date section (app/(app)/account/page.tsx), showing
  the current saved mark. Wrote lib/server/exam-outcome.integration.test.ts (5 tests: signature
  arity, valid FAILED+date+vi.waitFor analytics poll, IDOR smuggled-userId inert/B byte-equal,
  invalid outcome rejected, PASSED-without-date rejected). Verify: `tsc --noEmit` exit 0;
  `npm test` 588 passed; `npm run test:integration` 45 files 195 passed / 2 skipped. No edits
  to nudge-policy/nudges (criterion 5). Status → done.

## Verify
**Last verify:** PASS (2026-07-04T14:59:23Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T15:00:26Z)
