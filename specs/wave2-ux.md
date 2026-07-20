# Wave 2 — UX & behaviour

Polish the experience and close behaviour gaps. No security regressions; keep Ukrainian copy, the
road-sign design system, mobile-first, and the demo/legal positioning. Keep new core logic PURE +
unit-tested; the wave's final task runs `npm run build`. Read `AUDIT.md` for exact Med/Low UX items.

## A. Resume an in-progress test
- The dashboard shows a "Продовжити тест" card when the user has an `IN_PROGRESS` TestSession (most recent),
  linking to `/test/<id>`. A pure helper selects the resumable session; covered by a unit/integration test.
- Starting a new test while one is in progress is handled sanely (either resume or clearly start fresh —
  pick one and document it). typecheck + tests pass.

## B. Exam-taking behaviour
- Confirm-before-finish: finishing an exam asks for confirmation; finishing with unanswered questions warns
  with the count ("Ви відповіли на X з N").
- A question navigator: jump to any question; mark/flag a question "for review"; the navigator shows
  answered / unanswered / flagged at a glance. Flag state is client-side only (no schema change).
- "Exam runs short" (AUDIT item): if fewer published questions exist than the configured count, the UI tells
  the user up front (e.g. a notice on the test screen) instead of silently running short.
- typecheck + tests pass; build passes.

## C. Robustness / error & loading states
- Add a route error boundary (`app/(app)/error.tsx` and an admin one) so a thrown server action shows a
  friendly Ukrainian message + retry, never a raw stack/overlay in production.
- All submit buttons (auth, onboarding, admin forms, start-test) show a pending/disabled state.
- A not-found state for bad `/test/<id>` is friendly.
- typecheck + tests pass; build passes.

## D. Accessibility
- The test runner's answer options are an accessible single-choice group (proper roles/labels, keyboard
  operable: arrow/Enter), with visible focus (focus-visible already in globals.css).
- Interactive controls have aria-labels where the purpose isn't textual (e.g. save/flag toggles, timer).
- Headings/landmarks are sane; the page has a skip-to-content or logical focus order.
- typecheck + tests pass; build passes.

## Out of scope
- No DB schema change. No new learning algorithms (Wave 3). No security changes (Wave 1). No redesign.
