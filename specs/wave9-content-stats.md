# Wave 9 — Deeper content statistics + quality flags + admin view

Turn the answer data we already record (`TestAnswer`: `questionId`, `selectedOptionId`, `isCorrect`,
`answeredAt`, `timeSpentSeconds`) into durable per-question / per-option / per-topic statistics and
**content-quality flags**, surfaced in an admin **content-health** view. Stable Wave-7 keys
(`questionKey`/`optionKey`) make these stats survive content reloads. COMPUTE-ON-READ — no schema change,
no new table (admin-only aggregation; `TestAnswer` already has `@@index([questionId])`).

Build ON the existing `lib/question-stats.ts` (`summarizeQuestionPerformance` → per-question accuracy,
hardest-first) — reuse it, do not duplicate accuracy logic.

RULES (CLAUDE.md):
- New core logic PURE + UNIT-TESTED (no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated`, no
  `Math.random`/`Date.now` in pure fns). DB aggregation in `lib/server/*`; the page is server-rendered.
- NO schema change. Admin surfaces gated by `requireContentManager()`. Preserve Ukrainian copy + mobile-first
  + legal positioning. Tests on every change; final task runs `npm run build`. Prove test-file inclusion
  with `npx vitest list` (capture-to-var before `grep -q`).

## A. Pure per-question rich stats
- `lib/content-stats.ts` (PURE): `summarizeQuestion(rows)` for ONE question's answer rows
  (`{ optionKey, isCorrect, timeSpentSeconds }[]`) → `{ timesAnswered, correct, accuracy, avgTimeSeconds,
  options: [{ optionKey, picks, isCorrect, pickRate }] }`. Reuse/compose `summarizeQuestionPerformance`
  for accuracy where natural. Deterministic; UNIT-TESTED (counts, accuracy, avg time incl. 0-sample → 0,
  option pick-rates sum to 1 when there are picks).
- typecheck + `npm test` pass.

## B. Pure content-quality flags
- `lib/content-flags.ts` (PURE): `flagQuestion(stat, { minSample })` → an array of flags from this set:
  - `WRONG_KEY_SUSPECTED` — some `isCorrect:false` option has MORE picks than the `isCorrect:true` option
    (a distractor out-draws the keyed answer), with `timesAnswered >= minSample`. The high-value flag:
    it catches a likely wrong answer key (the answer-key-error class).
  - `LOW_DISCRIMINATION` — `accuracy` within a band around `1/optionCount` (≈ random), `timesAnswered >= minSample`.
  - `INSUFFICIENT_DATA` — `timesAnswered < minSample` (emit this INSTEAD of the others; never flag on thin data).
  - Each flag carries a short Ukrainian human label + the evidence (counts) for the admin row.
- UNIT-TESTED: a constructed distractor-beats-correct case → `WRONG_KEY_SUSPECTED`; a near-random case →
  `LOW_DISCRIMINATION`; a thin-sample case → only `INSUFFICIENT_DATA`; a healthy question → no flags.
- typecheck + `npm test` pass.

## C. Server aggregation
- `lib/server/content-stats.ts`: efficiently aggregate `TestAnswer` (join `QuestionOption` for
  `optionKey`+`isCorrect`, `Question` for `questionKey`/`text`/`topicId`), group per question, run the pure
  helpers, attach flags; also produce TOPIC ROLLUPS (per-topic answered count + mean accuracy). Returns a
  list ordered FLAGGED-first then hardest-first, plus the topic rollup. `requireContentManager()` is enforced
  by the calling page (the helper is pure-ish DB read).
- typecheck passes; covered by the integration test in E.

## D. Admin content-health view
- New route `app/admin/content-health/page.tsx` (mirror `app/admin/analytics/page.tsx`): `requireContentManager()`,
  Ukrainian, mobile-first. Shows: KPI strip (total answered, % questions with a flag, mean accuracy); a
  per-question table (questionKey, short text, accuracy, n, avg time, per-option pick distribution as bars,
  flag badges) FLAGGED-first; a per-topic rollup. Add a nav link in `app/admin/layout.tsx`
  (`{ href: "/admin/content-health", label: "Якість контенту" }`) after «Аналітика». No raw answer/PII shown.
- typecheck + `npm run build` pass.

## E. Integration test
- `lib/server/content-stats.integration.test.ts`: self-provision (reuse `__testutils__/official-question.ts`)
  a throwaway official question with options, and via a throwaway session + `TestAnswer` rows create a KNOWN
  distribution where a distractor out-picks the correct option; assert the server aggregation reports the
  expected accuracy / option picks / avg time AND that the question carries `WRONG_KEY_SUSPECTED`. Add a
  healthy question and assert it has no flags. FK-safe `afterAll` cleanup (user→answers→session→question…).
- `npm run test:integration` includes + passes this file (prove with `npx vitest list`).

## F. Wave-9 acceptance gate (verify-only, final)
- No new feature code. PASS only if all hold; on failure record + reopen the failing task:
  1. `npm run typecheck` 0.
  2. `npm test` 0, ZERO failures, includes the new content-stats + content-flags unit tests.
  3. `npm run db:seed` 0, then `npm run test:integration` 0, ZERO failures, includes
     `content-stats.integration.test.ts`.
  4. `npm run build` 0.
  5. Static: `summarizeQuestion`/`flagQuestion` exported + PURE; `app/admin/content-health/page.tsx` exists
     and calls `requireContentManager`; the nav link is present; NO schema change (`prisma/schema.prisma`
     not modified).

## Out of scope
- New recorded signals (skip / answer-change / flag-for-review) — a later wave if wanted.
- A denormalized `QuestionStat` table — only if compute-on-read becomes a perf problem at volume.
- Learner-facing surfacing of these stats; changes to the user-behavior analytics dashboard.
