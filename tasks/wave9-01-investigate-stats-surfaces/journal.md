# Task: wave9-01-investigate-stats-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
INVESTIGATION ONLY — write NO feature code (no `lib/`, `app/`, `prisma/` edits). Produce a findings note
at `tasks/wave9-01-investigate-stats-surfaces/findings.md` that answers, with concrete file:line
references, every question the downstream wave-9 tasks need. PASS = ALL true:

1. `tasks/wave9-01-investigate-stats-surfaces/findings.md` exists and is non-empty.
2. It documents the REUSE point: the exact signature + return shape of `summarizeQuestionPerformance`
   in `lib/question-stats.ts`, and how `lib/server/admin.ts::getQuestionPerformance` already calls it
   (so tasks 02/04 compose, not duplicate).
3. It documents the AGGREGATION join: how to read `TestAnswer` (`questionId`, `selectedOptionId`,
   `isCorrect`, `timeSpentSeconds`) and join `QuestionOption` (for `optionKey`, `isCorrect`) and
   `Question` (for `questionKey`, `text`, `topicId`) — citing the relevant `prisma/schema.prisma`
   lines and confirming `TestAnswer` already has `@@index([questionId])` (so NO schema change).
4. It documents the UI host: that `app/admin/layout.tsx` already enforces `requireContentManager()` for
   every admin route, the `NAV_LINKS` array to extend, and the `app/admin/analytics/page.tsx` structure
   (KPI `Stat`/`Card`/`SectionTitle` from `@/components/ui`, `LegalDisclaimer`) to mirror.
5. It documents the TEST conventions: the unit-test split (`npm test` vs `npm run test:integration`),
   the `npx vitest list` capture-to-var idiom for proving file inclusion, and that
   `lib/server/__testutils__/official-question.ts::createOfficialQuestion` is the integration fixture
   to reuse (and that a `__testutils__/*.ts` file is NOT collected by the integration glob).
6. It states explicitly that NO schema change is required (compute-on-read) and lists the proposed
   exported names so tasks 02/03/04 stay consistent:
   `summarizeQuestion` (lib/content-stats.ts), `flagQuestion` (lib/content-flags.ts),
   `getContentHealth` (lib/server/content-stats.ts).

## Constraints / decisions
- READ-ONLY investigation. Do not create `lib/content-stats.ts`/`lib/content-flags.ts`/the page here —
  those are tasks 02–06. The only files this task writes are `findings.md` and this journal.
- The findings are advisory scaffolding for the driver; downstream tasks own their own boolean gates.
- Keep it reference-dense (file:line), not a re-spec. Goal is to de-risk, not to design.

## Plan
- [x] Read `lib/question-stats.ts`, `lib/server/admin.ts` (getQuestionPerformance), `prisma/schema.prisma`
      (TestAnswer/QuestionOption/Question/Topic), `app/admin/layout.tsx`, `app/admin/analytics/page.tsx`,
      `lib/server/__testutils__/official-question.ts`, `components/ui.tsx`.
- [x] Write `findings.md` covering items 1–6 with file:line citations.

## Done
- [x] Read all six surfaces + the wave9 spec + downstream journals (02–07) for proposed-name grounding.
- [x] Wrote `findings.md` (items 1–6, file:line-dense). `verify.sh` → PASS.

## Next
- [ ] (none — investigation complete; downstream tasks 02–08 own their own gates.)

## Artifacts
- `tasks/wave9-01-investigate-stats-surfaces/findings.md` — the investigation output.
- `tasks/wave9-01-investigate-stats-surfaces/verify.sh` — checks findings.md covers items 1–6.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T00:00Z ClPcs-Mac-mini: read the reuse/join/UI/test surfaces (`lib/question-stats.ts:6-49`,
  `lib/server/admin.ts:300-328` + `:517-538`/`:708-739`, `prisma/schema.prisma:65-210`,
  `app/admin/layout.tsx:8-23`, `app/admin/analytics/page.tsx`, `lib/server/__testutils__/official-question.ts`,
  `components/ui.tsx`) + spec `specs/wave9-content-stats.md` + downstream journals 02–07; wrote `findings.md`
  covering items 1–6 with file:line citations. Caught & fixed one wrong claim (task 02's purity gate does NOT
  forbid the `summarizeQuestionPerformance` token — reuse is explicitly expected). `verify.sh` → PASS.
  Status → done.

## Verify
**Last verify:** PASS (2026-06-23T20:52:43Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T20:53:50Z)
