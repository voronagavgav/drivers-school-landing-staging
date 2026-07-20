# Task: wave8-05-official-question-test-helper

**Status:** done
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §C — extract ONE shared helper for the throwaway OFFICIAL-question fixtures that ~10 integration suites
hand-roll, and adopt it where the swap is mechanical. PASS = ALL true:
1. A new helper module exists at `lib/server/__testutils__/official-question.ts` and exports a function
   `createOfficialQuestion`.
2. The helper takes the `prisma` client as a PARAMETER (it does NOT `import "@/lib/db"` or `import
   "server-only"`), creates OFFICIAL questions (`isDemo:false`, `sourceType:"OFFICIAL"`, default
   `isActive:true`+`isPublished:true`, connected to the given category, with ≥1 correct option), and exposes
   a FK-safe `cleanup` (deletes in order user→questions→topic→category so referencing session rows cascade
   before their questions).
3. The helper module is NOT collected as a test suite (its filename does not match the integration `*.test.ts`
   glob) — `npx vitest list --config vitest.integration.config.ts` (capture-to-var) does NOT list
   `official-question.ts`.
4. At least FOUR `lib/server/*.integration.test.ts` files `import` the helper from
   `@/lib/server/__testutils__/official-question` (or the relative path) and use it for their fixture setup.
5. `npm run typecheck` exits 0.
6. `npm test` exits 0, ZERO failures.
7. `npm run db:seed` exits 0, then `npm run test:integration` exits 0, ZERO failures (no suite regresses).
8. No `SERVE_DEMO_QUESTIONS`/`demoWhere` token is (re)introduced anywhere: `grep -rnE
   "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/ --exclude-dir=generated` returns NOTHING.

## Constraints / decisions
- The BAR is exactly the spec's: helper EXISTS + used by ≥4 suites + NO suite regresses + full integration
  suite green. Do NOT force a risky rewrite of a suite that doesn't map cleanly — leave such suites
  self-contained. Quality-over-coverage: 4 clean adoptions beat 10 fragile ones.
