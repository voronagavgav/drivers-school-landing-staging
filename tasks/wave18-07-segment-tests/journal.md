# Task: wave18-07-segment-tests

**Status:** done
**Driver:** auto
**Updated:** 2026-07-06T10:30Z
**Last compute:** mac-mini

## Goal
Spec wave18 T7 (CONFIRMED #9, add-test). The T5 self-segment onboarding has ZERO tests:
`lib/segment.ts` validators (`isSegmentTiming` / `isSegmentConfidence`) and `app/actions/segment.ts`
(three anon-reachable actions mutating `selectedCategoryId` + firing analytics) are uncovered. Add unit
tests for the validators and integration tests for the actions over the REAL path. PASS = ALL true:

1. UNIT (pure) `lib/segment.test.ts`: `isSegmentTiming` returns true for EACH of
   `"week"|"month"|"later"|"unsure"` and false for an unknown value (`"tomorrow"`) and empty string
   `""`. `isSegmentConfidence` returns true for `"confident"` and `"not_yet"`, false for an unknown
   value and `""`. Runs under `npm test` (no DB).
2. INTEGRATION `lib/server/segment-actions.integration.test.ts`, driving the REAL server actions
   (`segmentSelectCategoryAction` / `segmentAnswerTimingAction` / `segmentAnswerConfidenceAction` from
   `@/app/actions/segment`) — mock next/headers with an in-memory jar + mock `getCurrentUser`, mirroring
   `lib/server/anon-play.integration.test.ts`. Cases:
   a. FLAG-ON reach + persist: `VALUE_FIRST_FUNNEL=true`, `getCurrentUser`→null → driving
      `segmentSelectCategoryAction` with a valid `categoryId` mints an anon user AND persists
      `selectedCategoryId` on that user (assert the anon row's `selectedCategoryId === categoryId`); the
      action redirects to `/segment?step=timing` (digest contains that path).
   b. FLAG-OFF inertness: `VALUE_FIRST_FUNNEL` unset, `getCurrentUser`→null → the SAME
      `segmentSelectCategoryAction` redirects to `/login` (requireUser fallback) and mints NO anon row
      (`prisma.user.count()` unchanged; jar has no ds_anon_play).
   c. INVALID VALUE DROPPED: with a resolved user, driving `segmentAnswerTimingAction` with an INVALID
      `timing` (`"tomorrow"`) fires NO `onboarding_jtbd_answered` analytics row for the exam_timing
      question (assert `analyticsEvent.count({ where: { userId, eventName: "onboarding_jtbd_answered",
      … } })` for that question stays 0), and a VALID `timing` (`"week"`) DOES fire it (count 1, polled
      with `vi.waitFor` since it is `void recordEvent`). Likewise an invalid `confidence` in
      `segmentAnswerConfidenceAction` is dropped from the JTBD analytics.
   d. FINAL TAP OPENS A REAL SESSION: driving `segmentAnswerConfidenceAction` (with the anon user's
      `selectedCategoryId` set to a fixture category that HAS published questions) starts a real
      `MIXED_PRACTICE` session and redirects to `/test/<id>` — assert a `TestSession(mode:
      "MIXED_PRACTICE")` for that user exists (count +1) and the redirect target contains `/test/`.
3. Analytics teardown: delete the fixture users' `analyticsEvent` rows BEFORE deleting the users
   (`AnalyticsEvent.userId` SetNull), then anon users (cascade sessions/answers), then the
   `createOfficialQuestion` fixture. No orphaned analytics rows leak into other suites.
4. `npx tsc --noEmit` · `npm test` (incl. the new unit test) · `npm run test:integration` (incl. the new
   integration test) all exit 0.

## Constraints / decisions
- Production path: drive the exported server actions directly (the entry the `<form action=…>` submits
  to) — NOT `startSession`/`recordEvent` internals. `requirePlayableUser()` inside each action resolves
  identity from the mocked jar/`getCurrentUser`, exactly like the anon-play suite.
- Test-only task: do NOT change `lib/segment.ts` or `app/actions/segment.ts`. If a genuine bug surfaces
  while testing, STOP and note it in the Log (a separate fix task) — do not silently patch source under
  a "test" task.
- `selectCategorySchema` (`@/lib/validation`) requires the categoryId to match an ACTIVE category — use
  the `createOfficialQuestion` fixture's `categoryId` (its category is active) so persist succeeds; an
  invalid categoryId path (redirect to `/segment`) is optional extra coverage, not required.
- Use a per-run stamp/token on fixture emails/ids to avoid replay collisions with leftover rows from a
  prior crashed run (CLAUDE.md replay-guard learning).

## Next
- [x] Write `lib/server/segment-actions.integration.test.ts` — drive the REAL server actions over an
      in-memory jar + mocked `getCurrentUser`. All cases (a–d) written and passing.
- Goal fully met. Nothing left; wave18-08 runs the full-wave verify.

## Artifacts
- `lib/segment.test.ts` — 10 passing unit tests over the tap validators (DONE).
- `lib/server/segment-actions.integration.test.ts` — 5 passing integration tests over the REAL
  segment actions (mint+persist / flag-off /login / invalid-value drop / final tap opens session).

## Log
- 2026-07-06 mac-mini: planned from specs/wave18-funnel-fixes.md T7.
- 2026-07-06T10:27Z ClPcs-Mac-mini: wrote `lib/segment.test.ts` (isSegmentTiming/isSegmentConfidence
  boundaries — each catalogue value true, `"tomorrow"`/`""`/`"maybe"` false); `npx vitest run
  lib/segment.test.ts` → 10 passed. Next: the segment-actions integration suite.
- 2026-07-06T10:30Z ClPcs-Mac-mini: wrote `lib/server/segment-actions.integration.test.ts` mirroring
  `anon-play.integration.test.ts` (in-memory jar mock of next/headers + partial-mock getCurrentUser).
  Cases a (flag-on mint+persist selectedCategoryId → /segment?step=timing), b (flag-off → /login, no
  anon row), c (invalid timing/confidence dropped from JTBD, valid timing polled to count 1), d (final
  valid confidence tap fires JTBD + opens MIXED_PRACTICE session → /test/). Filtered JTBD rows by
  `payloadJson: { contains: '"question":"exam_timing"' }` (SQLite substring) to separate the category /
  exam_timing / confidence JTBD sub-events. Reused the case-a anon user (cookie persisted in the jar
  across the flag-on describe) for c/d, keyed teardown analytics-first. `tsc --noEmit` clean; the new
  suite → 5 passed; `npm run test:integration` → 59 files / 254 passed, 2 skipped; unit → 10 passed.
  Status: done.


## Verify
**Last verify:** PASS (2026-07-06T07:32:05Z)

## Evaluation
**Last evaluation:** PASS (2026-07-06T07:33:18Z)
