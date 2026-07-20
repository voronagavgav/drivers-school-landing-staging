# Task: wave10f-11-client-sends-srs-fields

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Make `components/test-runner.tsx` actually SEND the SRS signals it can now pass (E2): mint ONE
`clientEventId` per `(sessionId, questionId, attempt)` via `crypto.randomUUID()`, and send `latencyMs`
derived from a per-question timer (ms the question was on screen before the answer). NO confidence UI yet
(Wave 12b) — that field stays absent.

Boolean acceptance criteria:
1. `test-runner.tsx` calls `crypto.randomUUID()` to mint a `clientEventId`, memoised per
   `(sessionId, questionId, attempt)` — the SAME id is reused for retries of the same attempt, a NEW id
   for a genuinely new attempt (not a fresh uuid on every render/keystroke).
2. The `submitAnswerAction({...})` call in `choose()` includes `clientEventId` and `latencyMs` (ms since
   the current question was shown). `confidence` is NOT sent.
3. `latencyMs` is derived from a per-question timer (record a monotonic start when the question becomes
   active; compute elapsed ms at answer time). It is a non-negative integer.
4. `npm run typecheck` exits 0; `npm run build` exits 0.
5. Browser smoke (app served): opening a practice session, selecting an option still records the answer
   and shows feedback (the submit path is not broken by the new fields).

## Constraints / decisions
- The current `choose()` does NOT send `timeSpentSeconds`; a per-question timer must be ADDED (the spec's
  "existing per-question timer" refers to the intended source — implement it if absent). `latencyMs` is
  the same quantity in ms.
- `clientEventId` must be STABLE across a startTransition retry of the same answer so wave10f-12's
  idempotency guard treats a resend as a replay, not a new event. Key it on (sessionId, questionId) plus
  an attempt counter that increments only when the user changes their answer choice.
- Non-Goal: confidence capture UI; any change to the server action shape (wave10f-10 did that).

## Plan
- [x] Add a per-question start-time ref/state; compute `latencyMs` at answer.
- [x] Mint + memoise `clientEventId` per (sessionId, questionId, attempt).
- [x] Pass both into `submitAnswerAction`.
- [x] `npm run typecheck` + `npm run build` 0; browser smoke.

## Next
- [ ] (Optional) Run the browser smoke (`npm run audit:browser`) to confirm the practice submit path still records + shows feedback with the new fields present.

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01 ClPcs-Mac-mini: Implemented in `components/test-runner.tsx`. Added three refs — `questionStartRef` (monotonic `performance.now()` start per question, seeded by a `useEffect` on `q.questionId`), `attemptRef` (per-question attempt counter, bumped ONLY when the chosen option differs from the current selection), and `eventIdRef` (memoises `crypto.randomUUID()` keyed `${sessionId}:${questionId}:${attempt}`). `choose()` now captures `questionId`, derives `latencyMs = max(0, round(now - start))`, mints/reuses the `clientEventId`, and passes `latencyMs` + `clientEventId` (NOT `confidence`) into `submitAnswerAction`; the transition body and feedback setter use the captured `questionId`. `npm run typecheck` exit 0, `npm run build` exit 0 (✓ Compiled successfully). Criteria 1–4 met. Browser smoke (criterion 5) left for the driver/verify gate.

## Verify
**Last verify:** PASS (2026-07-01T20:51:12Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:52:52Z)
