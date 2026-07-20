# Task: wave5-07-mastery-server-helper

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-22
**Last compute:** cloud-agent

## Goal
Spec B (server wiring). Add a `lib/server/*` helper that builds per-topic mastery rows (band + accuracy
+ coverage) for the current user/category, reusing the pure `topicMastery` (wave5-06). DB orchestration
only — no UI (wave5-08), no pure-logic changes. Depends on wave5-06.

1. NEW file `lib/server/mastery.ts` exports an async `getTopicMastery(userId: string, categoryId?:
   string | null): Promise<TopicMasteryRow[]>` where
   `TopicMasteryRow = { topicId: string; title: string; answered: number; correct: number; total:
   number; accuracy: number; band: MasteryBand; coverage: number }`.
2. It computes, scoped to the category:
   a. per-topic LIVE-question `total` — `prisma.question` count grouped by `topicId` using the SAME
      live filter the pool uses (`isActive:true`, `isPublished:true`, `archivedAt:null`,
      `categories:{some:{id:categoryId}}`, and the `SERVE_DEMO_QUESTIONS` demo gate
      `...(SERVE_DEMO_QUESTIONS ? {} : { isDemo:false })`);
   b. per-topic `answered`/`correct` for the user (from `TestAnswer` joined to `question.topic`, the
      same shape `computeProgress` uses — or by reusing `computeProgress`);
   c. one `TopicMasteryRow` per topic that has `total > 0` (topics the user has not answered appear with
      `answered:0, correct:0`), each produced by `topicMastery({ answered, correct, total })`.
3. The helper imports `topicMastery` / `MasteryBand` from `@/lib/mastery` and does NOT re-implement the
   band/coverage logic. Rows are sorted deterministically (e.g. weak→learning→strong, then by title or
   topic displayOrder) so the view order is stable.
4. `npm run typecheck` exits 0.
5. `npm run test:integration` exits 0 with ZERO failures (no regression).

## Constraints / decisions
- New SERVER file `lib/server/mastery.ts` (may import prisma/`@/lib/db`). Reuse the existing
  category-scoped live `baseWhere` semantics from `lib/server/test-engine.ts` so coverage totals match
  the real pool (incl. the demo gate); do not invent a different filter.
- Reuse `computeProgress`/`topicStats` aggregation where practical instead of duplicating the
  answered/correct grouping — but the row set must include topics with zero answers (so the breakdown is
  complete), which `computeProgress.topicStats` alone does not provide.
- Non-Goal: rendering (wave5-08), changing `computeProgress`'s public shape, the readiness estimate,
  or any schema change.

## Plan
- [x] Create `lib/server/mastery.ts` with the live-total groupBy + per-topic answered/correct merge.
- [x] Map each topic through `topicMastery`; sort deterministically.
- [x] `npm run typecheck` + `npm run test:integration`; run verify.sh.

## Done
- [x] `lib/server/mastery.ts` exports `getTopicMastery(userId, categoryId?)` → `TopicMasteryRow[]`.
- [x] Per-topic live `total` via `prisma.question.groupBy({by:["topicId"]})` with the test-engine
      `baseWhere` live filter (incl. `SERVE_DEMO_QUESTIONS` demo gate); answered/correct reused from
      `computeProgress.topicStats`; each row built by the pure `topicMastery`.
- [x] Rows include zero-answer topics, sorted weak→learning→strong then displayOrder then title.
- [x] typecheck 0, integration 60 pass / 2 skip, verify.sh PASS.

## Next
- [ ] (none — task done; downstream wave5-08 consumes `getTopicMastery`.)

## Artifacts
- lib/server/mastery.ts — new `getTopicMastery` server helper.
- tasks/wave5-07-mastery-server-helper/verify.sh — export + reuse + typecheck/integration gate.

## Log
- 2026-06-22 cloud-agent: scaffolded by planner.
- 2026-06-22T22:25Z ClPcs-Mac-mini: wrote `lib/server/mastery.ts` — `getTopicMastery` does the
  per-topic live-total `groupBy` (test-engine `baseWhere` + demo gate), merges answered/correct from
  `computeProgress.topicStats` (zero-answer topics default 0/0), maps each through pure `topicMastery`,
  sorts weak→learning→strong / displayOrder / title. typecheck 0; integration 60 pass, 2 skip;
  verify.sh PASS. Status→done.

## Verify
**Last verify:** PASS (2026-06-22T19:25:35Z)

## Evaluation
**Last evaluation:** PASS (2026-06-22T19:26:32Z)
