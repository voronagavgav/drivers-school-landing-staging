# Wave 3 — Learning features

Add high-value learning features. Keep new core logic PURE + unit-tested; final task runs `npm run build`.
Preserve Ukrainian copy, design system, and demo/legal positioning. Prefer NO schema change; if one is
truly needed, apply it via `prisma migrate deploy` (migrate dev is non-interactive-broken — see CLAUDE.md).

## A. Mistake spacing (SM-2-lite)
- A pure, configurable function refines mistake-practice ordering using a lightweight spaced-repetition
  signal (recency + repeat count + correct-streak), exported from the engine and unit-tested (ordering
  cases). Wire it into `MISTAKE_PRACTICE` selection without changing behaviour of other modes.
- typecheck + tests pass.

## B. Streak / daily goal
- A pure `studyStreak(activityDates: Date[]|number[]): { current: number; longest: number }` (consecutive
  active days, timezone-documented) + unit tests.
- The dashboard shows the current streak and a simple daily-goal indicator (e.g. answered today vs a
  configurable goal constant). No schema change (derive from existing sessions/answers).
- typecheck + tests pass.

## C. Readiness trend sparkline
- The dashboard shows a small inline sparkline of recent `ProgressSnapshot.readinessScore` (reuse
  `getRecentReadinessScores`). A pure helper builds the sparkline points/SVG path + unit test.
- typecheck + tests pass.

## D. Account: change password
- A server action lets a logged-in user change their password: verify current password, validate new one
  (reuse Wave 1 validation), re-hash, update. Friendly Ukrainian errors; never reveals other accounts.
  A small account/settings screen hosts it. Server-side only (no client trust).
- Covered by an integration test (wrong current → rejected; correct → hash changes, can log in with new).
- typecheck + test + test:integration pass.

## E. Content depth
- Expand the demo seed with more topics/questions (still clearly `isDemo`, labelled) so practice/exam pools
  are richer; keep one-correct-option invariant. Re-seeding stays idempotent.
- typecheck + tests pass; build passes.

## Out of scope
- No payment/subscription, no third-party auth, no official content, no redesign. Avoid schema changes.
