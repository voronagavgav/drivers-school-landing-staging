# Task: wave11-01-investigate-loop-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
INVESTIGATION ONLY — produce a findings doc; change NO product code. This de-risks every downstream
Wave-11 task by pinning exact insertion points + existing shapes. DONE when
`docs/app-plan/WAVE11-SURFACES.md` exists and every numbered item below is answered with a concrete
`file:line` citation (a grep-able anchor). `verify.sh` exits 0 when the doc exists and mentions each
required anchor file.

1. Where `startSession` (lib/server/test-engine.ts) would branch on `ADAPTIVE_REVIEW`/`SPACED_REVIEW`
   before its `baseWhere`/pool build; confirm `test-engine.ts` may import from `./study` with NO cycle
   (test-engine already imports `recordReview` from `./study`; `study.ts` must NOT import test-engine).
2. The exact `submitAnswer` tx line where `question.topicId` is known and `recordReview(tx, {...}, now)`
   is called (~line 376), so a `TopicMastery.medianLatencyMs` read + `deriveGrade` band-override
   threading can be inserted; and the `recordReview` param object that must carry the override values.
3. The `finishSession` line AFTER `snapshotProgress(...)` (~line 463) where the recompute (TopicMastery
   + ReadinessSnapshot) wires in; and how to derive the session's touched `topicId`s + its category.
4. Confirm+cite Prisma shapes: `ReviewState`, `ReviewLog`, `TopicMastery` (note: NO `medianLatencyMs`
   yet), `ReadinessSnapshot` (`inputsJson`, `dialPercent`, `bottleneckTopicId/Title`),
   `UserStudyProfile`, `StudyDay` (all already exist in prisma/schema.prisma).
5. The `CATEGORY_B_BLUEPRINT` block→`ReadinessBlock {quota, meanProb}` mapping: which exam-blueprint.ts
   export enumerates block quotas/sections, and how a block's per-item mean pass-prob is computed
   (R×calibration over that block's topics' ReviewStates; unseen → honesty-floored prior).
6. Legacy readiness source for the shadow-view DELTA: where `ProgressSnapshot.readinessScore`/
   `readinessLevel` is written (lib/server/progress.ts `snapshotProgress` → lib/readiness.ts).
7. `STARTABLE_MODES` (lib/constants.ts) + `startTestSchema` (lib/validation.ts) + the
   `NoQuestionsError`→`redirect('/dashboard?empty=MODE')` pattern (app/actions/test.ts) + `EMPTY_NOTICE`
   map (app/(app)/dashboard/page.tsx) — the SPACED_REVIEW "nothing due" redirect target.
8. Admin nav wiring: `NAV_LINKS` in app/admin/layout.tsx (insert point after «Якість контенту») +
   `bin/browser-audit.sh` `ok`/`bad` helper style + current assertion count (must reach 17).
9. `__testutils__/official-question.ts` signature + the analytics-suite noise lesson (unique fixture
   keys/windows) for the three new integration suites.

## Constraints / decisions
- READ-ONLY on product code. Only writes `docs/app-plan/WAVE11-SURFACES.md`.
- Findings are anchors, not designs — downstream tasks own the actual edits.

## Plan
- [x] Grep/read each surface; one doc section per numbered item with a `file:line` citation.

## Next
- [x] Author `docs/app-plan/WAVE11-SURFACES.md` — all 9 numbered items answered with anchors; verify.sh PASS.

## Artifacts
- `docs/app-plan/WAVE11-SURFACES.md` — the findings doc (9 sections + downstream anchor map).

## Log
- 2026-07-02 planner: task authored.
- 2026-07-02T00:00Z ClPcs-Mac-mini: Read all 9 surfaces (test-engine.ts, study.ts, progress.ts,
  exam-blueprint.ts, constants.ts, validation.ts, actions/test.ts, admin/layout.tsx,
  browser-audit.sh, official-question.ts, grade.ts, schema.prisma models). Confirmed no import
  cycle (test-engine→study one-way), TopicMastery has NO medianLatencyMs yet, submitAnswer
  recordReview call at :376, finishSession snapshotProgress at :463, browser-audit runtime
  assertion count = 15 (10 literal + 5-iteration loop) → 17 target. Wrote WAVE11-SURFACES.md;
  verify.sh PASS. Status→done.

## Verify
**Last verify:** PASS (2026-07-01T22:38:31Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T22:39:19Z)
