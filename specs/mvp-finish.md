# Feature batch: finish the MVP gaps

Two independent, in-scope completions. Keep new core logic PURE and unit-tested (match the existing
`lib/` convention) so the `typecheck && test` verify gate is meaningful.

## A. Admin: per-question performance statistics (the remaining MVP scope item)
Admins/content managers need to see how each question performs, to find weak or confusing questions.
The data exists in `TestAnswer` (one row per answered question, with `isCorrect`).

Acceptance criteria (boolean):
- A pure function `summarizeQuestionPerformance(rows)` is exported from a NEW file `lib/question-stats.ts`,
  where `rows: { questionId: string; isCorrect: boolean }[]`. It returns one entry per questionId with
  `{ questionId, timesAnswered, correct, accuracy }` (accuracy in 0..1; a question with 0 answers → accuracy 0,
  no divide-by-zero). It also returns them sorted HARDEST-FIRST (lowest accuracy first, ties broken by
  most-answered). The function must not mutate its input.
- New unit tests in `lib/question-stats.test.ts` cover: empty input → empty; one question with mixed
  right/wrong → correct timesAnswered + accuracy; several questions sorted hardest-first; a never-answered
  question handled (0 answers, accuracy 0).
- A server helper in `lib/server/admin.ts` aggregates real `TestAnswer` rows (grouped per question, joined
  to the question text/topic) and feeds the pure function.
- The admin questions area surfaces it: `/admin/questions` shows, per question, times-answered and accuracy
  (or a dedicated stats section lists questions hardest-first with those numbers). Demo questions stay
  labelled with the existing DemoBadge.
- `npm run typecheck` passes; `npm test` passes (all existing tests plus the new ones).

## B. Dashboard: surface the readiness trend
Wire the existing pure `readinessTrend()` (already in `lib/progress.ts`, already unit-tested) into the user
dashboard so users see direction of travel, not just a static score.

Acceptance criteria (boolean):
- `app/(app)/dashboard/page.tsx` loads the signed-in user's recent `ProgressSnapshot.readinessScore` values
  (ordered oldest→newest) and calls `readinessTrend()` on them.
- The dashboard renders a short Ukrainian trend label near the readiness meter
  (IMPROVING → «Динаміка: вгору», DECLINING → «Динаміка: вниз», STABLE → «Динаміка: стабільно»).
- No regression: `npm run typecheck` and `npm test` pass.

## Out of scope (do NOT build)
- Question image UPLOAD / file storage — the existing `imageUrl` field already satisfies the MVP.
- Any DB schema change (`prisma/schema.prisma` must not change).
- Any change to the legal/demo-content positioning.
