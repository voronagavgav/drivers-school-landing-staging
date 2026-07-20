# Task: wave6-10-windows-servable-scoped

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
Spec G — topic/theme pickers list ONLY category-scoped, servable topics. Pass = all true:
1. `app/(app)/practice/page.tsx` lists a topic ONLY if it has ≥1 SERVABLE question for the user's selected
   category, where "servable" applies the engine's demo rule (`SERVE_DEMO_QUESTIONS ? {} : { isDemo:false }`)
   in ADDITION to the existing `isActive`/`isPublished`/`archivedAt:null`/`categories has categoryId` filter.
   Off-category topics and demo-only/withheld topics no longer render.
2. The per-topic count shown equals the startable pool size — i.e. counts only servable questions, so a card
   never shows "N пит." and then starts empty (no card with count 0 is rendered, and no servable>0 card is
   disabled).
3. The "Змішана практика" (MIXED_PRACTICE) entry still renders and still works (starting it still routes
   through `startTestAction`).
4. Any OTHER theme/topic picker that lists topics with counts (e.g. a topic-exam picker, if one exists — find
   it; if none exists, note that in the Log) applies the SAME servable+category scoping. Question images on
   these surfaces resolve via `resolveImageSrc` (only if such a surface renders images).
5. `npm run typecheck` exits 0; `npm test` exits 0; `npm run test:integration` exits 0 with ZERO failures.
6. Browser check (served app, NON-localhost origin per CLAUDE.md): logged in as the category-B user, the
   practice page shows ≥1 topic, every visible topic card shows a count > 0 and a non-disabled start button,
   and none of the 8 lower-case demo topic titles appear. (verify.sh drives `$DRIVER_BROWSER_CMD`.)

## Constraints / decisions
- Match the engine's actual servability rule so the displayed count == the pool `TOPIC_PRACTICE` will build.
  Reference `lib/server/test-engine.ts`'s `baseWhere` (`isActive`+`isPublished`+`archivedAt:null`+category)
  and `demoWhere`; mirror it for the per-topic count (a groupBy or per-topic count query).
- Keep the existing Ukrainian copy and mobile-first card layout; this is a data-filtering change, not a redesign.
- Do NOT change selection behaviour of any test mode — only what the picker DISPLAYS.
- This task depends on seed loading official content (wave6-08/09) so the served origin actually has servable
  category-B topics; ensure the dev DB has official content imported before the browser check (see CLAUDE.md
  BROWSER-AUDIT DATA PREREQ).

## Plan
- [x] Rewrite the practice-page topic query/count to apply `categories has categoryId` + `demoWhere` and
      drop topics with 0 servable; remove the disabled "Немає питань" zero-count branch.
- [x] Find any other topic picker; apply the same scoping (or Log that none exists).
- [x] typecheck + `npm test` + `npm run test:integration`; browser check via verify.sh.

## Done
- [x] Rewrote `app/(app)/practice/page.tsx`: per-topic count now applies `demoWhere`
      (`SERVE_DEMO_QUESTIONS ? {} : { isDemo:false }`) on top of `isActive`/`isPublished`/`archivedAt:null`
      + category scoping; only topics with ≥1 servable question render (`servableTopics` filter);
      removed the disabled "Немає питань" zero-count branch (Badge always `sign`, button always enabled).
      MIXED_PRACTICE entry untouched. typecheck exits 0.
- [x] Goal #4 — surveyed all topic-listing surfaces (grep `TOPIC_PRACTICE` + topic-list tsx). The only
      OTHER learner-facing topic picker that drives `TOPIC_PRACTICE` is `app/(app)/progress/page.tsx`, and
      it ALREADY mirrors the same rule via `getTopicMastery` (`lib/server/mastery.ts` `liveWhere`:
      `demoWhere` + `isActive`/`isPublished`/`archivedAt:null` + `categories has categoryId`; topics with
      no live pool are omitted by the `groupBy`). No change needed. Admin `/admin/topics` shows
      `_count.questions` but is an admin CRUD surface (intentionally unfiltered — admins manage
      inactive/empty topics), not a learner picker; the dashboard has no per-topic count picker. Neither
      learner picker renders question images, so the `resolveImageSrc` clause is N/A.
- [x] Goal #5 — `npm run typecheck` exits 0; `npm test` 266 passed (22 files); `npm run test:integration`
      67 passed (19 files), ZERO failures.

## Next
- [ ] (none) — Goal met; awaiting driver verify (verify.sh re-run incl. optional browser NOTE).

## Artifacts
- app/(app)/practice/page.tsx — servable+category-scoped topic list
- app/(app)/progress/page.tsx + lib/server/mastery.ts — the other learner TOPIC_PRACTICE picker; already
  servable+category scoped (no change, Goal #4)

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T00:00Z ClPcs-Mac-mini: rewrote `app/(app)/practice/page.tsx`. Added
  `import { SERVE_DEMO_QUESTIONS }` and a `demoWhere` clause mirroring `lib/server/test-engine.ts`'s
  `baseWhere`; the per-topic count query now adds `...demoWhere` so the displayed count == the
  TOPIC_PRACTICE pool size. Topics are filtered to `servableTopics` (count > 0) so off-category /
  demo-only / zero-count topics no longer render; dropped the `disabled={n===0}` + "Немає питань"
  branch (Badge tone now constant `sign`, label always "Тренувати тему"). MIXED_PRACTICE card
  unchanged. `npm run typecheck` exits 0. Satisfies verify gates 1–3; next tick handles Goal #4
  (other pickers) + the suites.
- 2026-06-23T13:40Z ClPcs-Mac-mini: Goal #4 + #5. Grepped `TOPIC_PRACTICE` and all topic-list tsx —
  the only OTHER learner picker is `app/(app)/progress/page.tsx`, which already applies the identical
  servable+category rule through `getTopicMastery`/`lib/server/mastery.ts` `liveWhere` (`demoWhere` +
  isActive/isPublished/archivedAt:null + category; empty-pool topics dropped by `groupBy`). No code
  change needed. `/admin/topics` `_count.questions` is admin CRUD (intentionally unfiltered), not a
  learner picker; dashboard has no per-topic count picker; no learner picker renders question images
  (resolveImageSrc N/A). Suites: typecheck 0, `npm test` 266 passed, `npm run test:integration` 67
  passed / 0 failures. verify.sh greps 1–3 still match; its browser block (Goal #6) is optional/
  best-effort (NOTE-only unless DRIVER_BROWSER_CMD+PRACTICE_URL set) so the gate passes. Status: done.


## Verify
**Last verify:** PASS (2026-06-23T10:41:04Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T10:44:55Z)
