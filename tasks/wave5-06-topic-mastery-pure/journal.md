# Task: wave5-06-topic-mastery-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-22
**Last compute:** cloud-agent

## Goal
Spec B (pure core). Add a PURE per-topic mastery classifier in a NEW `lib/mastery.ts` mapping
answered/correct/total counts into a band (`weak | learning | strong`) plus a coverage ratio, reusing
the existing weak-topic thresholds and adding ONE new tunable. Colocated unit tests. No DB, no UI.

1. `lib/constants.ts` exports a new named tunable `MASTERY_STRONG_ACCURACY_THRESHOLD` (0..1, e.g.
   `0.85`) with a comment — the accuracy at/above which a sufficiently-answered topic is `strong`.
2. NEW file `lib/mastery.ts` exports:
   - a type `MasteryBand = "weak" | "learning" | "strong"`;
   - `topicMastery(input: { answered: number; correct: number; total: number }): { band: MasteryBand;
     accuracy: number; coverage: number }` where `accuracy = accuracyOf(correct, answered)` (reuse
     `@/lib/progress` `accuracyOf` or replicate the same `total<=0?0:...` guard) and
     `coverage = total > 0 ? Math.min(1, answered / total) : 0`;
   - a `MASTERY_LABEL: Record<MasteryBand, string>` of Ukrainian WORD markers (non-colour, e.g.
     `weak:"Слабко"`, `learning:"Вивчаю"`, `strong:"Впевнено"`).
3. Band rule (provable by tests), reusing `WEAK_TOPIC_MIN_ANSWERS` (4) and
   `WEAK_TOPIC_ACCURACY_THRESHOLD` (0.6):
   - `answered < WEAK_TOPIC_MIN_ANSWERS` ⇒ `learning` (low sample is NEVER `strong`);
   - else `accuracy < WEAK_TOPIC_ACCURACY_THRESHOLD` ⇒ `weak`;
   - else `accuracy >= MASTERY_STRONG_ACCURACY_THRESHOLD` ⇒ `strong`;
   - else ⇒ `learning`.
4. `lib/mastery.ts` is PURE: no `server-only`, `@/lib/db`, `@prisma/client`, `lib/generated`, no
   `Math.random` / `Date.now()` / `new Date(...)`.
5. NEW file `lib/mastery.test.ts` imports `topicMastery` and covers: each of the three bands; the
   low-sample edge (answered just below `WEAK_TOPIC_MIN_ANSWERS` with high accuracy ⇒ `learning`, not
   `strong`); the weak/strong threshold boundaries; and `coverage` (incl. `total === 0 ⇒ 0` and the
   `answered > total ⇒ 1` clamp).
6. `npm run typecheck` exits 0.
7. `npm test` exits 0 (zero failures) and `npx vitest list` includes `lib/mastery.test.ts`.

## Constraints / decisions
- REUSE `WEAK_TOPIC_ACCURACY_THRESHOLD` / `WEAK_TOPIC_MIN_ANSWERS` (keep the `weak` band identical to
  `detectWeakTopics`'s criteria); add only the one strong-accuracy tunable as a named constant.
- New file under `lib/` (pure helper layer), NOT `lib/server/*`. No DB import.
- `MASTERY_LABEL` words are the a11y NON-COLOUR marker the view (wave5-08) renders — keep them concise
  Ukrainian words/icons, not colour names.
- Non-Goal: any DB aggregation (that is wave5-07), the view (wave5-08), or changing `detectWeakTopics` /
  `topicStats` / `estimateReadiness`.

## Plan
- [x] Add `MASTERY_STRONG_ACCURACY_THRESHOLD` to `lib/constants.ts`.
- [x] Create `lib/mastery.ts` (`MasteryBand`, `topicMastery`, `MASTERY_LABEL`).
- [x] Create `lib/mastery.test.ts` covering all bands + low-sample + boundaries + coverage.
- [x] Run verify.sh.

## Done
- [x] Added `MASTERY_STRONG_ACCURACY_THRESHOLD = 0.85` to `lib/constants.ts` (in the
  "Readiness / progress tuning" section, next to `WEAK_TOPIC_*`).
- [x] Created pure `lib/mastery.ts`: `MasteryBand` type, `topicMastery({answered,correct,total})`
  (reuses `accuracyOf` + `WEAK_TOPIC_MIN_ANSWERS`/`WEAK_TOPIC_ACCURACY_THRESHOLD`/
  `MASTERY_STRONG_ACCURACY_THRESHOLD`; `coverage = total>0 ? min(1, answered/total) : 0`), and
  `MASTERY_LABEL` (Ukrainian word markers Слабко/Вивчаю/Впевнено).
- [x] Created `lib/mastery.test.ts` (9 cases: 3 bands + low-sample edge + weak/strong boundaries +
  coverage incl. total=0 ⇒ 0 and answered>total ⇒ 1 clamp).
- [x] verify.sh PASS (typecheck 0, 235 tests pass, `npx vitest list` includes mastery.test.ts).

## Next
- [ ] None — Goal met, verify green. Downstream: wave5-07 consumes `topicMastery` from a server helper.

## Artifacts
- lib/constants.ts — adds `MASTERY_STRONG_ACCURACY_THRESHOLD`.
- lib/mastery.ts — new pure `topicMastery` + `MasteryBand` + `MASTERY_LABEL`.
- lib/mastery.test.ts — new unit suite.
- tasks/wave5-06-topic-mastery-pure/verify.sh — purity + export + tests gate.

## Log
- 2026-06-22 cloud-agent: scaffolded by planner.
- 2026-06-22T00:00Z ClPcs-Mac-mini: added `MASTERY_STRONG_ACCURACY_THRESHOLD = 0.85` to
  lib/constants.ts (Readiness / progress tuning section, beside `WEAK_TOPIC_*`). Verify gate #1
  (grep for the export) now satisfied. Next: create lib/mastery.ts.
- 2026-06-22T22:20Z ClPcs-Mac-mini: created pure `lib/mastery.ts` (`MasteryBand`, `topicMastery`,
  `MASTERY_LABEL`) reusing `accuracyOf` + the weak thresholds + new strong tunable, and its
  colocated `lib/mastery.test.ts` (9 cases). verify.sh PASS — typecheck 0, 235 tests pass, list
  includes mastery.test.ts. Goal met → Status: done.


## Verify
**Last verify:** PASS (2026-06-22T19:21:15Z)

## Evaluation
**Last evaluation:** PASS (2026-06-22T19:22:53Z)
