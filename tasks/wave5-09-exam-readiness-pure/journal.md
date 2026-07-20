# Task: wave5-09-exam-readiness-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-22
**Last compute:** cloud-agent

## Goal
Spec C (pure core). Add a PURE, documented learner-facing exam-readiness estimate in a NEW
`lib/readiness.ts` producing a 0..100 score and a 3-band Ukrainian label, with colocated unit tests
incl. the empty-history case. No DB, no UI. (This is a SEPARATE, simpler estimate from the existing
internal 5-level `estimateReadiness` in `lib/progress.ts` — do not modify that one.)

1. NEW file `lib/readiness.ts` exports
   `examReadiness(input: { recentExamScores: number[]; topicBands: MasteryBand[] }): { score: number;
   band: "не готовий" | "майже" | "готовий" }` where `MasteryBand` is imported from `@/lib/mastery`.
2. The heuristic is DOCUMENTED in a doc comment and combines, with NAMED-CONSTANT weights/cutoffs (added
   to `lib/constants.ts`, not magic numbers in the body):
   - the mean of `recentExamScores` (each 0..100; empty ⇒ 0 contribution), and
   - the share of `topicBands` that are NON-weak (`band !== "weak"`; empty ⇒ 0),
   producing `score` clamped to `0..100` (rounded integer).
3. Band mapping is monotonic in `score` via named cutoffs: low ⇒ `"не готовий"`, middle ⇒ `"майже"`,
   high ⇒ `"готовий"`.
4. Empty history is SAFE: `examReadiness({ recentExamScores: [], topicBands: [] })` returns a low/zero
   score and `"не готовий"` and NEVER throws (no division-by-zero, no NaN).
5. `lib/readiness.ts` is PURE: no `server-only`, `@/lib/db`, `@prisma/client`, `lib/generated`, no
   `Math.random` / `Date.now()` / `new Date(...)`.
6. NEW file `lib/readiness.test.ts` imports `examReadiness` and covers: empty history (criterion 4);
   high exam scores + all-non-weak topics ⇒ `"готовий"`; a low/mixed case ⇒ `"не готовий"`; a middle
   case ⇒ `"майже"`; the band cutoff boundaries; and that a higher weak-topic share lowers the score.
7. `npm run typecheck` exits 0.
8. `npm test` exits 0 (zero failures) and `npx vitest list` includes `lib/readiness.test.ts`.

## Constraints / decisions
- New file under `lib/` (pure layer), NOT `lib/server/*`. Do NOT modify `lib/progress.ts`
  `estimateReadiness` / `READINESS_LEVELS` — this 3-band estimate is additive and learner-facing.
- Weights and band cutoffs are NAMED CONSTANTS in `lib/constants.ts` (e.g. an `EXAM_READINESS_*` group),
  not literals buried in the function — per the "no magic numbers" rule.
- The function returns ONLY `{ score, band }`; the legal disclaimer text lives in the UI task
  (wave5-10), not here. Band labels must NOT themselves assert a guarantee.
- Non-Goal: surfacing it (wave5-10), reading the DB, or changing the existing readiness/progress logic.

## Plan
- [x] Add `EXAM_READINESS_*` weight/cutoff constants to `lib/constants.ts`.
- [x] Create `lib/readiness.ts` (`examReadiness`) with the documented heuristic.
- [x] Create `lib/readiness.test.ts` covering empty/high/mid/low + cutoffs + weak-share effect.
- [x] Run verify.sh.

## Done
- [x] Added `EXAM_READINESS_*` constants to `lib/constants.ts`: `EXAM_READINESS_EXAM_WEIGHT=0.6`,
  `EXAM_READINESS_MASTERY_WEIGHT=0.4` (sum 1), `EXAM_READINESS_ALMOST_CUTOFF=50`,
  `EXAM_READINESS_READY_CUTOFF=80` — documented preparation knobs, distinct from `READINESS_LEVELS`.

## Next
- Goal fully met — verify.sh PASSES (typecheck 0, 244 tests pass incl. `lib/readiness.test.ts`).
  Nothing left. Downstream: wave5-10 wires `examReadiness` into the dashboard.

## Artifacts
- lib/constants.ts — adds `EXAM_READINESS_*` weights/cutoffs.
- lib/readiness.ts — new pure `examReadiness`.
- lib/readiness.test.ts — new unit suite.
- tasks/wave5-09-exam-readiness-pure/verify.sh — purity + export + tests gate.

## Log
- 2026-06-22 cloud-agent: scaffolded by planner.
- 2026-06-22T00:00Z ClPcs-Mac-mini: added the `EXAM_READINESS_*` group to lib/constants.ts
  (exam/mastery weights summing to 1; ALMOST=50 / READY=80 band cutoffs) with a doc block noting
  it is an additive learner-facing estimate, distinct from the internal READINESS_LEVELS. Verified
  the chosen knobs map the planned test cases correctly (empty⇒0⇒"не готовий"; high+all-non-weak
  ⇒~97⇒"готовий"; mid⇒~62⇒"майже"; low⇒~26⇒"не готовий"). Next increment: create lib/readiness.ts.
- 2026-06-22T22:33Z ClPcs-Mac-mini: created lib/readiness.ts (pure `examReadiness` returning
  `{ score, band }`; imports `MasteryBand` from @/lib/mastery; blends mean-exam-score and non-weak
  topic share with the `EXAM_READINESS_*` weights, clamp+round to 0..100, maps to the 3 Ukrainian
  bands via ALMOST/READY cutoffs; heuristic doc-commented; pure — no DB/clock/random) plus colocated
  lib/readiness.test.ts (empty/high/mid/low + both cutoff boundaries + weak-share-lowers-score,
  mirroring lib/mastery.test.ts style). verify.sh PASSES: typecheck 0, npm test 244 passed,
  `npx vitest list` includes lib/readiness.test.ts. Goal met → Status: done.


## Verify
**Last verify:** PASS (2026-06-22T19:34:28Z)

## Evaluation
**Last evaluation:** PASS (2026-06-22T19:35:32Z)
