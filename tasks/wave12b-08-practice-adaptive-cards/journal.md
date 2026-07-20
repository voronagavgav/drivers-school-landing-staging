# Task: wave12b-08-practice-adaptive-cards

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §B: the adaptive family goes learner-visible on /practice, with a live due-count badge and the
calm nothing-due state.

PASS = ALL true:

1. `lib/server/study.ts` exports `countDueReviews(userId: string, categoryId: string, now: Date = new Date()): Promise<number>` —
   counts `ReviewState` rows with `dueAt <= now` whose question is published, active, non-archived and
   in the category (same `baseWhere` shape as the queue loaders).
2. `app/(app)/practice/page.tsx` renders mode cards in this ORDER (grep -n line order in the file):
   «Розумне повторення» (ADAPTIVE_REVIEW) first, «Інтервальне повторення» (SPACED_REVIEW) second, then
   «Змішана практика», then the per-topic grid. Both new cards start via
   `<form action={startTestAction}>` + hidden `mode` (the real production entry).
3. The SPACED card shows the live due count from `countDueReviews` (badge text contains the number,
   e.g. «До повторення: N»); when N = 0 the card shows the calm hint instead of the badge.
4. Nothing-due calm state: `app/actions/test.ts` `NothingDueError` redirect goes to
   `/practice?empty=SPACED_REVIEW` (changed from `/dashboard?empty=SPACED_REVIEW`), and
   `app/(app)/practice/page.tsx` reads `searchParams` (a Promise — Next 16) and renders a calm notice
   containing «пам'ять ще тримає» and «Повернись завтра» plus a `<Svitlyk` render. The notice uses calm
   styling (no danger/warn tokens in its block).
5. MODE_LABEL is the single source for the card titles (grep: `MODE_LABEL` used in the page, not
   re-hardcoded strings for the two new cards).
6. `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build` exit 0
   (integration: the redirect-target change must not break `adaptive-session.integration.test.ts` —
   it asserts `/dashboard?empty=SPACED_REVIEW` today; update THAT assertion is allowed, it is this
   task's behavior change).
7. Browser (guarded): /practice contains «Розумне повторення» and «Інтервальне повторення».

## Constraints / decisions
- The due badge counts SPACED-relevant due cards (dueAt <= now) even though `startSpacedReview` is
  seen-only-not-due-only (CLAUDE.md) — the badge communicates «заплановано на сьогодні», matching the
  calm-state copy, not the queue internals.
- Nothing-due is a CALM state, never an error (spec: «НЕ error»).
- Existing exam-adjacent entries stay below the adaptive family (spec order).
- Non-Goal: dashboard notice map (dashboard EMPTY_NOTICE may keep its other keys), audit fresh-user
  assertion (task 17).

## Plan
- [x] Add countDueReviews to lib/server/study.ts.
- [x] Rework /practice cards (order, badge, calm state) + redirect target in app/actions/test.ts.
- [x] Update the adaptive-session integration assertion to the new redirect. (MOOT — grepped: no test
      asserts the `/dashboard?empty=SPACED_REVIEW` URL string; `adaptive-session.integration.test.ts`
      only asserts the typed `NothingDueError` (§3), so the redirect-target change touches no test.)
- [x] Suite + verify.sh.

## Done
- [x] `countDueReviews(userId, categoryId, now = new Date())` exported from `lib/server/study.ts` —
      due = `dueAt <= now`, question filter = `isActive && isPublished && archivedAt: null &&
      categories.some(id)`, via userId-scan + JS join (P2029-safe, mirrors `getStudyPlan`).
      typecheck + unit suite green.
- [x] `app/(app)/practice/page.tsx` reworked: adaptive family first (ADAPTIVE_REVIEW card →
      SPACED_REVIEW card → MIXED_PRACTICE card → topic grid; verify's first-mention line order
      60 < 74 < 112 < 136), all three mode-card titles from `MODE_LABEL`, both new cards start via
      `<form action={startTestAction}>` + hidden `mode`, SPACED card shows «До повторення: N» badge
      from `countDueReviews` (N=0 → calm «все повторено» hint), and the awaited-`searchParams`
      `?empty=SPACED_REVIEW` calm notice (go-toned Card, no danger/warn tokens) with «пам'ять ще
      тримає», «Повернись завтра» and `<Svitlyk size={96}>` placed directly above the spaced card.
- [x] `NothingDueError` redirect in `app/actions/test.ts` → `/practice?empty=SPACED_REVIEW`.
- [x] Full local gate: verify.sh greps all green, `npm run typecheck` · `npm test` (430/430) ·
      `npm run build` · reseed + `npm run test:integration` (94 pass / 2 documented skips) all exit 0;
      restarted the stale :3100 `next start` onto the fresh build (stale-server trap) and
      `bin/browser-audit.sh` = 19/19 PASS — the practice lane now clicks the NEW adaptive card's
      «Почати» and reaches the runner with immediate feedback.

## Next
- (none — Goal met; all verify gates re-run green locally incl. the browser audit 19/19)

## Artifacts
- lib/server/study.ts (countDueReviews), app/(app)/practice/page.tsx, app/actions/test.ts

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02T12:07Z ClPcs-Mac-mini: added `countDueReviews` to lib/server/study.ts (due-count for the
  /practice SPACED badge; userId-scan + JS join per the P2029 convention, same question baseWhere as
  the queue loaders). `npm run typecheck` and `npm test` (430/430) green. Next: /practice page rework.
- 2026-07-02T12:14Z ClPcs-Mac-mini: reworked /practice (adaptive→spaced→mixed→topics order, MODE_LABEL
  titles, live due badge, calm ?empty=SPACED_REVIEW notice with Svitlyk) + moved the NothingDueError
  redirect to /practice. Gate gotcha fixed: a legacy comment mentioning TOPIC_PRACTICE at line 27 broke
  the first-mention ORDER gate — reworded to «per-topic practice» (order gates match comments too).
  Checked: NO integration test asserts the old redirect URL (only the typed error), so no test edit.
  typecheck/test/build/integration green; restarted stale :3100 server; browser audit 19/19. Status: done.


## Verify
**Last verify:** PASS (2026-07-02T09:17:36Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T09:19:57Z)
