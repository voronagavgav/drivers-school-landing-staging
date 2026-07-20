# Task: wave19a-06-record-exam-outcome-action

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-12
**Last compute:** laptop

CAPTURE WIRING (Part 2 §I). Add `recordExamOutcome` — a self-only server helper/action that snapshots the user's
CURRENT predicted P(pass) and inserts a `PassOutcome` calibration row. Depends on wave19a-04 (schema). The
account-form integration (driving it from the real `reportExamOutcomeAction` path) is wave19a-07; this task builds
+ directly-tests the capture unit with auth/IDOR guards.

## Goal
PASS = ALL true:

1. A new server module (e.g. `lib/server/pass-outcome.ts`) exports `recordExamOutcome(passed: boolean, categoryId?: string)`
   that: resolves identity via `requireUser()` (NO `userId` parameter — IDOR-impossible by construction);
   validates the input with zod v4 (`{ error }` messages) — `passed` boolean, optional `categoryId` string;
   reads the user's latest readiness via `getLatestReadiness(user.id, categoryId ?? user.selectedCategoryId)`;
   and, WHEN a latest snapshot exists with `sufficientData === true`, inserts one `PassOutcome` row with
   `predictedPassProbability = snapshot.passProbability` (the 0..1 P(pass)), `passed`, `categoryId`,
   `source: "self_report"`.
2. When there is NO latest snapshot OR `sufficientData` is false, it inserts NO row and does not throw (returns a
   graceful result, e.g. `{ ok: true, captured: false }`) — every persisted `PassOutcome` therefore carries a REAL
   prediction↔outcome pair.
3. A new analytics event name `"pass_outcome_captured"` is added to `ANALYTICS_EVENTS` (`lib/constants.ts`) FIRST,
   and `recordExamOutcome` fires it fire-and-forget (`void recordEvent(...)`, OUTSIDE any transaction) ONLY when a
   row was actually inserted.
4. Integration test `lib/server/pass-outcome.integration.test.ts` (driving `recordExamOutcome` directly against the
   seeded DB, partial-mocking `@/lib/auth` `getCurrentUser`) asserts:
   - with a seeded sufficient-data `ReadinessSnapshot` (`inputsJson` `{ sufficientData: true, seenCount: READINESS_MIN_SEEN }`,
     `passProbability: 0.73`), `recordExamOutcome(true)` creates exactly one `PassOutcome` for the session user with
     `predictedPassProbability === 0.73`, `passed === true`, `source === "self_report"`;
   - the fire-and-forget `pass_outcome_captured` event lands (`vi.waitFor` poll — house rule);
   - unauthenticated (`getCurrentUser` → null) → the action rejects/throws (via `requireUser`'s redirect), inserting
     NO row;
   - a second user B's rows are never written (self-only): the function exposes no target-user parameter
     (`recordExamOutcome.length <= 2` and the 2nd arg is `categoryId`, not a user id) and B has zero `PassOutcome` rows.
   - FK-safe teardown: delete `analyticsEvent` + `passOutcome` + `readinessSnapshot` for the fixture users BEFORE the
     fixture `cleanup()` (users→questions order); `$disconnect` at the end.
5. `npm run -s typecheck` exits 0; `npm run -s db:seed` then `npm run -s test:integration` exits 0 with
   `lib/server/pass-outcome.integration.test.ts` collected (assert via `npx vitest list --config vitest.integration.config.ts`).

## Constraints / decisions
- **Evaluate: yes** — security-sensitive write path (auth + IDOR + no cross-user write). An independent judge
  confirms identity is server-resolved and no client-supplied user id can redirect the write.
- Capture gate = `sufficientData` (the honesty law): we only record a calibration pair when the dial actually held a
  real number for the user; otherwise the "prediction" is a prior, not a forecast. Document this.
- There is ALREADY a distinct `reportExamOutcomeAction` (`lib/server/study-profile.ts`) that writes
  `UserStudyProfile.examOutcome` (PASSED/FAILED enum) + fires `exam_outcome_reported`. `recordExamOutcome` is
  ADDITIVE and SEPARATE (it writes the calibration `PassOutcome` + fires `pass_outcome_captured`). Do NOT merge
  their tables or duplicate the profile write. The two get composed on ONE user action in wave19a-07.
- Keep the DB insert out of any interactive `$transaction` unless needed; keep `void recordEvent(...)` OUTSIDE it
  (house rule). `EXAM_OUTCOMES` is `["PASSED","FAILED"]` → `passed = outcome === "PASSED"` at the wiring layer (07).
- Non-goals: the account-form wiring/UI (07), the admin read view (08), the metrics module (05), isotonic.

## Next
- [x] Add `pass_outcome_captured` to ANALYTICS_EVENTS; write `lib/server/pass-outcome.ts` + its integration test;
      seed + run integration.
- [x] Re-run verify after the transient full-suite FAIL: reseed + full `test:integration` green; verify.sh PASS.
- (wave19a-07 owns wiring `recordExamOutcome` into `reportExamOutcomeAction`.)

## Artifacts
- `lib/server/pass-outcome.ts` — `recordExamOutcome(passed, categoryId?)`: requireUser (self-only, no userId param),
  zod-validated, reads `getLatestReadiness`, honesty-law gate (`sufficientData===true`), inserts `PassOutcome`
  (`predictedPassProbability = snapshot.passProbability`, `source:"self_report"`), fires `pass_outcome_captured`
  fire-and-forget ONLY on insert.
- `lib/server/pass-outcome.integration.test.ts` — 4 tests (capture pair + event, honesty-law no-row, unauth reject,
  self-only no-target-param / B untouched).
- `lib/constants.ts` — `pass_outcome_captured` added to ANALYTICS_EVENTS.
- `lib/validation.ts` — `recordExamOutcomeSchema` (zod v4, `{ error }`).

## Log
- 2026-07-07 laptop: planned.
- 2026-07-12 ClPcs-Mac-mini: implemented capture unit. Added `pass_outcome_captured` to ANALYTICS_EVENTS +
  `recordExamOutcomeSchema` to validation; wrote `lib/server/pass-outcome.ts` (self-only requireUser, honesty-law
  gate, PassOutcome insert, fire-and-forget event) and its integration test (mirrors exam-outcome.integration.test.ts
  style, mocks `@/lib/auth` getCurrentUser). typecheck 0; db:seed 0; single suite 4/4; full test:integration 60 files
  258 passed / 2 skipped. Status → done.
- 2026-07-12 ClPcs-Mac-mini: re-verify tick. Prior verify FAIL had an EMPTY error excerpt; single suite green (4/4)
  + typecheck 0 ruled out a code fault → transient full-suite DB-accumulation flake. Reseeded + re-ran full
  verify.sh: all gates green, `PASS: wave19a-06 recordExamOutcome capture unit verified`. Status → done.


## Verify
**Last verify:** PASS (2026-07-12T13:45:15Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T13:46:52Z)
