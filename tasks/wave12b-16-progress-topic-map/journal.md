# Task: wave12b-16-progress-topic-map

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §F: /progress becomes the anti-leaderboard «Карта тем» — all topics grouped by mastery band from
the materialized `TopicMastery` rows (mean-R decay = honest slip-back), no percents beyond the band.

PASS = ALL true:

1. `lib/topic-map.ts` exists, is PURE (no `@/lib/db`/`server-only`; no JSX), and exports
   `function groupTopicsByBand(topics: Array<{ topicId: string; title: string; band: "weak" | "learning" | "strong" | null; meanR: number | null }>): { weak: T[]; learning: T[]; strong: T[] }`
   with FROZEN semantics (verify.sh probes; do NOT edit verify.sh):
   - band null (no TopicMastery row yet / unseen) → the `weak` group;
   - within `weak`: seen topics sorted by meanR ASC first (weakest evidence first), then unseen
     (meanR null) after them, each subgroup tied by title asc;
   - `learning` and `strong` sorted by meanR asc, ties by title asc.
2. `lib/topic-map.test.ts` covers those semantics; `npm test` exits 0; collected by `npx vitest list`
   (captured var).
3. A server reader `getTopicMap(userId, categoryId)` (in `lib/server/topic-map.ts` or added to
   `lib/server/mastery-readiness.ts`) joins the category's servable topics with the user's
   `TopicMastery` rows (band/meanR off the DB rows) and feeds `groupTopicsByBand`.
4. `app/(app)/progress/page.tsx` renders «Карта тем» with three group headings — «Вивчаю» (weak/unseen),
   «Майже» (learning), «Впевнено» (strong) — in that order (weakest surfaced first), every topic as a
   row/chip with a one-tap `<form action={startTestAction}>` `mode=TOPIC_PRACTICE` + `topicId` start.
5. Anti-leaderboard: the map shows NO accuracy percents, scores or ranks per topic — the literal
   «Точність» and any `{...}%` interpolation are ABSENT from the map component/block (band + title +
   start affordance only). The legacy per-topic accuracy cards are REPLACED by the map (grep:
   `getTopicMastery` from `@/lib/server/mastery` no longer imported by the page, or only for data the
   map itself needs).
6. `npm run typecheck`, `npm test`, `npm run build` exit 0.
7. Browser (guarded): /progress contains «Карта тем» and «Вивчаю».

## Constraints / decisions
- Band labels map DB→display: weak→«Вивчаю», learning→«Майже», strong→«Впевнено» (spec §F wording);
  private view, no comparisons with other users.
- Unseen topics belong under «Вивчаю» (spec: 65-topic map — every servable topic appears exactly once).
- Keep any non-percent history content the page already has below the map, restyled tokens only.
- Do not edit this task's verify.sh (frozen probe).
- Non-Goal: recompute changes (W11 owns TopicMastery), sparkline redesign.

## Plan
- [x] Write lib/topic-map.ts + test.
- [x] Add the server reader; rework /progress to the grouped map.
- [x] typecheck/test/build + browser + verify.sh.

## Done
- [x] `lib/topic-map.ts` (pure `groupTopicsByBand`, generic over extra fields, uk-locale title ties)
      + `lib/topic-map.test.ts` (6 cases: null→weak, weak seen/unseen order, meanR asc + title ties,
      Ґ/Д uk-collation oracle, exactly-one-group + passthrough fields, no input mutation).
- [x] `lib/server/topic-map.ts` reader (`getTopicMap`: servable-topic groupBy × user TopicMastery
      JS-join → `groupTopicsByBand`) + `/progress` reworked to the «Карта тем» grouped map
      (three §F headings, TOPIC_PRACTICE start rows, zero percents). verify.sh PASS end to end.

## Next
- (none — Goal fully met, verify.sh PASS end to end incl. browser audit)

## Artifacts
- lib/topic-map.ts, lib/topic-map.test.ts, lib/server/topic-map.ts, app/(app)/progress/page.tsx

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 10:53 UTC ClPcs-Mac-mini: wrote lib/topic-map.ts (pure groupTopicsByBand: null-band→weak;
  weak = seen-by-meanR-asc then unseen-by-title; learning/strong meanR asc, title ties via
  localeCompare "uk"; non-mutating, generic passthrough) + lib/topic-map.test.ts. Verified: frozen
  probe replica prints "topic-map probe ok"; purity/no-JSX greps clean; `npx vitest list` collects the
  file; npm test 487/487 green; typecheck green. Next: server reader + page rework.
- 2026-07-02 11:00 UTC ClPcs-Mac-mini: fixed the failed verify ("map heading missing" = page not yet
  reworked). Added lib/server/topic-map.ts (`getTopicMap(userId, categoryId)`: live-pool groupBy for
  servable topics + `topicMastery.findMany({where:{userId}})` JS-join, itemsSeen>0 gate → band/meanR
  else null-unseen, feeds `groupTopicsByBand`). Reworked app/(app)/progress/page.tsx to the «Карта
  тем» anti-leaderboard: h1 «Карта тем», three SectionTitle groups «Вивчаю»/«Майже»/«Впевнено» (page-
  local wording per spec §F — NOT MASTERY_LABEL), topic rows with TOPIC_PRACTICE start forms only; no
  «Точність»/percents/RoadProgress; `getTopicMastery` import removed. typecheck + 487 unit tests +
  build green. Restarted the stale LAN `next start` (predated the fresh build, per learnings), ran
  bin/browser-audit.sh 19/19 PASS, then authed agent-browser eval on /progress: «Карта тем»+all 3
  headings present, «Точність»/percent absent. Full verify.sh (with DRIVER_BROWSER_CMD) → PASS
  wave12b-16. Status → done.


## Verify
**Last verify:** PASS (2026-07-02T11:03:02Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T11:04:39Z)
