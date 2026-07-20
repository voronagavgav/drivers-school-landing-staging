# Task: wave5-05-due-mistakes-integration-test

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-22
**Last compute:** cloud-agent

## Goal
Spec A (integration test). Prove `countDueMistakes` (wave5-03) returns the right number against real DB
rows with known last-practiced times. Self-provisioning fixtures (CLAUDE.md pattern). Depends on
wave5-03. No production-code changes here.

1. NEW file `lib/server/due-mistakes.integration.test.ts` exists and imports `countDueMistakes` from
   `@/lib/server/mistakes`.
2. In `beforeAll` it self-provisions throwaway fixtures (does NOT rely on the seed): a `Category`
   (unique `code`), a `Topic`, ≥2 `OFFICIAL` (`isDemo:false`, `sourceType:"OFFICIAL"`,
   `isPublished:true`, `isActive:true`) `Question`s with options, a `User`, and several `UserMistake`
   rows (`status:"ACTIVE"`) with CONTROLLED `lastMistakeAt` (`new Date(fixedNow - Δ)`) and
   `correctRepeatCount` values chosen to span: due, not-yet-due, and (one) `status:"RESOLVED"`.
3. The test calls `countDueMistakes(userId, FIXED_NOW)` with a FIXED `now` literal (NOT `Date.now()`),
   and asserts the returned count equals an explicit expected LITERAL that:
   a. INCLUDES mistakes whose elapsed `>=` their streak's `REVIEW_INTERVALS_HOURS` interval,
   b. EXCLUDES a not-yet-due mistake (elapsed `<` its interval, higher `correctRepeatCount`),
   c. EXCLUDES the `RESOLVED` mistake.
4. `afterAll` cleans up FK-safe: delete the `User` (cascades its `UserMistake`/session rows), then
   `Question`s, then `Topic`, then `Category`, then `$disconnect()` — wrapped in `.catch()` so a
   partial failure still tears down.
5. `npm run typecheck` exits 0.
6. `npm run test:integration` exits 0, ZERO failures, and `npx vitest list --config
   vitest.integration.config.ts` includes `due-mistakes.integration.test.ts`.

## Constraints / decisions
- Test-only: no changes to `lib/`, `app/`, or `prisma/`. If `countDueMistakes` is missing/wrong, STOP
  and reopen wave5-03 — do not "fix" it from this task.
- Use the `@/lib/db` prisma client and the `@/`-alias imports the other `*.integration.test.ts` files
  use (the integration config stubs `server-only`).
- `countDueMistakes` reads `UserMistake` directly (not the question pool), so the `SERVE_DEMO_QUESTIONS`
  demo gate does NOT affect this test — but still create OFFICIAL questions for FK integrity and to
  match the established fixture pattern. The Question only needs to exist for the `UserMistake.questionId`
  FK; `isPublished` is irrelevant to the count.
- Use `@@unique([userId, questionId])`-safe data: one `UserMistake` per (user, question), so create
  enough distinct questions for the rows you need.
- Non-Goal: testing the pure `dueMistakes` (that's wave5-02's unit suite) or the dashboard card.

## Plan
- [x] Scaffold the suite: imports, `FIXED_NOW`, `beforeAll` fixtures, `afterAll` cleanup.
- [x] Add UserMistake rows spanning due / not-yet-due / resolved with controlled `lastMistakeAt`.
- [x] Assert `countDueMistakes(userId, FIXED_NOW)` equals the expected literal.
- [x] Run verify.sh (typecheck + full integration suite + vitest list — all green locally).

## Done
- [x] Scaffolded `lib/server/due-mistakes.integration.test.ts`: self-provisioning Category/Topic/User
  + 5 OFFICIAL questions, UserMistake rows spanning due-immediate (streak 0), due-past (48h≥24h),
  due-boundary (72h==72h inclusive), not-yet-due (100h<168h), and RESOLVED; asserts
  `countDueMistakes(userId, FIXED_NOW) === 3` plus a stable-read check. FK-safe `afterAll`.
- [x] `npm run typecheck` exits 0; full `npm run test:integration` = 18 files / 60 passed / 2 skipped,
  zero failures; file is LISTED under the integration config.

## Next
- [ ] (none — Goal met; awaiting driver verify.sh re-run)

## Artifacts
- lib/server/due-mistakes.integration.test.ts — new integration suite for `countDueMistakes`.
- tasks/wave5-05-due-mistakes-integration-test/verify.sh — presence + integration-run gate.

## Log
- 2026-06-22 cloud-agent: scaffolded by planner.
- 2026-06-22T22:16Z ClPcs-Mac-mini: wrote `lib/server/due-mistakes.integration.test.ts` (mirrors
  `progress-volume.integration.test.ts` style). FIXED_NOW = `Date.UTC(2026,0,1,12,0,0)`; 5 UserMistake
  rows span due/not-yet-due/RESOLVED via controlled `lastMistakeAt` against the
  `REVIEW_INTERVALS_HOURS=[0,24,72,168,336,720]` ladder; expected DUE count = 3. typecheck 0,
  integration suite green (60 passed/2 skipped), file listed under integration config. Set Status: done.

## Verify
**Last verify:** PASS (2026-06-22T19:16:56Z)

## Evaluation
**Last evaluation:** PASS (2026-06-22T19:17:55Z)