- Adoption candidates (pick ≥4 that map mechanically): engine, finish-idempotency, access-control,
  exam-short-pool, mixed-weak-topics, saved-excludes-unpublished, progress-volume, due-mistakes,
  exam-blueprint, analytics-dashboard. Suites with bespoke needs (e.g. exam-blueprint's §37/§31 anchor
  topics + ~20 cross-block questions; saved-excludes' published/unpublished MIX) may need helper options or
  may be left self-contained — driver's judgement.
- Keep the helper FLEXIBLE: accept overrides for count/`isPublished`/`isActive`/option shape/topic so an
  adopting suite keeps its exact pre-refactor fixture semantics. Behaviour-preserving refactor ONLY — a
  suite's assertions must NOT change; if adopting the helper would force an assertion change, leave that
  suite alone.
- DEPENDS ON task 04 (tree already token-free). This task must not re-introduce the tokens (criterion 8).
- FK-safe cleanup mirrors CLAUDE.md: `TestSessionQuestion`/`TestAnswer`→`Question` are NOT cascades, so
  delete the throwaway USER first (cascades its session rows), THEN questions, THEN topic, THEN category.
- Non-Goal: changing what any suite asserts; touching production code; the §D final gate (task 06).

## Plan
- [x] Write `lib/server/__testutils__/official-question.ts`: `createOfficialQuestion(prisma, opts)` +
      cleanup; model the API on the engine/finish-idempotency fixture shapes (category+topic+N questions+user).
- [x] Adopt in engine + finish-idempotency + exam-short-pool + due-mistakes (≥4 total); run each. (access-control
      left self-contained — two users sharing seeded cat B + bespoke `makeQuestion` flag matrix doesn't map cleanly.)
- [x] `npm run typecheck`; `npm test`.
- [x] `npm run db:seed`; `npm run test:integration` → green; confirm no token reintroduced.

## Done
- [x] Drafted `createOfficialQuestion` helper (prisma as PARAM; OFFICIAL/isDemo:false/published/active
      questions + throwaway category/topic/user; FK-safe `cleanup` user→questions→topic→category, deletes
      only what it created). Adopted in the engine suite. typecheck green; `vitest list` (integration
      config) does NOT list `official-question.ts`; engine suite 2/2 green.
- [x] Adopted the helper in 3 more clean suites — finish-idempotency, exam-short-pool, due-mistakes (4 total
      with engine). Mechanical fixture swaps only; no assertion changed. due-mistakes' local function named
      `createOfficialQuestion` collided with the import → removed it and used `fixture.questionIds` as the
      five UserMistake FK targets (questions are only FK targets there; texts aren't asserted). access-control
      left self-contained (bespoke). typecheck 0; `npm test` 283/283; `npm run db:seed` (1691 official) then
      full `npm run test:integration` = 18 files / 63 tests, ZERO failures; helper still not collected; no
      `SERVE_DEMO_QUESTIONS`/`demoWhere` token.

## Next
- [x] Fixed verify false-fail: criterion-2 purity grep (`@/lib/db`) was matching the helper's DOC COMMENT,
      not an import — rephrased the comment in prose. Goal met; awaiting driver verify re-run.

## Artifacts
- `lib/server/__testutils__/official-question.ts` — shared OFFICIAL-question fixture helper + FK-safe cleanup.
- `lib/server/engine.integration.test.ts` — adopts the helper (count:8).
- `lib/server/finish-idempotency.integration.test.ts` — adopts the helper (count:8).
- `lib/server/exam-short-pool.integration.test.ts` — adopts the helper (count:5).
- `lib/server/due-mistakes.integration.test.ts` — adopts the helper (count:5; ids as UserMistake FK targets).

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T19:46Z ClPcs-Mac-mini: wrote `lib/server/__testutils__/official-question.ts`
  (`createOfficialQuestion(prisma, opts)` returning `{userId, categoryId, topicId, questionIds,
  questionId, cleanup}`; `import type { PrismaClient }` only — no `@/lib/db`/`server-only`; flexible
  count/category/topic/publish/active/archived/option overrides; FK-safe cleanup deletes only
  fixture-created rows in user→questions→topic→category order). Adopted in
  `engine.integration.test.ts` (replaced its bespoke beforeAll/afterAll with the helper + fixture
  cleanup). Verified: `npm run typecheck` exit 0; integration `vitest list` does NOT list the helper
  (criterion 3); `vitest run engine.integration.test.ts` = 2/2 pass.
- 2026-06-23T19:52Z ClPcs-Mac-mini: adopted the helper in 3 more clean suites —
  `finish-idempotency.integration.test.ts` (count:8), `exam-short-pool.integration.test.ts` (count:5),
  `due-mistakes.integration.test.ts` (count:5, `fixture.questionIds` as the five UserMistake FK targets;
  removed its colliding local `createOfficialQuestion`). Now 4 suites adopt it (with engine). Left
  access-control self-contained (two users on seeded cat B + bespoke `makeQuestion` flag matrix — doesn't
  map cleanly; per the quality-over-coverage constraint). Behaviour-preserving: no assertion changed.
  Verified ALL 8 criteria: typecheck exit 0; `npm test` 283/283; helper not collected by integration glob;
  no `SERVE_DEMO_QUESTIONS`/`demoWhere`; `npm run db:seed` (1691 official) then full `npm run test:integration`
  = 18 files / 63 tests, ZERO failures. Status → done.
- 2026-06-23T20:18Z ClPcs-Mac-mini: verify FAILED on criterion-2 (`FAIL: helper must take prisma as a
  param…`) — a FALSE-fail: the gate `grep -qE '"server-only"|@/lib/db'` matched the literal `@/lib/db`
  in the helper's line-6 DOC COMMENT ("…never imports `@/lib/db` or `server-only`…"), not an import
  (the only import is `import type { PrismaClient } from "@/lib/generated/prisma/client"`). This is the
  documented "purity grep matches comments too" trap (CLAUDE.md Learnings). Rephrased the comment in
  prose ("the app's server-side db singleton / the server-runtime guard") — no behaviour change, no
  import change. Confirmed: `grep -qnE '"server-only"|@/lib/db' helper` now matches NOTHING; criterion-4
  still 4 suites. typecheck/tests unaffected (comment-only edit). Status → done.



## Verify
**Last verify:** PASS (2026-06-23T16:55:49Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T16:57:22Z)
