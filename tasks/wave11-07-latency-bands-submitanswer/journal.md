# Task: wave11-07-latency-bands-submitanswer

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Feed per-topic latency bands into grade inference. A PURE band helper (frozen oracle) computes the
thresholds; `submitAnswer` reads the topic's `medianLatencyMs` and threads the bands through
`recordReview` → `deriveGrade`. Depends on wave11-02 (column) + wave11-04 (deriveGrade overrides).
DONE when (verify.sh exits 0):

1. PURE `latencyBandsForMedian(median?: number | null): { easyMs: number; hardMs: number }` exported
   from `lib/fsrs` (e.g. lib/fsrs/latency-bands.ts, re-exported by index). No DB/clock/rng/JSX.
   FROZEN ORACLE (Easy ≤ `max(2500, 0.5×median)`, Hard ≥ `max(20000, 2.5×median)`; absent/≤0 → globals
   5000/30000):
   - `null`     → `{ easyMs: 5000,  hardMs: 30000 }`
   - `0`        → `{ easyMs: 5000,  hardMs: 30000 }`   (degenerate → globals)
   - `1000`     → `{ easyMs: 2500,  hardMs: 20000 }`
   - `3000`     → `{ easyMs: 2500,  hardMs: 20000 }`
   - `10000`    → `{ easyMs: 5000,  hardMs: 25000 }`
   - `40000`    → `{ easyMs: 20000, hardMs: 100000 }`
2. `RecordReviewParams` (lib/server/study.ts) gains optional `easyMs?`/`hardMs?`; `recordReview` passes
   them to `deriveGrade(input, { easyMs, hardMs })`. Absent → deriveGrade defaults (unchanged behavior).
3. `submitAnswer` (lib/server/test-engine.ts), inside its tx, reads the user's
   `TopicMastery.medianLatencyMs` for `question.topicId` (ONE indexed `@@unique([userId, topicId])`
   read), computes bands via `latencyBandsForMedian`, and passes `easyMs`/`hardMs` into the
   `recordReview(...)` param object. A topic with no `TopicMastery` row → null median → globals.
4. `lib/fsrs/latency-bands.test.ts` covers the oracle; `npm test` exits 0; `npm run typecheck` exits 0.

## Constraints / decisions
- The band MATH is pure + frozen-oracle'd so it can't be self-graded; `submitAnswer` only WIRES it.
- Keep the per-answer tx lean — one extra indexed read, no recompute (recompute is at finish, wave11-08).
- Do NOT change deriveGrade's default behavior for callers that pass no bands.

## Plan
- [x] Author latency-bands.ts + test (frozen oracle).
- [x] Thread easyMs/hardMs through recordReview.
- [x] Wire the TopicMastery.medianLatencyMs read into submitAnswer's tx.

## Next
- (none — Goal fully met; verify.sh exits 0)

## Log
- 2026-07-02 planner: task authored; band oracle frozen.
- 2026-07-02T02:05Z ClPcs-Mac-mini: wrote lib/fsrs/latency-bands.ts (pure `latencyBandsForMedian`, frozen oracle: easy≤max(2500,0.5×median)/hard≥max(20000,2.5×median), absent/≤0→globals 5000/30000) + latency-bands.test.ts (5 cases all frozen literals); re-exported from lib/fsrs/index.ts. `npx vitest run lib/fsrs/latency-bands.test.ts` → 5 passed.
- 2026-07-02T03:10Z ClPcs-Mac-mini: wired the read into submitAnswer's tx — inside `if (!priorAttempt)`, one indexed `tx.topicMastery.findUnique({ where: { userId_topicId } })` (guarded on `question.topicId` non-null; null topic → null median), computed `latencyBandsForMedian(mastery?.medianLatencyMs ?? null)`, passed `easyMs`/`hardMs` into the `recordReview(...)` param object. Imported `latencyBandsForMedian` from `@/lib/fsrs`. `npm run typecheck` exits 0; verify.sh → PASS. Status→done.
- 2026-07-02T02:40Z ClPcs-Mac-mini: threaded optional `easyMs?`/`hardMs?` through `RecordReviewParams` → destructured in `recordReview` → `deriveGrade({correct,latencyMs,confidence}, {easyMs,hardMs})` in lib/server/study.ts. Absent → deriveGrade's global defaults (unchanged behavior for existing callers). `npm run typecheck` exits 0. Fixes prior verify FAIL "recordReview does not accept easyMs override". Remaining: submitAnswer medianLatencyMs read.

## Artifacts
- lib/fsrs/latency-bands.ts
- lib/fsrs/latency-bands.test.ts
- lib/fsrs/index.ts (re-export)
- lib/server/study.ts (RecordReviewParams easyMs/hardMs → deriveGrade)
- lib/server/test-engine.ts (submitAnswer reads medianLatencyMs, threads bands)



## Verify
**Last verify:** PASS (2026-07-01T23:08:45Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T23:10:00Z)
