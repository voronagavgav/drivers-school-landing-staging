# Task: wave12b-06-dashboard-dial-hero

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §A first bullet + second bullet: ONE honest readiness metric — the W11 dial becomes the dashboard
hero, the disagreeing legacy pair (ReadinessMeter ring + «N зі 100» card) is REMOVED from learner
surfaces, and the recommended action branches via `lib/recommend-action.ts` (task 02).

PASS = ALL true:

1. `app/(app)/dashboard/page.tsx` calls `getLatestReadiness` (from `@/lib/server/mastery-readiness`)
   and NO LONGER references `ReadinessMeter` or `examReadiness` (grep both absent from the file).
   `ReadinessMeter` stays exported from `components/ui.tsx` and `/admin/readiness-shadow` is untouched.
2. New client component `components/readiness-dial.tsx` renders the dial from PLAIN props (no server
   imports — client-bundle law in CLAUDE.md):
   - insufficient data (`getLatestReadiness` returned null OR `sufficientData === false`): NO percent
     number, NO verdict; copy contains «Ще недостатньо даних» and shows progress toward the threshold
     (`seenCount` of `READINESS_MIN_SEEN`, e.g. «Дайте відповідь ще на N питань») with a progress bar.
   - sufficient: `dialPercent` count-up animation to the final value; under
     `prefers-reduced-motion: reduce` it jumps straight to the final value (matchMedia check).
   - bottleneck line: «Найслабше: {bottleneckTitle}» + a one-tap practice link/form starting
     TOPIC_PRACTICE for `bottleneckTopicId` (only when a bottleneck exists).
   - the dial card element has BOTH `data-testid="readiness-dial"` and the `lens` class (the wave's
     signature refraction surface — CSS tiers already gate real-vs-emulated; this is the FIRST `.lens`
     consumer).
3. The recommended-action block imports `recommendAction` from `@/lib/recommend-action` and feeds it
   real state: `sufficientData` from the dial data; `lastExamPassed` from the most recent COMPLETED
   EXAM_SIMULATION session (null if none); `hasWeakTopics` from existing weak-topic/mastery data.
   Copy mapping (component-side): "mixed-practice" → Змішана практика CTA (startTestAction
   MIXED_PRACTICE); "weak-topics" → corrective copy containing «найслабших тем» + practice link;
   "keep-pace-exam" → keep-pace copy + link to the `#exam` section. The literal «Тримайте темп» (or any
   congratulatory keep-pace copy) is NOT rendered on the weak-topics branch (grep: «Тримайте темп» and
   «найслабших тем» do not appear inside the same JSX branch — mechanically: the corrective branch copy
   is present, and «Тримайте темп», if used at all, appears only in the keep-pace mapping).
4. The legal disclaimer stays, unchanged and on one source line: grep `не гарантує` still matches
   `app/(app)/dashboard/page.tsx`.
5. `npm run typecheck`, `npm test`, `npm run build` exit 0 (build catches the client-bundle law).
6. Browser (guarded on server reachability, 12a style): /dashboard (seeded user) contains an element
   `[data-testid="readiness-dial"]`.

## Constraints / decisions
- The dial consumes the W11 snapshot (`getLatestReadiness`) — do NOT recompute readiness on page load.
- Server page computes everything; the dial is a leaf client component taking plain props
  (`sufficientData`, `seenCount`, `minSeen`, `dialPercent`, `bottleneckTitle`, `bottleneckTopicId`).
- ≤2 `.lens` surfaces co-visible app-wide is LAW; this task adds exactly ONE (the dial card).
- Detoxified tone: no red/danger styling on the insufficient-data state — it is a calm progress state,
  not a failure.
- Non-Goal: plan card + exam section (task 07); audit fresh-user assertion (task 17).

## Plan
- [x] Read WAVE12B-SURFACES.md §Dashboard current + §Readiness data.
- [x] Build components/readiness-dial.tsx (count-up, reduced-motion, lens).
- [x] Rewire dashboard page: getLatestReadiness + recommendAction; remove ring + «N зі 100».
- [x] typecheck/test/build + browser check + verify.sh.

## Done
- [x] Read spec §Dashboard current + §Readiness data; built `components/readiness-dial.tsx`.
- [x] Rewired `app/(app)/dashboard/page.tsx`: dial hero via `getLatestReadiness` +
      `READINESS_MIN_SEEN`, legacy ReadinessMeter card + examReadiness «N зі 100» card removed
      (incl. imports/comments — verify greps whole file), recommend block now
      `recommendAction({sufficientData, lastExamPassed, hasWeakTopics})` with a page-side copy map
      (weak-topics → «найслабших тем» corrective; «Тримайте темп» ONLY in keep-pace-exam, which
      renders a `#exam` LinkButton instead of a start form); disclaimer «не гарантує» kept on one
      line under the dial. verify.sh → PASS.

## Next
- (none — task done; audit fresh-user assertion is task 17, plan card/exam section is task 07)

## Artifacts
- components/readiness-dial.tsx (created), app/(app)/dashboard/page.tsx (rewired)

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 08:38 UTC ClPcs-Mac-mini: read WAVE12B-SURFACES.md §Dashboard current + §Readiness
  data + task verify.sh; created `components/readiness-dial.tsx` — leaf client component, plain
  props (sufficientData/seenCount/minSeen/dialPercent/bottleneckTitle/bottleneckTopicId), SVG
  ring with rAF count-up (jump under prefers-reduced-motion via matchMedia), calm
  insufficient-data state («Ще недостатньо даних» + RoadProgress toward minSeen, no danger
  styling), bottleneck line + TOPIC_PRACTICE one-tap form (startTestAction import is a safe
  action reference per client-bundle law), `data-testid="readiness-dial"` + first `.lens`
  surface. `npm run typecheck` green. Next tick rewires the dashboard page.
- 2026-07-02 08:49 UTC ClPcs-Mac-mini: fixed the FAILed verify (legacy readiness still on the page)
  by doing the planned rewire of `app/(app)/dashboard/page.tsx`: `getLatestReadiness` → plain props
  into `<ReadinessDial/>` hero (bottleneckTitle from `dial.snapshot.bottleneckTitle`); removed the
  ReadinessMeter card, its trend/sparkline block, and the examReadiness estimate card + all
  now-unused imports and the line-82 comment mentioning ReadinessMeter; recommend block =
  `recommendAction` fed `sufficientData` (dial), `lastExamPassed` (latest COMPLETED EXAM_SIMULATION
  via prisma.findFirst, null if none), `hasWeakTopics` (`p.weakTopics.length > 0`) with a
  RECOMMEND_COPY map (mixed-practice/weak-topics → start forms, keep-pace-exam → `#exam`
  LinkButton; LinkButton takes no data-* props so no track label there). typecheck + 430 unit
  tests + build green. First verify.sh run FAILed at the browser audit — STALE SERVER (booted
  10:19, pre-change; CLAUDE.md wave11-16 trap): killed pid 18230, relaunched
  `npm run start -- -H 0.0.0.0 -p 3100`, audit 19/19 green, verify.sh → `PASS wave12b-06`.
  Live check: logged in as seeded user via agent-browser — `[data-testid="readiness-dial"]`
  present on /dashboard with class `lens p-6`. Status → done.


## Verify
**Last verify:** PASS (2026-07-02T08:51:32Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T08:53:31Z)
