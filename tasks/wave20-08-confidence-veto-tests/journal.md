# Task: wave20-08-confidence-veto-tests

**Status:** done
**Driver:** auto
**Updated:** 2026-07-14
**Last compute:** ClPcs-Mac-mini

TESTS-ONLY (spec Deliverable 7 / D6 boundary census). Pin, as unit tests, the interaction of the
confidence veto and latency cap with the honest guess floor — the GRADE-SIDE-PROBES boundary census.
NO code change is expected: `deriveGrade`'s cap-only secondary axes (very-slow → Good; confidence≤2 →
Hard) already sit AFTER the posterior. If the observed behavior diverges from the census below, STOP
and surface it — do NOT adjust the pins to match the impl.

## The census (frozen expectations, applied AFTER the posterior→band map)
Thresholds unchanged (Good≥0.75, Easy≥0.93); `FSRS_LOW_CONFIDENCE_MAX=2`, `FSRS_HARD_LATENCY_MS`.
- Confidence ≤2 caps the grade to Hard(2) AFTER the posterior band is computed (a 5-opt correct at a
  strong prior that would be Easy/Good is capped to Hard when confidence≤2).
- Both caps stack: a very-slow (≥ hardMs) AND low-confidence (≤2) correct ⇒ Hard(2) (slow caps Easy→Good,
  confidence caps →Hard).
- Confidence null AND latency null ⇒ NO-OP: the grade is exactly the posterior band (no cap fires).
- Confidence ≥3 (confident) does NOT promote — it is not a cap that raises; grade stays the posterior band.
- The veto composes with the honest guess floor: e.g. a 2-option correct at neutral prior is already
  Hard(2) (posterior 0.666667 < 0.75); confidence≤2 leaves it Hard(2) (idempotent).

## Goal
PASS = ALL true:

1. A unit test file (`lib/fsrs/confidence-veto.test.ts`, or an added block in the existing
   `lib/fsrs/grade.test.ts`) asserts every census row above against the REAL `deriveGrade`, using the
   capped guess floor (task 03) — e.g. a strong-prior 5-opt correct with confidence=1 ⇒ `deriveGrade`
   returns 2; the same with confidence=null/latency=null ⇒ returns the uncapped band (3 or 4).
2. The stacking case (verySlow ≥ hardMs AND confidence≤2) ⇒ `deriveGrade` returns 2.
3. The no-op case (confidence null, latency null) ⇒ `deriveGrade` returns exactly the posterior band
   for the given prior/optionCount (assert against the frozen posterior for that fixture).
4. `npm run -s typecheck` exits 0; `npm run -s test` exits 0 with the census test collected (proven via a
   `npx vitest list` token-retry capture).
5. If ANY census row's observed `deriveGrade` output diverges from the frozen expectation, the task is
   BLOCKED and the divergence surfaced in the journal Log — the pin is NOT edited to match.

## Constraints / decisions
- Tests-only: no non-test source change. `deriveGrade`'s cap-only secondary axes are already implemented
  (grade.ts lines 92–98) — this task freezes their census against the honest guess floor.
- Pure lib/fsrs test file: build any fixed clock via `Reflect.construct(Date, args)`, never literal
  `new Date`; keep the phrase out of comments (purity grep scans test files).
- Expected band values come from the frozen posterior math (task 01/02), not from calling the impl.

## Next
- [x] Write the confidence-veto census test; run typecheck + test; if a row diverges, mark blocked and
      surface (do not re-pin).
- Goal fully met — no follow-up.

## Artifacts
- `lib/fsrs/confidence-veto.test.ts` — the frozen census (7 tests), asserts every row against the REAL
  `deriveGrade`/`gradePosterior` with the capped guess floor.

## Log
- 2026-07-14 laptop: planned by the wave20 planner.
- 2026-07-14 ClPcs-Mac-mini: wrote `lib/fsrs/confidence-veto.test.ts` pinning all 6 census rows against
  the real `deriveGrade`. Verified posterior math externally (node): strong-5opt p0=0.9/g=0.2 → π=0.97590
  (Easy-band); 2opt p0=0.5/g=0.45 → π=0.66667 (Hard); 4opt p0=0.2 → π=0.47368 (Hard). NO row diverged
  from the frozen expectation — no impl change, no re-pin. `npm run -s typecheck` exits 0; `npm run -s
  test` = 71 files / 759 tests passed; census file COLLECTED (confirmed via `npx vitest list` under bash).
  Status → done.

## Verify
**Last verify:** PASS (2026-07-13T23:29:29Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T23:30:41Z)
