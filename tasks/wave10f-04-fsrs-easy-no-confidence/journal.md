# Task: wave10f-04-fsrs-easy-no-confidence

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-01
**Artifacts:** lib/fsrs/grade.ts, lib/fsrs/grade.test.ts
**Last compute:** laptop

## Goal
Fix `deriveGrade` (`lib/fsrs/grade.ts`, B3) so a missing confidence sample does NOT block Easy: a fast
correct answer with NO confidence supplied should grade Easy(4). An explicit LOW confidence stays an
active veto → Hard(2).

Boolean acceptance criteria:
1. In `deriveGrade`: `fast && (confidence == null || confidence >= FSRS_CONFIDENT_MIN)` → returns `4`
   (Easy). Confidence being absent no longer prevents Easy when the answer is fast + correct.
2. `fast && correct && confidence <= FSRS_LOW_CONFIDENCE_MAX` (explicit low) → returns `2` (Hard).
3. `slow && correct` → returns `2` (Hard); plain correct with neither strong signal → `3` (Good);
   wrong → `1` (Again). (Unchanged behaviours still hold.)
4. `lib/fsrs/grade.test.ts` is updated with cases: fast+no-confidence→Easy(4); fast+low-confidence→Hard(2);
   and existing cases still pass.
5. `npm test` exits 0; `npm run typecheck` exits 0.
6. `lib/fsrs/` purity gate still holds.

## Constraints / decisions
- The change is ONLY to the "Easy" precondition — Easy no longer requires an explicit high-confidence
  sample, but an explicit LOW sample still vetoes it down to Hard. Order the checks so the low-confidence
  veto is evaluated before the relaxed-Easy branch (fast+low must be Hard, not Easy).
- Non-Goal: curve constants (wave10f-03), schedule ordering (wave10f-02), any UI confidence capture.

## Plan
- [x] Rework the branch order in `deriveGrade`: low-confidence/slow → Hard first; then relaxed Easy on
      `fast && (confidence == null || confidence >= FSRS_CONFIDENT_MIN)`; else Good.
- [x] Update `grade.test.ts` (fast+no-conf→4, fast+low→2) and keep the others.
- [x] `npm test` + `npm run typecheck` 0.

## Next
- [x] Relax the Easy precondition in `deriveGrade`. (done)

## Log
- 2026-07-01 laptop: Planned.
- 2026-07-01T23:28Z ClPcs-Mac-mini: Reordered `deriveGrade` (`lib/fsrs/grade.ts`) — slow||lowConfidence
  → Hard(2) is now evaluated BEFORE the relaxed Easy branch `fast && (confidence == null ||
  confidence >= FSRS_CONFIDENT_MIN)` → 4. A missing confidence sample no longer blocks Easy; an
  explicit low sample still vetoes to Hard. Dropped the now-unused `confident` local; updated the
  header comment. Added two `grade.test.ts` cases (fast+no-conf→4, fast+low→2). `npx vitest run
  grade.test.ts` 8/8; full `npm test` 332/332; `npm run typecheck` 0; purity grep clean. Status: done.

## Verify
**Last verify:** PASS (2026-07-01T20:29:04Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:29:45Z)
