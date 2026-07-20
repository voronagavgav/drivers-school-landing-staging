# Wave 5 — Learning effectiveness

Turn the learning primitives already in the codebase (`spacedMistakeOrder`/`spacingScore` in
`lib/test-engine/selection.ts`, `studyStreak` in `lib/streak.ts`, `detectWeakTopics`, `computeProgress`,
`getRecentReadinessScores`) into **surfaced, actionable** learner features: a daily spaced-review queue,
a per-topic mastery breakdown, and an exam-readiness estimate.

Rules (non-negotiable, from PLAN.md):
- Keep all new core logic PURE (no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`, no
  `Math.random`/`Date.now` inside the new functions — take `now`/rng as params) and UNIT-TESTED. The
  DB orchestration lives in `lib/server/*`; pure helpers live in `lib/*` or `lib/test-engine/*`.
- TESTS ON EVERY VALUABLE CHANGE; the final task runs `npm run build`.
- NO schema change (derive everything from existing `TestSession`/`TestAnswer`/`Question`/`Topic`/
  `ProgressSnapshot`). If one were truly unavoidable, STOP and flag — do not `migrate dev` (non-interactive
  broken; see CLAUDE.md).
- Preserve Ukrainian copy, mobile-first design, the road-sign design system, the pure/`lib/server` split,
  and the demo/legal positioning. NEVER claim official-exam prediction or a pass guarantee.
- Reuse existing constants in `lib/constants.ts` (`WEAK_TOPIC_ACCURACY_THRESHOLD` 0.6,
  `WEAK_TOPIC_MIN_ANSWERS` 4, `DEFAULT_PRACTICE_QUESTION_COUNT`, `DAILY_GOAL_ANSWERS`); add new tunables
  as named constants there (not magic numbers buried in code).

## A. Daily spaced-review queue ("на повторення сьогодні")
- A NEW pure function in `lib/test-engine/selection.ts` — `dueMistakes(mistakes, now, weights?)` (or
  `mistakesDueForReview`) — that, reusing the existing `spacingScore` signal (recency + repeat count +
  correct-streak), returns the subset of a user's mistake bank that is DUE for review at `now`: a mistake
  becomes due once the elapsed time since it was last practiced exceeds a spacing interval that GROWS with
  the correct-streak (a lightweight SM-2-lite interval ladder). Pure + deterministic (takes `now`); no DB.
- Add the interval ladder as a named constant in `lib/constants.ts` (e.g. `REVIEW_INTERVALS_HOURS`).
- UNIT TEST (`lib/test-engine/selection.test.ts` or a new sibling): a never-reviewed mistake is due; a
  just-reviewed one is not; a mistake whose interval has elapsed is due; higher correct-streak ⇒ longer
  wait before due; boundary at exactly the interval is covered.
- Wire a server helper (`lib/server/*`) that counts due mistakes for the current user from existing data,
  and surface a dashboard card "N питань на повторення" linking to `MISTAKE_PRACTICE`. The card hides (or
  shows an encouraging empty state) when the count is 0. No behaviour change to other test modes.
- INTEGRATION TEST: seed/throwaway a user with mistakes at known last-practiced times → the due-count
  helper returns the expected number (and excludes not-yet-due ones). Follow the established
  self-provisioning `isDemo:false` fixture pattern (seed cat-B is withheld while `SERVE_DEMO_QUESTIONS`
  is off — see CLAUDE.md).
- typecheck + `npm test` + `npm run test:integration` pass.

## B. Per-topic mastery breakdown (learner-facing)
- A NEW pure helper (e.g. `lib/mastery.ts` — `topicMastery(stats)`) that maps per-topic
  answered/correct counts into a mastery band — `weak | learning | strong` — reusing
  `WEAK_TOPIC_ACCURACY_THRESHOLD`/`WEAK_TOPIC_MIN_ANSWERS` (too-few-answers ⇒ `learning`, not `strong`),
  plus a coverage ratio (answered ÷ topic total). Pure; UNIT-TESTED for each band + the low-sample edge.
- A learner-facing view (extend the dashboard or a new `/progress` route under `app/(app)`) lists topics
  with accuracy %, a NON-COLOUR mastery marker (icon/word, not colour-only — a11y), coverage, and a
  "практикувати" link to `TOPIC_PRACTICE` scoped to that topic. Mobile-first, Ukrainian, keyboard-operable.
- typecheck + `npm test` pass (+ integration if the aggregation reads the DB).

## C. Exam-readiness estimate
- A NEW pure function (e.g. `lib/readiness.ts` — `examReadiness({ recentExamScores, topicBands })`) →
  `{ score: 0..100, band: "не готовий" | "майже" | "готовий" }` from a DOCUMENTED heuristic (recent
  exam-sim accuracy + share of non-weak topics). Pure; UNIT-TESTED incl. the empty-history case (returns a
  low/zero estimate, never throws).
- Surface the estimate on the dashboard with an EXPLICIT Ukrainian disclaimer that it is an estimate based
  on your practice, NOT a prediction of or guarantee for the official exam (legal positioning). The word
  "гарантія" must appear only in a NEGATING context.
- typecheck + `npm test` pass.

## D. Wave-5 acceptance gate (verify-only, final task)
- No new feature code. Run the full gate and PASS only if every criterion holds; on any failure, record it
  and reopen the failing upstream task (do not fix here):
  1. `npm run typecheck` exits 0.
  2. `npm test` exits 0, ZERO failures, and includes the new A/B/C unit test files.
  3. `npm run db:seed` exits 0 (≥24 demo questions), then `npm run test:integration` exits 0 with ZERO
     failures and includes the new Wave-5 integration test(s).
  4. `npm run build` exits 0.
  5. Static A–C presence: the new pure functions are exported and PURE (no DB/server-only/clock/global-rng
     in their bodies — scope determinism greps to the new functions, excluding `rng` defaults, per the
     wave3-feat-02 / wave3-feat-12 CLAUDE.md learning); the dashboard/progress view imports and renders
     them; the readiness disclaimer text is present and "гарантія" appears only negated.
  6. `prisma/schema.prisma` is NOT modified by this wave.

## Out of scope
- No schema change, no payments/subscriptions, no third-party auth, no redesign.
- No official-content import / image work / the `.content-import` pipeline (separate effort).
- No new test MODE (reuse the existing five); no change to other modes' selection behaviour.
