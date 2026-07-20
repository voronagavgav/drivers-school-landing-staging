# Task: wave12b-01-investigate-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini

## Goal
INVESTIGATION ONLY — produce the written surface map the W12b implementation tasks (02–17) execute
against. NO source edits to `app/`, `components/`, `lib/`, `bin/` (the only file created/modified is
the report). Spec: `specs/wave12b-learner-surfaces.md`; UX inputs `docs/app-plan/UX-FINDINGS-2026-07-02.md`.

PASS = ALL true:

1. `docs/app-plan/WAVE12B-SURFACES.md` exists and contains ALL of these sections (verify.sh greps each
   heading literally):
   - `## Dashboard current` — line-mapped inventory of `app/(app)/dashboard/page.tsx`: the
     `ReadinessMeter` block, the separate `examReadiness` «N зі 100» card (the disagreeing pair to be
     REMOVED), the recommend block (lines ~101–110 logic), every occurrence of the literal
     «Почати симуляцію», the `#exam` anchor + quick-start grid, the `EMPTY_NOTICE` map keys (note:
     no `SPACED_REVIEW` key today), the legal-disclaimer lines.
   - `## Readiness data` — exact return shape of `getLatestReadiness` (`lib/server/mastery-readiness.ts`
     ~line 327): fields incl. `sufficientData`/`seenCount`/`dialPercent`/`bottleneckTopicId`, that it
     returns **null** when no snapshot exists (fresh user), where the bottleneck TITLE lives
     (`snapshot.bottleneckTitle`), and the threshold constant `READINESS_MIN_SEEN` (=20).
   - `## Plan data` — `getStudyPlan` (lib/server/study.ts ~349) return shape (`StudyPlan` from
     `lib/study-plan.ts`: daysLeft/dailyQuota/feasible/message), how to read TODAY's answered count
     (StudyDay row via `dayKeyInTimezone`), and the streak/freeze fields on `UserStudyProfile`
     (streakCurrent/streakBest/freezeTokens/lastStudyDay).
   - `## Finish path` — the exact `finishSession` post-completion block (lib/server/test-engine.ts
     ~445–534): the recompute calls (recomputeTopicMastery/recomputeReadiness), the streak block,
     EVERY `getOrCreateProfile` call site reachable in one finish flow (incl. per-answer `submitAnswer`
     line ~418 and any `bumpStudyDay` involvement) — explicitly CONFIRM or REFUTE the spec §G premise
     of a "double getOrCreateProfile upsert on the finish path", with line numbers. Also: whether
     StudyDay rows are written on the finish path today, and where `nextStreakState` gets its inputs.
   - `## Runner regions` — line ranges in `components/test-runner.tsx` for: header row (~234–243),
     progress bar (~246–248), options + `onOptionsKeyDown` roving (~172–191), `submit()` (~136–162),
     bottom nav «Назад/Далі/Завершити» (~390–416), navigator grid (~420–453), Timer (~488–516);
     plus confirmation that NO sessionStorage/hash index persistence exists and NO scrollIntoView
     exists today.
   - `## Result data` — what `app/(app)/test/[id]/result/page.tsx` loads (`getSessionState`), that
     per-question `topicTitle`+`topicId` and correctness are available for grouping, and how an
     UNANSWERED question is represented there today (selectedOptionId null? how it is labelled).
   - `## Due counts` — where due-ReviewState counting exists inline today (`getStudyPlan` dueCount scan,
     `startSpacedReview` filter) and confirmation NO exported count helper exists yet.
   - `## Audit + shots` — `bin/browser-audit.sh` structure (ok/bad + assert_url/assert_text helpers,
     seeded-creds usage, NO fresh-user registration today, NO exam finish today) and the
     `bin/design-shots.sh` runner-finish flow (lines ~70–78) task 17 will port.
   - `## Settings + forms` — `lib/server/user-settings.ts` exports (read-only `getGlassTierOverride`,
     NO write action), `setExamDateAction`/`setDailyGoalAction` in `lib/server/study-profile.ts`
     (unwired to UI), and the current auth/account forms' native-validation attributes.
2. Every line number cited is from a real read of the current files (spot-checkable), and each section
   ends with a one-line `DECISION:` the implementing task consumes where the spec left a choice open
   (e.g. index persistence sessionStorage vs URL hash → sessionStorage; SPACED empty redirect target).

## Constraints / decisions
- Read-only investigation; the ONLY file this task may create/modify is `docs/app-plan/WAVE12B-SURFACES.md`.
- KNOWN FACTS from planner recon (verify, don't re-derive from scratch): `getLatestReadiness` returns
  null w/o snapshot; `EMPTY_NOTICE` lacks SPACED_REVIEW; `setAnswerConfidence` does not exist anywhere;
  audit has ~16 assertions and reuses seeded creds; `.lens` is defined in CSS but used by ZERO tsx.
- Non-Goal: any styling/behavior change, any schema change, any test.

## Plan
- [x] Read dashboard/result/runner/practice/onboarding/account pages + study/study-profile/test-engine servers.
- [x] Read bin/browser-audit.sh + bin/design-shots.sh.
- [x] Write WAVE12B-SURFACES.md with all 9 sections + DECISION lines.

## Done
- [x] Read all target surfaces (dashboard, result, runner, account/register forms, study/study-profile/test-engine/mastery-readiness/user-settings servers, both bin scripts, actions/test.ts) and wrote `docs/app-plan/WAVE12B-SURFACES.md` — 9 sections, 9 DECISION lines, verify.sh PASS.

## Next
- [ ] Nothing — task complete (Goal met, verify green). Downstream tasks 02–17 consume the report.

## Artifacts
- docs/app-plan/WAVE12B-SURFACES.md — the W12b surface map (deliverable).

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 ClPcs-Mac-mini: read every surface listed in Goal (real line numbers) and wrote docs/app-plan/WAVE12B-SURFACES.md (9 sections + 9 DECISION lines). Key findings: spec §G "double getOrCreateProfile on the finish path" CONFIRMED in substance but MISLOCATED — the double upsert is per-answer on the SUBMIT path (test-engine.ts:418 + study-profile.ts:103 inside bumpStudyDay); finishSession calls it once (:515) and never writes StudyDay; nextStreakState reads profile fields only (never StudyDay → the §G reconcile gap is real). Also: startTestAction already redirects NothingDueError→?empty=SPACED_REVIEW (actions/test.ts:43) but EMPTY_NOTICE has no such key → silent today; getSessionState loads topic but does NOT emit topicId (task 09 needs a one-line additive mapping change); unanswered questions are mislabelled «Помилка» on the result page (isCorrect null is falsy at result/page.tsx:92); no sessionStorage/scrollIntoView/digit-key/swipe/setAnswerConfidence anywhere (grep-verified). verify.sh PASS → Status: done.

## Verify
**Last verify:** PASS (2026-07-02T07:51:17Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T07:52:33Z)
