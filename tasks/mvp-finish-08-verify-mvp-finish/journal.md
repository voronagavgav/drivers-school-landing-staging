# Task: mvp-finish-08-verify-mvp-finish

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
End-to-end acceptance gate for the whole `mvp-finish` batch (Parts A + B). No new feature code —
this task only verifies the spec's acceptance criteria are met and records the result.

1. `npm run typecheck` exits 0.
2. `npm test` exits 0 with 5 test files and at least 37 passing tests, zero failures.
3. Part A pure logic present: `lib/question-stats.ts` exports `summarizeQuestionPerformance` and is
   PURE (no `@/lib/db`, `server-only`, `@prisma/client`, or `lib/generated` import).
4. Part A tests present: `lib/question-stats.test.ts` exists and references `summarizeQuestionPerformance`.
5. Part A server aggregation present: `lib/server/admin.ts` exports `getQuestionPerformance` and uses
   `summarizeQuestionPerformance` from `@/lib/question-stats`.
6. Part A UI present: `app/admin/questions/page.tsx` calls `getQuestionPerformance` and renders both a
   times-answered figure and an accuracy `%`, and still renders `DemoBadge`.
7. Part B server query present: `lib/server/progress.ts` exports `getRecentReadinessScores`.
8. Part B UI present: `app/(app)/dashboard/page.tsx` calls `readinessTrend` and `getRecentReadinessScores`,
   and the three exact trend strings «Динаміка: вгору» / «Динаміка: вниз» / «Динаміка: стабільно»
   appear in the rendered codebase (page or `lib/progress.ts`).
9. Schema unchanged: `git diff --stat` shows NO change to `prisma/schema.prisma` for this batch.
10. BROWSER (optional, when the app is served and `$DRIVER_BROWSER_CMD` is set): `/dashboard` shows
    «Динаміка:» for an authenticated user and `/admin/questions` shows the «Статистика питань» stats
    section for a content manager. Skipped gracefully (not failed) when the app is not serveable.

## Constraints / decisions
- Verification only. If a check FAILS, do NOT fix it here — record the failure in `## Log` and set the
  failing upstream task (02–07) back to `active` with a note, then stop. This task passes ONLY when
  every upstream criterion holds.
- Browser checks are OPTIONAL/guarded so the gate is runnable headlessly; items 1–9 are the hard gate.
- Non-Goal: implementing or editing any feature code, committing, or marking other tasks done.

## Plan
- [x] Run `npm run typecheck` and `npm test`; confirm counts.
- [x] Run the static greps for items 3–9.
- [x] If serveable, run the optional browser checks for `/dashboard` and `/admin/questions`.

## Done
- [x] Ran `verify.sh`: PASS. typecheck exit 0; `npm test` = 5 test files / 38 tests passed, zero failures; static greps for items 3–9 all held; browser checks skipped gracefully (no DRIVER_BROWSER_CMD / app not served). Gate fully met.

## Next
- [ ] None — acceptance gate passed; task complete.

## Artifacts
- tasks/mvp-finish-08-verify-mvp-finish/verify.sh — full batch acceptance gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T09:28Z ClPcs-Mac-mini: ran `verify.sh` → PASS (exit 0). typecheck clean; vitest 5 files / 38 tests passed, 0 failures; items 3–9 static checks held; browser checks skipped (headless). Set Status: done.

## Verify
**Last verify:** PASS (2026-06-17T06:28:43Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T06:30:01Z)
