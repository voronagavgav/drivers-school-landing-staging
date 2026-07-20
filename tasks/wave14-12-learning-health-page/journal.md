# Task: wave14-12-learning-health-page

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T01:24Z
**Last compute:** mac-mini

## Goal
Admin learning-health page (spec §E UI). Depends on wave14-11. PASS = ALL true:

1. `app/admin/learning-health/page.tsx` exists, calls `requireContentManager()` (house RBAC), renders
   from `getLearningHealth()`:
   - explanation REVIEWED coverage % + unreviewed queue count, the count LINKING to the existing admin
     question filter URL (per wave14-01 finding 1h);
   - difficulty outliers table (question id/key, authored difficulty, observed accuracy, direction) —
     empty state «Розбіжностей не виявлено — авторська складність збігається з поведінкою» when none;
   - confidence-sampling uptake %;
   - nudge volume last 7 days;
   - a link «Готовність (тінь)» to /admin/readiness-shadow (the §E "readiness-shadow summary link").
2. `app/admin/layout.tsx` NAV gains `{ href: "/admin/learning-health", label: "Здоровʼя навчання" }`
   IMMEDIATELY AFTER the «Готовність (тінь)» entry (array order = render order).
3. Page heading is «Здоровʼя навчання» (nav label persists into the page — action-name law).
4. RBAC: unauthenticated GET /admin/learning-health responds non-200 (redirect), and the admin
   access-control integration idiom covers it IF an existing suite enumerates admin routes (extend
   that list; if none enumerates routes, the browser audit in wave14-14 is the RBAC proof — note which).
5. `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build` all exit 0.
6. `lib/learning-health.test.ts` UNCHANGED (frozen oracle).
7. `bash tasks/wave14-12-learning-health-page/verify.sh` exits 0.

## Constraints / decisions
- CRAFT RULES: this is an operator surface — tables with real meaning, no decoration; numbers formatted
  honestly (one decimal max on %); the outlier table's empty state states the GOOD outcome, not absence;
  quiet throughout (no bold hero — admin pages have none).
- No client component needed — pure server render.
- Do not re-aggregate in the page; single `getLearningHealth()` call (contract from wave14-11).

## Next
- [x] Read wave14-11 return shape + finding 1h; build the page + nav entry.
- Goal fully met; verify.sh PASS. RBAC proof deferred to wave14-14 browser audit (no
  existing integration suite enumerates admin routes; the layout `requireContentManager()`
  gate covers unauthenticated GET → redirect, non-200).

## Artifacts
- app/admin/learning-health/page.tsx, app/admin/layout.tsx (nav)

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-03T01:24Z ClPcs-Mac-mini: built app/admin/learning-health/page.tsx (server render
  from single getLearningHealth() call — KPI strip: reviewed-explanation %, confidence-uptake
  %, nudge volume 7d; unreviewed queue count LINKS to /admin/questions per finding 1h coarse
  fallback since no reviewedStatus filter param exists yet; difficulty-outliers table with the
  «Розбіжностей не виявлено…» empty state; «Готовність (тінь)» link to /admin/readiness-shadow).
  Outlier table renders from the frozen DifficultyOutlier shape (questionId/expected/observed/
  delta/direction) — no re-aggregation; authored difficulty surfaced via its expected-accuracy.
  Added nav entry immediately after «Готовність (тінь)» in app/admin/layout.tsx. typecheck+test
  (554)+test:integration (150 pass/2 skip)+build all 0; verify.sh → PASS wave14-12. Status: done.

## Verify
**Last verify:** PASS (2026-07-02T22:25:43Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T22:27:59Z)
