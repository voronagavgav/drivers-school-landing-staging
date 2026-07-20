# Task: wave11-08-mastery-readiness-recompute

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop
**Evaluate:** yes

## Goal
Server-authoritative recompute: `lib/server/mastery-readiness.ts` computes TopicMastery +
ReadinessSnapshot from FSRS state, wired into `finishSession`. Fed by the ALREADY-oracle'd pure models
(`retrievability`, `computeReadiness`, `topicMastery`, exam-blueprint). Depends wave11-02, wave11-03.
DONE when (verify.sh exits 0):

1. `recomputeTopicMastery(userId, topicIds, tx = prisma)` (exported): for each touched topic upserts
   the `TopicMastery` row (`@@unique([userId, topicId])`) with:
   - `meanR` = mean `retrievability(state, now)` over that topic's `ReviewState` rows (0 when none);
   - `coverage` = seen/total in the user's category (0..1, clamped);
   - `band` = `topicMastery(...)` from lib/mastery.ts (reuse its thresholds), `itemsSeen`/`itemsTotal`;
   - `medianLatencyMs` = integer median of the topic's `ReviewLog.latencyMs` (null when none).
   Any id-list DB read is chunked ≤200 (P2029). Accepts a `tx` so it composes in finishSession's flow.
2. `recomputeReadiness(userId, categoryId, tx = prisma)` (exported): builds per-block
   `{ quota, meanProb }` from the cat-B blueprint (`lib/exam-blueprint.ts`) × the user's per-block mean
   pass-prob (`perItemPassProb` over the block's ReviewStates R × calibration; unseen → honesty-floored
   prior), mock `{ m, k }` from the last `READINESS_MOCK_WINDOW` COMPLETED `EXAM_SIMULATION` sessions,
   calls `computeReadiness(...)`, and PERSISTS a `ReadinessSnapshot` row whose `inputsJson` is the audit
   trail (meanR, seenCount, mock m/k, priorUnseen, blocks) INCLUDING a `sufficientData` boolean.
3. INSUFFICIENT DATA is first-class: when `seenCount < READINESS_MIN_SEEN` (20), the snapshot carries
   `sufficientData:false` in `inputsJson` and `dialPercent = 0` (NO hard dial number). No new DB column.
4. `getLatestReadiness(userId, categoryId)` (exported reader): returns the latest `ReadinessSnapshot`
   plus a parsed `{ sufficientData, seenCount, dialPercent, bottleneckTopicId, mock }`.
5. `finishSession` (lib/server/test-engine.ts), AFTER the existing `snapshotProgress(...)`, calls
   `recomputeTopicMastery(userId, <session's touched topicIds>)` and (for the session's category)
   `recomputeReadiness(userId, session.categoryId)`. Per-answer tx stays lean (recompute only at finish).
6. `npm run typecheck` exits 0; `npm run build` exits 0.

## Constraints / decisions
- Correctness is proven behaviorally by wave11-09 (integration, Evaluate) — this task's own verify is
   static (exports, chunking, wire) + typecheck/build. Do NOT hand-roll a self-graded correctness test
   here; the readiness DIRECTION oracle lives in 09.
- Reuse pure models verbatim — never re-derive R or the Poisson-binomial (already oracle'd, wave10).
- `sufficientData` lives in `inputsJson` (no schema change) per spec §D.
- Chunk EVERY id-list read ≤200. Prefer `where: { userId, ... }` scans over big `{ in: [...] }` lists.
- `mastery-readiness.ts` is a server module (`import "server-only"` + `@/lib/db` allowed) — it is NOT
   a pure module, so purity greps do not apply to it.
- REUSE COUPLING: the nightly job (wave11-14) imports these SAME recompute fns and calls them with its
   OWN Prisma client — so `recompute*` MUST accept an injected client via the `tx = prisma` param and
   route ALL delegate calls through it (never the module-level `prisma` when a client is passed). The
   nightly runs via `npx tsx --conditions=react-server` to neutralize `server-only`. Do not bury logic
   the nightly can't reach (e.g. inside `finishSession`).

## Plan
- [x] recomputeTopicMastery (chunked) → upsert.
- [x] recomputeReadiness (blueprint blocks + mocks + computeReadiness) → persist snapshot + sufficientData.
- [x] getLatestReadiness reader.
- [x] Wire both into finishSession after snapshotProgress.

## Next
- [ ] (none — Goal met; behavioral proof lives in wave11-09 integration test.)

## Log
- 2026-07-02 planner: task authored.
- 2026-07-02T00:00Z ClPcs-Mac-mini: wired both recomputes into finishSession (lib/server/test-engine.ts) AFTER snapshotProgress — derive touched topicIds from the session's answered questions (dedup, bounded per-session so the `{id:{in}}` read stays well under the 200-param cap), then `recomputeTopicMastery(userId, touchedTopicIds)` + `recomputeReadiness(userId, session.categoryId)`. Full verify.sh GREEN: static greps + typecheck 0 + build 0. Goal fully met; Status→done.
- 2026-07-02T00:00Z ClPcs-Mac-mini: authored lib/server/mastery-readiness.ts with all three exports — recomputeTopicMastery (per-user ReviewState scan + chunked ≤200 topicId reads, meanR via pure retrievability, band via pure topicMastery, median latency from ReviewLog, upsert), recomputeReadiness (blueprint per-block {quota,meanProb} via groupCandidatesByBlock + perItemPassProb, mocks windowed by READINESS_MOCK_WINDOW, pure computeReadiness, sufficientData/dialPercent gated on READINESS_MIN_SEEN, persists ReadinessSnapshot w/ inputsJson audit trail), getLatestReadiness (parsed reader). All fns take `tx = prisma` for finishSession/nightly composition; reuse pure oracle'd models verbatim. `npm run typecheck` exits 0. finishSession wire still pending.

## Artifacts
- lib/server/mastery-readiness.ts — recompute module (recomputeTopicMastery, recomputeReadiness, getLatestReadiness).
- lib/server/test-engine.ts — finishSession wires recomputeTopicMastery(touchedTopicIds) + recomputeReadiness(categoryId) after snapshotProgress.


## Verify
**Last verify:** PASS (2026-07-01T23:16:02Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T23:17:57Z)
