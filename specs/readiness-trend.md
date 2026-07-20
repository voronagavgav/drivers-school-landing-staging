# Feature: readiness trend indicator

Surface whether the user's readiness is improving over time, derived from their recent
`ProgressSnapshot.readinessScore` history. Keep the core as a PURE function so it is unit-testable
without a database (consistent with lib/progress.ts).

## Acceptance criteria (boolean)
- A pure function `readinessTrend(scores: number[]): "IMPROVING" | "DECLINING" | "STABLE"` is exported from `lib/progress.ts`.
- Scores are ordered oldest→newest. With fewer than 2 scores it returns `"STABLE"`.
- It compares the most recent score against the mean of the earlier scores; if the difference exceeds a small threshold (e.g. 5 points) it returns `"IMPROVING"` or `"DECLINING"`, otherwise `"STABLE"`.
- New unit tests in `lib/progress.test.ts` cover: <2 scores → STABLE; clearly rising series → IMPROVING; clearly falling series → DECLINING; nearly flat series → STABLE.
- `npm run typecheck` passes.
- `npm test` passes (all existing 29 tests plus the new ones).

## Out of scope
- No UI wiring required for this task (dashboard integration can come later).
- No DB schema changes.
