# Task: wave5-08-progress-mastery-view

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-22
**Last compute:** ClPcs-Mac-mini

## Goal
Spec B (UI surface). Add a learner-facing per-topic mastery breakdown at a new `/progress` route, driven
by `getTopicMastery` (wave5-07) + the `MASTERY_LABEL` markers (wave5-06). Mobile-first, Ukrainian,
keyboard-operable, a11y (non-colour marker). Depends on wave5-06 + wave5-07.

1. NEW file `app/(app)/progress/page.tsx` is a default-export async server component that calls
   `requireUser()` and `getTopicMastery(user.id, user.selectedCategoryId)`.
2. For each topic row it renders: the topic title; accuracy as a percent (`Math.round(accuracy*100)%`);
   a NON-COLOUR mastery marker = the `MASTERY_LABEL[band]` Ukrainian WORD (icon/word, not colour-only);
   the coverage as a percent (`Math.round(coverage*100)%`); and a "практикувати" CTA that starts
   TOPIC_PRACTICE scoped to that topic via the existing `startTestAction` form
   (`<input name="mode" value="TOPIC_PRACTICE">` + `<input name="topicId" value={row.topicId}>`).
3. `components/app-nav.tsx` gains a nav link to `/progress` (label e.g. "Прогрес"), so the page is
   reachable.
4. The page reuses existing UI primitives (`Card`, `SectionTitle`, `Badge`, etc.) and the road-sign
   design system; copy is Ukrainian; the CTA is a real submit button (keyboard/Enter operable).
5. `npm run typecheck` exits 0.
6. `npm run build` exits 0 (the `/progress` route compiles).

## Constraints / decisions
- Use the EXISTING `startTestAction` form pattern for the scoped TOPIC_PRACTICE link (same as
  `/practice`) — do not add a new action/route.
- The mastery marker MUST be a word/icon (a11y: not colour-only). Colour may accompany it but text is
  required — reuse `MASTERY_LABEL` from `@/lib/mastery`.
- New route lives under `app/(app)/` so it inherits the auth guard + `AppNav`/layout.
- Manual/real-transport check (NOT a blocking gate here): `npm run audit:browser` against the
  non-localhost origin (CLAUDE.md REAL-TRANSPORT GATE) to confirm the page renders for a logged-in user
  and the "практикувати" CTA starts a TOPIC_PRACTICE session.
- Non-Goal: charts/graphs, editing the dashboard, changing `getTopicMastery`'s shape, or any new test
  mode.

## Plan
- [x] Create `app/(app)/progress/page.tsx` calling `getTopicMastery`.
- [x] Render rows: title, accuracy %, `MASTERY_LABEL` marker, coverage %, scoped TOPIC_PRACTICE CTA.
- [x] Add the `/progress` link to `components/app-nav.tsx`.
- [x] `npm run typecheck` + `npm run build`; run verify.sh.

## Done
- [x] Created `app/(app)/progress/page.tsx`: async server component, `requireUser()` +
  `/onboarding` redirect when no category, `getTopicMastery(user.id, user.selectedCategoryId)`.
- [x] Each row renders title, accuracy % (`Math.round(accuracy*100)`), `MASTERY_LABEL[band]`
  non-colour word marker (Badge tone only accompanies it), coverage % + `RoadProgress`, and a
  scoped TOPIC_PRACTICE CTA via `startTestAction` (hidden `mode`/`topicId` inputs, "Практикувати"
  submit button with `aria-label="практикувати тему …"`). Empty-state card when no rows.
- [x] Added `{ href: "/progress", label: "Прогрес" }` to `components/app-nav.tsx` LINKS.
- [x] typecheck 0, build 0 (`/progress` route compiles), verify.sh → PASS.

## Next
- [ ] (none — Goal met. Optional, non-blocking: `npm run audit:browser` against the non-localhost
  origin to confirm the page renders for a logged-in user and the CTA starts a TOPIC_PRACTICE session.)

## Artifacts
- app/(app)/progress/page.tsx — new per-topic mastery view.
- components/app-nav.tsx — adds the /progress nav link.
- tasks/wave5-08-progress-mastery-view/verify.sh — import/render/nav/typecheck/build gate.

## Log
- 2026-06-22 cloud-agent: scaffolded by planner.
- 2026-06-22T00:00Z ClPcs-Mac-mini: created `app/(app)/progress/page.tsx` (matched
  `/practice` page pattern — Card/SectionTitle/Badge/SubmitButton + `startTestAction` form),
  added `/progress` nav link to `components/app-nav.tsx`. typecheck 0, build 0, verify.sh PASS.
  Set Status: done.

## Verify
**Last verify:** PASS (2026-06-22T19:29:10Z)

## Evaluation
**Last evaluation:** PASS (2026-06-22T19:30:32Z)
