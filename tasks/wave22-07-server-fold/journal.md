# Task: wave22-07-server-fold

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-14
**Last compute:** mac-mini

Server replay + writeback: `lib/server/elo.ts` `recomputeElo(tx?)` loads first-attempt `TestAnswer`
rows, folds them via the pure `lib/elo.ts`, and writes `eloBeta`/`eloAnswerCount` back onto `Question`
in ≤200-id chunks. Full recompute is idempotent/deterministic (no incremental cursor). A determinism
+ external-oracle integration test proves it.

Depends on: wave22-04 (pure fold), wave22-06 (columns).

## Goal
PASS = ALL true:

1. `lib/server/elo.ts` exports `recomputeElo(tx?: Prisma.TransactionClient)` that:
   - Loads FIRST-ATTEMPT `TestAnswer` rows only. First-attempt = the earliest answer per
     `(testSessionId, questionId)` — but since `TestAnswer` has `@@unique([testSessionId, questionId])`,
     each row IS the single (final) answer for that pair; mirror the FSRS first-attempt-per-session
     rule by treating one row per `(session, question)` as one event (document this choice in a comment).
   - Reads each answer's `optionCount` via the question's `options` relation WITHOUT per-row queries
     (batch: one `question.findMany({ select:{ id:true, _count:{ select:{ options:true } } } })` or a
     grouped count, then join in JS).
   - Orders the stream by `answeredAt` ASC, then `id` ASC (stable tiebreak).
   - Folds via `foldEloStream` from `@/lib/elo` (does NOT reimplement the math).
   - Writes back per item: `eloBeta = beta`, `eloAnswerCount = n`, in `updateMany`/`update` batches of
     ≤200 ids (P2029 cap). Routes every DB op through `tx` when provided (default `prisma`).
2. `recomputeElo` accepts an optional `tx` and, when omitted, uses the module `prisma` — same pattern
   as other lib/server recompute fns.
3. Integration test `lib/server/elo.integration.test.ts`:
   - Seeds a KNOWN fixture answer stream via direct `TestSession` + `TestAnswer` creates (house
     pattern; `createOfficialQuestion` for the questions, publish/active), with controlled
     `answeredAt` values and known optionCounts.
   - Runs `recomputeElo()` TWICE → the fixture questions' `eloBeta`/`eloAnswerCount` rows are
     IDENTICAL across both runs (determinism/idempotency).
   - Asserts ONE fixture item's `eloBeta` equals the wave22-01 python golden fold value for the SAME
     stream to 6dp (external truth) — the fixture stream is chosen to match a stream the python oracle
     froze, OR the test folds the fixture via the pure `foldEloStream` and asserts the DB row equals
     that fold (server-vs-pure equivalence) AND the pure fold equals the python golden.
   - Cleans up in FK-safe order (users before questions; `analyticsEvent` if any before user).
4. `lib/server/elo.ts` reuses `foldEloStream` (grep: imports `@/lib/elo`; no local `sigmoid`/Elo math).
5. `npm run -s typecheck` exits 0; `npm test` exits 0.
6. `npm run db:seed` then `npm run test:integration` exits 0 with 0 skipped for the new suite.

## Constraints / decisions
- DETERMINISTIC BATCH FOLD, not per-request writes — full recompute is the only write path this wave.
- NO per-row option-count queries (P2029 + N+1 avoidance) — batch the counts.
- Reference time for the fold comes from row `answeredAt`, never `new Date()` inside the fold.
- The determinism assertion needs a reference time derived from persisted rows, not an internal clock
  (see the retry-determinism learning) — but Elo has no time-decay so equality is exact regardless.
- PRODUCTION-PATH: the integration test drives the REAL `recomputeElo` server entry (the same fn the
  nightly script calls), not the pure helper alone.
- Non-goal: no nightly wiring (task 08), no admin surface (task 09), no consumer reads.

## Next
- [x] Implement lib/server/elo.ts recomputeElo (batch load, fold, ≤200-id writeback) + integration test.
- Goal fully met — see Log. If the driver's full-suite verify surfaces an unrelated flake, reseed
  (`npm run db:seed`) and re-run; the new suite itself passes in isolation.

## Artifacts
- lib/server/elo.ts — `recomputeElo(tx = prisma)`: batched option-count read, `TestAnswer` stream
  ordered `answeredAt` ASC / `id` ASC joined to `testSession.userId`, folded via pure `foldEloStream`,
  `eloBeta`/`eloAnswerCount` written back per item in ≤200-id (`WRITEBACK_CHUNK`) chunks.
- lib/server/elo.integration.test.ts — reproduces the python `stream_b_sorted` (5u×8i, y=(u+i)%2,
  oc=4) as an isolated fixture subgraph; asserts determinism (2 runs identical), server-vs-pure fold
  equivalence (12dp), and q0 β == python golden 0.040006 (6dp).

## Log
- 2026-07-14 · ClPcs-Mac-mini · Implemented `lib/server/elo.ts` and its integration test. Server folds
  the whole first-attempt answer stream through `@/lib/elo` `foldEloStream` (no local Elo math),
  batches per-question option counts once (no N+1), sorts `answeredAt` ASC / `id` ASC, writes β/n back
  in ≤200-id chunks routed through the injected `tx`. Test drives the REAL `recomputeElo` over a fixture
  matching the wave22-01 golden and pins determinism + pure-equivalence + external truth. typecheck 0,
  `npm test` 786 pass, new integration suite passes in isolation (`--config vitest.integration.config.ts`).
  Status → done.

## Verify
**Last verify:** PASS (2026-07-14T11:49:31Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T11:51:50Z)
